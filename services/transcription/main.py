"""
FastAPI transcription microservice for Burhani Guards Band.
Two transcription endpoints streaming SSE phases:
  GET  /health
  POST /transcribe-youtube   (multipart: url, segment_start?, segment_end?, melody_source?)
  POST /transcribe-file      (multipart: file, segment_start?, segment_end?, melody_source?)
"""
import os
import uuid
import shutil
import tempfile
import logging
import asyncio
import json
from contextlib import asynccontextmanager
from typing import Optional, AsyncGenerator

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
MAX_FILE_SIZE = 50 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load models at startup
    try:
        logger.info("Pre-loading basic-pitch model...")
        from basic_pitch.inference import predict
        logger.info("basic-pitch ready.")
    except Exception as e:
        logger.warning(f"basic-pitch pre-load failed: {e}")
    yield


app = FastAPI(title="Burhani Guards Transcription Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": True}


def sse_event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


def run_full_pipeline(
    wav_path: str,
    session_dir: str,
    melody_source: str = "auto",
    include_bass_for_low: bool = False,
):
    """
    Runs steps 2-7 on an already-acquired WAV file.
    Yields (phase_name, data_dict) tuples for SSE streaming.
    """
    from pipeline.separate import separate_stems
    from pipeline.transcribe import transcribe_melody
    from pipeline.drums import detect_drums
    from pipeline.keydetect import detect_key, get_shift_to_c, apply_shift, pc_name
    from pipeline.sargam import build_all_instruments, midi_to_sargam, note_name

    # Step 2: Stem separation
    yield ("separating", {"message": "Separating audio stems with AI... (this takes 60–120s on CPU)"})
    stems = separate_stems(wav_path, session_dir)

    # Step 3a: Melody transcription
    yield ("transcribing", {"message": "Detecting melody notes from stems..."})
    raw_notes = transcribe_melody(
        other_stem_path=stems.get('other'),
        vocals_stem_path=stems.get('vocals'),
        melody_source=melody_source,
    )

    # Step 3b: Drums
    yield ("drums", {"message": "Analysing drum pattern..."})
    drum_data = detect_drums(stems.get('drums'))

    # Also get bass notes if needed
    bass_notes = []
    if include_bass_for_low and stems.get('bass'):
        from pipeline.transcribe import transcribe_melody as tm
        try:
            bass_raw = tm(other_stem_path=stems.get('bass'), vocals_stem_path=None, melody_source="instruments_only")
            bass_notes = bass_raw
        except Exception:
            pass

    # Step 4: Key detection + transpose to C
    yield ("mapping", {"message": "Detecting key and mapping to sargam in C..."})
    tonic_pc, original_key = detect_key(raw_notes)
    shift = get_shift_to_c(tonic_pc)
    notes_in_c = apply_shift(raw_notes, shift)

    # Merge bass for low instruments if requested
    if include_bass_for_low and bass_notes:
        bass_in_c = apply_shift(bass_notes, shift)
        # Add to trombone/euphonium notes (mark as melody)
        for n in bass_in_c:
            n['source'] = 'melody'
        notes_in_c = notes_in_c + bass_in_c
        notes_in_c.sort(key=lambda x: x['start_time_s'])

    # Step 5 + 6: Sargam mapping + instrument transposition
    instruments_result = build_all_instruments(notes_in_c)

    # Calculate duration from original wav
    import subprocess
    dur_result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", wav_path],
        capture_output=True, text=True
    )
    try:
        duration = float(dur_result.stdout.strip())
    except Exception:
        duration = raw_notes[-1]['end_time_s'] if raw_notes else 0.0

    # Filler count
    filler_count = sum(1 for n in notes_in_c if n.get('source') == 'filler')

    # Separation quality heuristic (based on note count)
    note_count = len(notes_in_c)
    sep_quality = "good" if note_count > 20 else ("fair" if note_count > 5 else "poor")

    result = {
        "original_key": original_key,
        "transposed_to": "C",
        "detected_bpm": drum_data.get("bpm", 120.0),
        "duration": round(duration, 2),
        "note_count": note_count,
        "filler_count": filler_count,
        "separation_quality": sep_quality,
        "instruments": {
            **instruments_result,
            "drums": {
                "label": "Drums",
                "bpm": drum_data.get("bpm", 120.0),
                "pattern": drum_data.get("pattern", []),
            },
            "bass_drum": {
                "label": "Bass Drum",
                "bpm": drum_data.get("bpm", 120.0),
                "pattern": drum_data.get("kick_pattern", []),
            },
        },
    }
    yield ("done", {"result": result})


async def stream_pipeline(generator):
    """Wrap a sync generator in async SSE streaming."""
    loop = asyncio.get_event_loop()
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        for phase, data in generator:
            yield sse_event({"phase": phase, **data})
            await asyncio.sleep(0)  # yield to event loop


@app.post("/transcribe-youtube")
async def transcribe_youtube(
    url: str = Form(...),
    segment_start: Optional[float] = Form(None),
    segment_end: Optional[float] = Form(None),
    melody_source: Optional[str] = Form("auto"),
    include_bass_for_low: Optional[bool] = Form(False),
):
    session_id = str(uuid.uuid4())
    session_dir = os.path.join(tempfile.gettempdir(), f"bgb_{session_id}")
    os.makedirs(session_dir, exist_ok=True)

    async def generate():
        try:
            from pipeline.acquire import download_youtube

            yield sse_event({"phase": "downloading", "message": "Downloading audio from YouTube..."})

            try:
                wav_path = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: download_youtube(url, session_dir, segment_start, segment_end)
                )
            except ValueError as e:
                err_str = str(e)
                code = err_str.split(":")[0] if ":" in err_str else "download_failed"
                msg = err_str.split(":", 1)[1].strip() if ":" in err_str else err_str
                yield sse_event({"phase": "error", "code": code, "message": msg})
                return

            gen = run_full_pipeline(wav_path, session_dir, melody_source or "auto", include_bass_for_low or False)
            for phase, data in gen:
                yield sse_event({"phase": phase, **data})

        except Exception as e:
            logger.error(f"Pipeline error: {e}", exc_info=True)
            yield sse_event({"phase": "error", "code": "pipeline_error", "message": str(e)[:300]})
        finally:
            shutil.rmtree(session_dir, ignore_errors=True)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/transcribe-file")
async def transcribe_file(
    file: UploadFile = File(...),
    segment_start: Optional[float] = Form(None),
    segment_end: Optional[float] = Form(None),
    melody_source: Optional[str] = Form("auto"),
    include_bass_for_low: Optional[bool] = Form(False),
):
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="file_too_large: File exceeds 50MB limit")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    session_id = str(uuid.uuid4())
    session_dir = os.path.join(tempfile.gettempdir(), f"bgb_{session_id}")
    os.makedirs(session_dir, exist_ok=True)

    async def generate():
        try:
            from pipeline.acquire import process_upload, MAX_FILE_SIZE as MFS

            try:
                wav_path = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: process_upload(
                        contents, file.filename or "", file.content_type or "",
                        session_dir, segment_start, segment_end
                    )
                )
            except ValueError as e:
                err_str = str(e)
                code = err_str.split(":")[0] if ":" in err_str else "file_error"
                msg = err_str.split(":", 1)[1].strip() if ":" in err_str else err_str
                yield sse_event({"phase": "error", "code": code, "message": msg})
                return

            gen = run_full_pipeline(wav_path, session_dir, melody_source or "auto", include_bass_for_low or False)
            for phase, data in gen:
                yield sse_event({"phase": phase, **data})

        except Exception as e:
            logger.error(f"Pipeline error: {e}", exc_info=True)
            yield sse_event({"phase": "error", "code": "pipeline_error", "message": str(e)[:300]})
        finally:
            shutil.rmtree(session_dir, ignore_errors=True)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
