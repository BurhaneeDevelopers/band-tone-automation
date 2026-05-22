"""
STEP 2: Source Separation using Demucs (htdemucs model).
Outputs: vocals.wav, drums.wav, bass.wav, other.wav
"""
import os
import logging
import subprocess
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)


def separate_stems(wav_path: str, session_dir: str) -> dict:
    """
    Run Demucs htdemucs separation on wav_path.
    Returns dict: { 'vocals': path, 'drums': path, 'bass': path, 'other': path }
    """
    output_dir = os.path.join(session_dir, "stems_raw")
    os.makedirs(output_dir, exist_ok=True)

    cmd = [
        "python", "-m", "demucs",
        "--name", "htdemucs",
        "--out", output_dir,
        "--two-stems", "none",  # get all 4 stems
        wav_path,
    ]
    # Remove --two-stems for 4-stem output
    cmd = [
        "python", "-m", "demucs",
        "--name", "htdemucs",
        "--out", output_dir,
        wav_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"Demucs failed: {result.stderr[:1000]}")
        raise RuntimeError(f"separation_failed: Demucs error: {result.stderr[:300]}")

    # Demucs outputs to: {output_dir}/htdemucs/{basename}/{stem}.wav
    basename = Path(wav_path).stem
    stem_dir = os.path.join(output_dir, "htdemucs", basename)

    if not os.path.isdir(stem_dir):
        # Try alternative path patterns
        for root, dirs, files in os.walk(output_dir):
            for d in dirs:
                if basename in d or d == basename:
                    stem_dir = os.path.join(root, d)
                    break

    stems = {}
    for stem_name in ["vocals", "drums", "bass", "other"]:
        src = os.path.join(stem_dir, f"{stem_name}.wav")
        dst = os.path.join(session_dir, f"{stem_name}.wav")
        if os.path.exists(src):
            shutil.copy2(src, dst)
            stems[stem_name] = dst
        else:
            logger.warning(f"Stem not found: {src}")

    if not stems:
        raise RuntimeError("separation_failed: No stems were produced by Demucs")

    # Cleanup raw demucs output
    shutil.rmtree(output_dir, ignore_errors=True)

    return stems
