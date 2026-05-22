"""
STEP 1: Audio Acquisition
- YouTube URL → yt-dlp → WAV 44100Hz mono
- File upload → ffmpeg normalize → WAV 44100Hz mono
"""
import os
import subprocess
import tempfile
import uuid
import logging
from typing import Optional

logger = logging.getLogger(__name__)

MAX_DURATION_SEC = 300  # 5 minutes
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

SUPPORTED_EXTENSIONS = {".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"}
SUPPORTED_MIME_TYPES = {
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg",
    "audio/flac", "audio/x-m4a", "audio/mp4", "audio/aac", "audio/x-aac",
}


def ffmpeg_to_wav(input_path: str, output_path: str, start: Optional[float] = None, end: Optional[float] = None) -> None:
    """Convert any audio file to 44100Hz mono WAV using ffmpeg."""
    cmd = ["ffmpeg", "-y", "-i", input_path]
    if start is not None:
        cmd += ["-ss", str(start)]
    if end is not None:
        cmd += ["-to", str(end)]
    cmd += ["-ac", "1", "-ar", "44100", "-f", "wav", output_path]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr[:500]}")


def get_duration(wav_path: str) -> float:
    """Get audio duration in seconds using ffprobe."""
    cmd = ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
           "-of", "default=noprint_wrappers=1:nokey=1", wav_path]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


def download_youtube(
    url: str,
    session_dir: str,
    segment_start: Optional[float] = None,
    segment_end: Optional[float] = None
) -> str:
    """
    Download YouTube audio using yt-dlp, convert to WAV.
    Returns path to WAV file.
    Raises ValueError with error codes on failure.
    """
    raw_path = os.path.join(session_dir, "raw_audio.%(ext)s")
    wav_path = os.path.join(session_dir, "audio.wav")

    yt_cmd = [
        "yt-dlp",
        "--extract-audio",
        "--audio-format", "wav",
        "--no-playlist",
        "--max-filesize", "100m",
        "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "--output", raw_path,
        url,
    ]

    result = subprocess.run(yt_cmd, capture_output=True, text=True)

    if result.returncode != 0:
        stderr = result.stderr.lower()
        if "geo" in stderr or "not available in your country" in stderr:
            raise ValueError("yt_geo_blocked: Video not available in the server's region")
        if "private" in stderr:
            raise ValueError("yt_private: This video is private")
        if "age" in stderr:
            raise ValueError("yt_age_restricted: Age-restricted video — cannot download")
        raise ValueError(f"yt_download_failed: {result.stderr[:300]}")

    # Find downloaded file
    downloaded = None
    for fname in os.listdir(session_dir):
        if fname.startswith("raw_audio"):
            downloaded = os.path.join(session_dir, fname)
            break

    if not downloaded or not os.path.exists(downloaded):
        raise ValueError("yt_download_failed: Download produced no output file")

    # Check duration before converting
    temp_wav = os.path.join(session_dir, "check.wav")
    ffmpeg_to_wav(downloaded, temp_wav)
    duration = get_duration(temp_wav)
    if duration > MAX_DURATION_SEC:
        os.unlink(temp_wav)
        raise ValueError(f"yt_too_long: Video is {duration:.0f}s — limit is {MAX_DURATION_SEC}s (5 minutes)")

    # Apply segment trimming
    ffmpeg_to_wav(temp_wav, wav_path, start=segment_start, end=segment_end)
    return wav_path


def process_upload(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    session_dir: str,
    segment_start: Optional[float] = None,
    segment_end: Optional[float] = None,
) -> str:
    """
    Save uploaded file bytes, convert to WAV.
    Returns path to WAV file.
    """
    ext = os.path.splitext(filename)[1].lower() if filename else ""
    if ext not in SUPPORTED_EXTENSIONS and content_type not in SUPPORTED_MIME_TYPES:
        raise ValueError(f"unsupported_format: Unsupported file type {content_type or ext}")

    # Save raw
    raw_path = os.path.join(session_dir, f"upload{ext or '.mp3'}")
    with open(raw_path, "wb") as f:
        f.write(file_bytes)

    wav_path = os.path.join(session_dir, "audio.wav")
    ffmpeg_to_wav(raw_path, wav_path, start=segment_start, end=segment_end)
    return wav_path
