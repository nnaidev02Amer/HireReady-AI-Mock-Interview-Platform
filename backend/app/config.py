"""Centralized configuration.

All environment variables are read here, once. Other modules should do:

    from app.config import settings
"""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Load backend/.env regardless of the directory uvicorn is started from.
load_dotenv(BACKEND_DIR / ".env")


# "gemini-2.0-flash" was retired by Google (the API answers 404 for it). The default is the
# always-current "flash-lite" alias because it was the reliably responsive option when tested
# (the larger flash models were overloaded and timing out). Set GEMINI_MODEL to pin another
# model, e.g. gemini-3-flash-preview or gemini-flash-latest, for higher quality when available.
DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest"


PLACEHOLDER_KEYS = {"", "your-gemini-api-key", "changeme", "change-me"}


class ConfigError(RuntimeError):
    """Raised when required configuration is missing or invalid."""


@dataclass(frozen=True)
class Settings:
    secret_key: str
    gemini_api_key: str
    gemini_model: str
    mongodb_uri: str
    database_name: str
    local_video_dir: Path
    max_video_size_mb: int
    # Demo Mode: canned questions and a clearly-labelled sample analysis, no Gemini calls.
    demo_mode: bool
    demo_reason: str

    @property
    def max_video_size_bytes(self) -> int:
        return self.max_video_size_mb * 1024 * 1024


def _load_settings() -> Settings:
    problems = []

    secret_key = os.getenv("SECRET_KEY", "").strip()
    if not secret_key:
        problems.append("SECRET_KEY is not set (used to sign login tokens)")

    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if gemini_api_key in PLACEHOLDER_KEYS:  # value copied from .env.example
        gemini_api_key = ""

    # GEMINI_API_KEY is optional: without it (or with DEMO_MODE=true) the app runs in Demo Mode.
    demo_flag = os.getenv("DEMO_MODE", "").strip().lower() in ("1", "true", "yes", "on")
    demo_mode = demo_flag or not gemini_api_key
    demo_reason = (
        "DEMO_MODE=true" if demo_flag else "GEMINI_API_KEY is not set" if demo_mode else ""
    )

    raw_size = os.getenv("MAX_VIDEO_SIZE_MB", "100").strip()
    try:
        max_video_size_mb = int(raw_size)
        if max_video_size_mb <= 0:
            raise ValueError
    except ValueError:
        problems.append("MAX_VIDEO_SIZE_MB must be a positive whole number")
        max_video_size_mb = 100

    if problems:
        details = "\n  - ".join(problems)
        raise ConfigError(
            "Invalid backend configuration:\n  - "
            + details
            + "\nCopy backend/.env.example to backend/.env and fill in the values."
        )

    video_dir = Path(os.getenv("LOCAL_VIDEO_DIR", "uploads/interviews"))
    if not video_dir.is_absolute():
        video_dir = BACKEND_DIR / video_dir

    return Settings(
        secret_key=secret_key,
        gemini_api_key=gemini_api_key,
        gemini_model=os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip(),
        mongodb_uri=os.getenv("MONGODB_URI", "mongodb://localhost:27017").strip(),
        database_name=os.getenv("DATABASE_NAME", "interview_ai").strip(),
        local_video_dir=video_dir,
        max_video_size_mb=max_video_size_mb,
        demo_mode=demo_mode,
        demo_reason=demo_reason,
    )


settings = _load_settings()
