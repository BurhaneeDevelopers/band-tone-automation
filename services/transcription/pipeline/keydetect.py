"""
STEP 4: Key detection using Krumhansl-Kessler pitch-class profile.
Always transposes result to C (Sa = C fixed for Burhani Guards).
"""
import numpy as np
from typing import List, Tuple

# Krumhansl-Kessler major key profile
KK_MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
# KK minor profile
KK_MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
PREFER_FLAT = {'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'}


def pc_name(pc: int) -> str:
    name = NOTE_NAMES[pc % 12]
    return PREFER_FLAT.get(name, name)


def detect_key(notes: List[dict]) -> Tuple[int, str]:
    """
    Detect original key from note events.
    Returns (tonic_pitch_class, key_name_string).
    """
    weights = np.zeros(12)
    for n in notes:
        pc = n.get('pitch_midi', 60) % 12
        duration = n.get('end_time_s', 0) - n.get('start_time_s', 0)
        velocity = n.get('velocity', 64)
        weights[pc] += max(duration, 0) * (velocity / 127.0)

    if weights.sum() == 0:
        return 0, 'C'

    weights = weights / weights.sum()

    best_tonic = 0
    best_score = -np.inf
    for tonic in range(12):
        rotated = np.roll(KK_MAJOR, tonic)
        score = float(np.dot(weights, rotated))
        if score > best_score:
            best_score = score
            best_tonic = tonic

    return best_tonic, pc_name(best_tonic)


def get_shift_to_c(tonic_pc: int) -> int:
    """
    Returns number of semitones to add to all MIDI notes so tonic becomes C (pc=0).
    shift = (0 - tonic_pc) % 12
    """
    return (0 - tonic_pc) % 12


def apply_shift(notes: List[dict], shift: int) -> List[dict]:
    """Apply semitone shift to all notes in place."""
    shifted = []
    for n in notes:
        nc = dict(n)
        nc['pitch_midi'] = nc.get('pitch_midi', 60) + shift
        shifted.append(nc)
    return shifted
