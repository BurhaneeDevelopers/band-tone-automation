"""
STEP 5 & 6: Sargam mapping (fixed Sa = C) + per-instrument transposition.
"""
from typing import List

# Fixed Sa = C mapping
SARGAM_MAP = {
    0: 'Sa',
    1: 're',    # komal Re
    2: 'Re',
    3: 'ga',    # komal Ga
    4: 'Ga',
    5: 'Ma',
    6: 'Ma+',   # tivra Ma
    7: 'Pa',
    8: 'dha',   # komal Dha
    9: 'Dha',
    10: 'ni',   # komal Ni
    11: 'Ni',
}

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# C4 = MIDI 60 is reference tonic (no octave marker)
TONIC_MIDI_REF = 60  # C4

INSTRUMENTS = {
    'trumpet':       {'label': 'Trumpet (Bb)',         'transposition': 2,  'written_key': 'D'},
    'alto_saxophone':{'label': 'Alto Saxophone (Eb)',  'transposition': 9,  'written_key': 'A'},
    'trombone':      {'label': 'Trombone',             'transposition': 0,  'written_key': 'C'},
    'euphonium':     {'label': 'Euphonium',            'transposition': 0,  'written_key': 'C'},
}


def midi_to_sargam(midi: int) -> str:
    """
    Map a MIDI note number (already transposed to C) to sargam syllable.
    Uses C4=60 as reference for octave markers.
    """
    pc = midi % 12
    base = SARGAM_MAP[pc]

    # Octave relative to C4 (MIDI 60)
    # Find nearest C below
    c_below = (midi // 12) * 12  # lowest C in this octave group
    # Octave 0 = C4-B4 (midi 60-71)
    octave_num = (midi // 12) - 5  # midi 60 = C4 = octave 0

    if octave_num > 0:
        return base + "'" * octave_num
    elif octave_num < 0:
        return base + "," * abs(octave_num)
    return base


def note_name(midi: int) -> str:
    return NOTE_NAMES[midi % 12]


def build_instrument_notes(
    raw_notes: List[dict],
    transposition: int,
) -> List[dict]:
    """
    Apply instrument transposition to concert-pitch-in-C notes.
    Returns list of note objects with sargam, note, midi, start, end, etc.
    """
    result = []
    for n in raw_notes:
        concert_midi = n.get('pitch_midi', 60)
        written_midi = concert_midi + transposition
        sargam = midi_to_sargam(written_midi)
        result.append({
            'start': round(float(n.get('start_time_s', 0)), 3),
            'end': round(float(n.get('end_time_s', 0)), 3),
            'duration': round(float(n.get('end_time_s', 0)) - float(n.get('start_time_s', 0)), 3),
            'sargam': sargam,
            'note': note_name(written_midi),
            'midi': written_midi,
            'velocity': int(n.get('velocity', 64)),
            'source': n.get('source', 'melody'),
            'confidence': round(float(n.get('confidence', 1.0)), 3),
        })
    return result


def build_all_instruments(concert_notes_in_c: List[dict]) -> dict:
    """Build sargam output for all 4 melodic instruments."""
    result = {}
    for inst_key, inst_info in INSTRUMENTS.items():
        notes = build_instrument_notes(concert_notes_in_c, inst_info['transposition'])
        result[inst_key] = {
            'label': inst_info['label'],
            'written_key': inst_info['written_key'],
            'transposition': inst_info['transposition'],
            'notes': notes,
        }
    return result
