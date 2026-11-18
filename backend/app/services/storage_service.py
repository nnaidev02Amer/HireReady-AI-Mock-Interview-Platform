"""Local filesystem storage for interview recordings.

Files live in settings.local_video_dir under random UUID names. Only that bare
file name (e.g. "3f2a....webm") is stored in MongoDB, never a full path.
"""
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from app.config import settings
from app.utils.logger import logger

ALLOWED_VIDEO_TYPES = {
    "video/webm": ".webm",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
}
EXTENSION_TO_MIME = {ext: mime for mime, ext in ALLOWED_VIDEO_TYPES.items()}

CHUNK_SIZE = 1024 * 1024  # 1 MB


def _signature_matches(mime: str, head: bytes) -> bool:
    """Cheap check that the bytes look like the declared container format."""
    if mime == "video/webm":
        return head.startswith(b"\x1a\x45\xdf\xa3")  # EBML header
    # MP4 / MOV: a box type follows the 4-byte size field.
    return head[4:8] in (b"ftyp", b"moov", b"mdat", b"free", b"wide")


async def save_video(upload: UploadFile) -> tuple[str, str, int]:
    """Validate and store an upload. Returns (relative_name, mime_type, size_bytes)."""
    mime = (upload.content_type or "").split(";")[0].strip().lower()
    if mime not in ALLOWED_VIDEO_TYPES:
        allowed = ", ".join(sorted(ALLOWED_VIDEO_TYPES))
        raise HTTPException(
            status_code=415, detail=f"Unsupported video type. Allowed types: {allowed}"
        )

    video_dir = settings.local_video_dir
    video_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid4().hex}{ALLOWED_VIDEO_TYPES[mime]}"
    dest = video_dir / name

    size = 0
    head = b""
    try:
        with open(dest, "wb") as out:
            while chunk := await upload.read(CHUNK_SIZE):
                if len(head) < 16:
                    head += chunk[: 16 - len(head)]
                size += len(chunk)
                if size > settings.max_video_size_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Video is too large. Maximum size is {settings.max_video_size_mb} MB.",
                    )
                out.write(chunk)
        if size == 0:
            raise HTTPException(status_code=400, detail="Uploaded video is empty.")
        if not _signature_matches(mime, head):
            raise HTTPException(
                status_code=415,
                detail="File content does not match the declared video type.",
            )
    except BaseException:
        dest.unlink(missing_ok=True)  # never leave partial/rejected files behind
        raise

    logger.info(f"Stored video {name} ({size} bytes)")
    return name, mime, size


def resolve_video_path(relative_name: str) -> Optional[Path]:
    """Map a stored name to a real file, or None if it is unsafe or missing."""
    if not relative_name or Path(relative_name).name != relative_name:
        return None
    base = settings.local_video_dir.resolve()
    path = (base / relative_name).resolve()
    if not path.is_relative_to(base) or not path.is_file():
        return None
    return path


def delete_video(relative_name: Optional[str]) -> None:
    path = resolve_video_path(relative_name) if relative_name else None
    if path:
        try:
            path.unlink()
        except OSError as e:
            logger.warning(f"Could not delete {relative_name}: {e}")
