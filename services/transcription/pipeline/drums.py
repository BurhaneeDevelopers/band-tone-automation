"""
STEP 3b: Drum detection using librosa onset detection + frequency classification.
Outputs kick, snare, and hi-hat patterns at 16th-note resolution.
"""
import logging
from typing import List, Optional

import numpy as np

logger = logging.getLogger(__name__)


def _classify_onset(y: np.ndarray, sr: int, onset_sample: int, window_size: int = 2048) -> str:
    """
    Classify a drum onset as 'kick', 'snare', or 'hihat' by frequency content.
    """
    import librosa

    start = max(0, onset_sample - window_size // 4)
    end = min(len(y), onset_sample + window_size)
    frame = y[start:end]
    if len(frame) < 128:
        return 'hihat'

    # Compute power spectrum
    fft = np.abs(np.fft.rfft(frame, n=2048))
    freqs = np.fft.rfftfreq(2048, d=1.0 / sr)

    # Sum power in frequency bands
    kick_power = float(np.sum(fft[(freqs < 150)]))
    snare_power = float(np.sum(fft[(freqs >= 150) & (freqs < 500)]))
    hihat_power = float(np.sum(fft[(freqs >= 5000)]))

    total = kick_power + snare_power + hihat_power + 1e-9

    if kick_power / total > 0.4:
        return 'kick'
    elif snare_power / total > 0.35:
        return 'snare'
    else:
        return 'hihat'


def detect_drums(drums_wav_path: Optional[str]) -> dict:
    """
    Detect drum pattern from drums stem WAV.
    Returns { bpm, pattern: [{ beat, subdivision, type, velocity }], kick_pattern: [...] }
    """
    if not drums_wav_path:
        return {'bpm': 120.0, 'pattern': [], 'kick_pattern': []}

    try:
        import librosa

        y, sr = librosa.load(drums_wav_path, sr=44100, mono=True)
        duration = len(y) / sr

        # Detect BPM and beat frames
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units='frames')
        bpm = float(tempo) if hasattr(tempo, '__float__') else 120.0
        if hasattr(bpm, '__len__'):
            bpm = float(bpm[0])

        # Onset detection
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, units='frames', backtrack=True)
        onset_samples = librosa.frames_to_samples(onset_frames)

        # Convert beat frames to times
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)

        # 16th note duration
        if bpm > 0:
            beat_duration = 60.0 / bpm
            sixteenth_duration = beat_duration / 4
        else:
            sixteenth_duration = 0.125

        pattern = []
        kick_pattern = []

        for ons in onset_samples:
            time = ons / sr
            velocity_raw = float(np.abs(y[max(0, ons - 100): ons + 100]).max())
            velocity = min(127, int(velocity_raw * 500))

            drum_type = _classify_onset(y, sr, ons)

            # Map to beat/subdivision grid
            beat_idx = 0
            if len(beat_times) > 0:
                beat_idx = int(np.argmin(np.abs(beat_times - time)))

            subdivision = 0
            if sixteenth_duration > 0:
                beat_time = beat_times[beat_idx] if beat_idx < len(beat_times) else time
                subdivision = int(round((time - beat_time) / sixteenth_duration)) % 4

            entry = {
                'beat': int(beat_idx % 4),
                'subdivision': subdivision,
                'velocity': max(1, velocity),
                'time': round(time, 3),
            }

            if drum_type == 'kick':
                kick_pattern.append(entry)
            else:
                pattern.append({**entry, 'type': drum_type})

        return {
            'bpm': round(bpm, 1),
            'pattern': pattern,
            'kick_pattern': kick_pattern,
        }

    except Exception as e:
        logger.warning(f"Drum detection failed: {e}")
        return {'bpm': 120.0, 'pattern': [], 'kick_pattern': []}
