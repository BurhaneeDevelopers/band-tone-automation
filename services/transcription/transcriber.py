"""
Core transcription logic:
  1. Runs basic-pitch on the audio file
  2. Detects musical key using Krumhansl-Kessler pitch-class profile
  3. Maps notes to sargam notation per instrument with correct transposition
"""

import os
import tempfile
import numpy as np
from typing import Optional

# Krumhansl-Kessler major key profile (12 pitch classes starting from C)
KK_MAJOR_PROFILE = np.array([
    6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
    2.52, 5.19, 2.39, 3.66, 2.29, 2.88
])

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
NOTE_ALIASES = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
}

# Sargam syllable map (0 = tonic)
SARGAM_MAP = {
    0: 'Sa',
    1: 're',   # komal Re
    2: 'Re',
    3: 'ga',   # komal Ga
    4: 'Ga',
    5: 'Ma',
    6: 'Ma+',  # tivra Ma
    7: 'Pa',
    8: 'dha',  # komal Dha
    9: 'Dha',
    10: 'ni',  # komal Ni
    11: 'Ni',
}

# Instrument transpositions in semitones (concert -> written)
INSTRUMENTS = {
    'trumpet': {'label': 'Trumpet (Bb)', 'transposition': 2},
    'alto_saxophone': {'label': 'Alto Saxophone (Eb)', 'transposition': 9},
    'trombone': {'label': 'Trombone', 'transposition': 0},
    'euphonium': {'label': 'Euphonium', 'transposition': 0},
}


def detect_key(notes_data: list) -> int:
    """
    Detect concert key using Krumhansl-Kessler pitch-class frequency analysis.
    Returns tonic pitch class (0=C, 1=C#, etc.)
    """
    pitch_class_weights = np.zeros(12)
    
    for note in notes_data:
        midi = note['pitch_midi']
        duration = note['end_time_s'] - note['start_time_s']
        velocity = note.get('velocity', 64)
        pitch_class = midi % 12
        pitch_class_weights[pitch_class] += duration * (velocity / 127.0)
    
    if pitch_class_weights.sum() == 0:
        return 0  # default to C
    
    # Normalize
    weights = pitch_class_weights / pitch_class_weights.sum()
    
    # Correlate against all 12 rotations of KK major profile
    best_tonic = 0
    best_corr = -np.inf
    for tonic in range(12):
        rotated_profile = np.roll(KK_MAJOR_PROFILE, tonic)
        corr = np.dot(weights, rotated_profile)
        if corr > best_corr:
            best_corr = corr
            best_tonic = tonic
    
    return best_tonic


def key_name(pitch_class: int) -> str:
    name = NOTE_NAMES[pitch_class % 12]
    # Prefer flat names for common keys
    PREFER_FLAT = {'A#': 'Bb', 'D#': 'Eb', 'G#': 'Ab', 'C#': 'Db', 'F#': 'Gb'}
    return PREFER_FLAT.get(name, name)


def transpose_key(tonic_pc: int, semitones: int) -> str:
    return key_name((tonic_pc + semitones) % 12)


def midi_to_sargam(midi: int, tonic_pc: int) -> str:
    """Convert a MIDI note to sargam relative to the given tonic pitch class."""
    note_pc = midi % 12
    octave_offset = (midi // 12) - 5  # relative to middle octave (MIDI 60 = C5 here)
    
    interval = (note_pc - tonic_pc) % 12
    base_syllable = SARGAM_MAP[interval]
    
    # Determine octave relative to tonic note in MIDI
    tonic_midi_ref = ((midi // 12) * 12) + tonic_pc
    if tonic_midi_ref > midi:
        tonic_midi_ref -= 12
    
    octave_diff = 0
    if midi >= tonic_midi_ref + 12:
        octave_diff = (midi - tonic_midi_ref) // 12
    elif midi < tonic_midi_ref:
        octave_diff = -((tonic_midi_ref - midi - 1) // 12 + 1)
    
    if octave_diff > 0:
        return base_syllable + "'" * octave_diff
    elif octave_diff < 0:
        return base_syllable + "," * abs(octave_diff)
    return base_syllable


def run_transcription(audio_path: str, override_key: Optional[str] = None) -> dict:
    """
    Main transcription function.
    Returns structured JSON matching the API response shape.
    """
    from basic_pitch.inference import predict
    from basic_pitch import ICASSP_2022_MODEL_PATH

    # Run basic-pitch
    model_output, midi_data, note_events = predict(audio_path)
    
    notes_raw = []
    for note in note_events:
        notes_raw.append({
            'start_time_s': float(note[0]),
            'end_time_s': float(note[1]),
            'pitch_midi': int(note[2]),
            'velocity': int(note[3]) if len(note) > 3 else 64,
        })
    
    if not notes_raw:
        raise ValueError("No notes detected in audio")
    
    # Determine tonic
    if override_key:
        # Parse override key to pitch class
        key_map = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
            'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
        }
        tonic_pc = key_map.get(override_key.strip(), 0)
    else:
        tonic_pc = detect_key(notes_raw)
    
    concert_key = key_name(tonic_pc)
    
    # Calculate duration
    duration = max(n['end_time_s'] for n in notes_raw)
    
    # Build instrument results
    instruments_result = {}
    for inst_key, inst_info in INSTRUMENTS.items():
        transposition = inst_info['transposition']
        written_tonic_pc = (tonic_pc + transposition) % 12
        written_key = key_name(written_tonic_pc)
        
        inst_notes = []
        for n in notes_raw:
            written_midi = n['pitch_midi'] + transposition
            sargam = midi_to_sargam(written_midi, written_tonic_pc)
            note_name = NOTE_NAMES[written_midi % 12]
            inst_notes.append({
                'start': round(n['start_time_s'], 3),
                'end': round(n['end_time_s'], 3),
                'duration': round(n['end_time_s'] - n['start_time_s'], 3),
                'sargam': sargam,
                'note': note_name,
                'midi': written_midi,
                'velocity': n['velocity'],
            })
        
        instruments_result[inst_key] = {
            'label': inst_info['label'],
            'transposition': transposition,
            'written_key': written_key,
            'notes': inst_notes,
        }
    
    return {
        'concert_key': concert_key,
        'duration': round(duration, 2),
        'note_count': len(notes_raw),
        'instruments': instruments_result,
    }
