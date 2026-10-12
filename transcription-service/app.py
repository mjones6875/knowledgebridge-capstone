from pathlib import Path
import shutil
import tempfile

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

model = WhisperModel(
    "base.en",
    device="cpu",
    compute_type="int8"
)


@app.get("/health")
def health():
    return {
        "status": "UP",
        "model": "base.en",
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

        segments, information = model.transcribe(
            str(temporary_path),
            beam_size=5,
            vad_filter=True
        )

        transcript_segments = []
        transcript_text = []

        for segment in segments:
            text = segment.text.strip()

            if not text:
                continue

            transcript_segments.append({
                "startSeconds": round(segment.start, 2),
                "endSeconds": round(segment.end, 2),
                "startTime": format_timestamp(segment.start),
                "endTime": format_timestamp(segment.end),
                "text": text
            })

            transcript_text.append(text)

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
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {exception}"
        )

    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)