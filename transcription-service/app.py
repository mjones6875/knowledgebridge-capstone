from pathlib import Path
import shutil
import tempfile
import threading
import time

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from faster_whisper import WhisperModel

app = FastAPI(
    title="KnowledgeBridge Transcription Service",
    version="1.0.0"
)

ALLOWED_EXTENSIONS = {
    ".mp3", ".wav", ".m4a",
    ".mp4", ".mov", ".webm"
}

MODEL_NAME = "base.en"

model = WhisperModel(
    MODEL_NAME,
    device="cpu",
    compute_type="int8",
    cpu_threads=4
)

# Warm-up: run a short silent clip once so the first real request
# does not pay the model initialization cost.
list(model.transcribe(np.zeros(16000, dtype=np.float32))[0])
print("[transcription] Model warmed up", flush=True)

# The model is CPU-bound and shared, so process one request at a time.
# A second request waits instead of competing for the same cores.
transcribe_lock = threading.Lock()


@app.get("/health")
def health():
    return {
        "status": "UP",
        "model": MODEL_NAME,
        "device": "cpu"
    }


def determine_media_type(extension: str) -> str:
    audio_extensions = {".mp3", ".wav", ".m4a"}

    if extension in audio_extensions:
        return "audio"

    return "video"


def format_timestamp(seconds: float) -> str:
    total_seconds = int(seconds)

    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    remaining_seconds = total_seconds % 60

    return f"{hours:02}:{minutes:02}:{remaining_seconds:02}"


@app.post("/transcribe")
def transcribe(file: UploadFile = File(...)):
    file_name = file.filename or "uploaded-media"
    extension = Path(file_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported media type: {extension}"
        )

    temporary_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension
        ) as temporary_file:
            shutil.copyfileobj(file.file, temporary_file)
            temporary_path = Path(temporary_file.name)

        print(
            f"[transcription] Request received: {file_name}",
            flush=True
        )

        transcript_segments = []
        transcript_text = []

        # The segments generator is lazy, so the loop must stay
        # inside the lock for the whole transcription.
        with transcribe_lock:
            print(
                f"[transcription] Started: {file_name}",
                flush=True
            )
            started = time.time()

            segments, information = model.transcribe(
                str(temporary_path),
                beam_size=1,
                vad_filter=True,
                condition_on_previous_text=False,
                temperature=0.0
            )

            for index, segment in enumerate(segments, start=1):
                text = segment.text.strip()

                if not text:
                    continue

                print(
                    f"[transcription] Segment {index}: "
                    f"{segment.start:.1f}s-{segment.end:.1f}s "
                    f"(elapsed {time.time() - started:.1f}s)",
                    flush=True
                )

                transcript_segments.append({
                    "startSeconds": round(segment.start, 2),
                    "endSeconds": round(segment.end, 2),
                    "startTime": format_timestamp(segment.start),
                    "endTime": format_timestamp(segment.end),
                    "text": text
                })

                transcript_text.append(text)

            elapsed_total = time.time() - started

        print(
            f"[transcription] Completed: {file_name} "
            f"({len(transcript_segments)} segments, "
            f"{elapsed_total:.1f}s)",
            flush=True
        )

        return {
            "success": True,
            "fileName": file_name,
            "mediaType": determine_media_type(extension),
            "language": information.language,
            "languageProbability": round(
                information.language_probability,
                4
            ),
            "durationSeconds": round(information.duration, 2),
            "text": " ".join(transcript_text),
            "segments": transcript_segments
        }

    except Exception as exception:
        print(
            f"[transcription] Failed: {file_name}: {exception}",
            flush=True
        )
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {exception}"
        )

    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)