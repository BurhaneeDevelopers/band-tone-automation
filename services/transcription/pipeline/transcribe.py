"""
STEP 3a: Melody transcription using basic-pitch on vocals + other stems.
Merges notes, flags filler candidates.
"""
import os
import logging
import tempfile
from typing import List, Optional

import numpy as np

logger = logging.getLogger(__name__)


def _run_basic_pitch(wav_path: str) -> List[dict]:
    """Run basic-pitch on a WAV file, return list of note dicts."""
    from basic_pitch.inference import predict

    model_output, midi_data, note_events = predict(
        wav_path,
        onset_threshold=0.5,
        frame_threshold=0.3,
        minimum_note_length=0.08,   # 80ms
        minimum_frequency=80,
        maximum_frequency=1800,
    )

    notes = []
    for note in note_events:
        start = float(note[0])
        end = float(note[1])
        midi = int(note[2])
        velocity = int(note[3]) if len(note) > 3 else 64
        confidence = float(note[4]) if len(note) > 4 else 1.0
        notes.append({
            'start_time_s': start,
            'end_time_s': end,
            'pitch_midi': midi,
            'velocity': velocity,
            'confidence': confidence,
        })
    return notes


def _overlap_ms(a_start: float, a_end: float, b_start: float, b_end: float) -> float:
    """Returns overlap duration in seconds between two time intervals."""
    overlap = min(a_end, b_end) - max(a_start, b_start)
    return max(0.0, overlap)


def merge_stems(
    other_notes: List[dict],
    vocal_notes: List[dict],
    melody_source: str = "auto",
) -> List[dict]:
    """
    Merge notes from 'other' and 'vocals' stems.
    melody_source: "auto" | "vocals_only" | "instruments_only"
    Flag notes appearing in only one stem as 'filler'.
    """
    if melody_source == "vocals_only":
        for n in vocal_notes:
            n['source'] = 'melody'
        return vocal_notes

    if melody_source == "instruments_only":
        for n in other_notes:
            n['source'] = 'melody'
        return other_notes

    # Auto: merge both, flag exclusive notes as fillers
    OVERLAP_THRESHOLD = 0.05  # 50ms

    matched_other = set()
    matched_vocal = set()

    for i, on in enumerate(other_notes):
        for j, vn in enumerate(vocal_notes):
            if j in matched_vocal:
                continue
            overlap = _overlap_ms(on['start_time_s'], on['end_time_s'],
                                   vn['start_time_s'], vn['end_time_s'])
            if overlap > OVERLAP_THRESHOLD and abs(on['pitch_midi'] - vn['pitch_midi']) <= 2:
                matched_other.add(i)
                matched_vocal.add(j)
                break

    merged = []
    for i, n in enumerate(other_notes):
        nc = dict(n)
        nc['source'] = 'melody' if i in matched_other else 'filler'
        merged.append(nc)

    for j, n in enumerate(vocal_notes):
        if j not in matched_vocal:
            nc = dict(n)
            nc['source'] = 'filler'
            merged.append(nc)

    # Sort by start time
    merged.sort(key=lambda x: x['start_time_s'])
    return merged


def transcribe_melody(
    other_stem_path: Optional[str],
    vocals_stem_path: Optional[str],
    melody_source: str = "auto",
) -> List[dict]:
    """
    Run basic-pitch on melody stems and merge.
    Returns merged note list with source flags.
    """
    other_notes: List[dict] = []
    vocal_notes: List[dict] = []

    if other_stem_path and os.path.exists(other_stem_path):
        try:
            other_notes = _run_basic_pitch(other_stem_path)
            logger.info(f"Other stem: {len(other_notes)} notes")
        except Exception as e:
            logger.warning(f"basic-pitch on other stem failed: {e}")

    if vocals_stem_path and os.path.exists(vocals_stem_path):
        try:
            vocal_notes = _run_basic_pitch(vocals_stem_path)
            logger.info(f"Vocals stem: {len(vocal_notes)} notes")
        except Exception as e:
            logger.warning(f"basic-pitch on vocals stem failed: {e}")

    if not other_notes and not vocal_notes:
        raise ValueError("no_notes: No pitched notes detected in audio")

    return merge_stems(other_notes, vocal_notes, melody_source)
