from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class InterviewRequest(BaseModel):
    job_description: str = Field(..., min_length=1)
    difficulty: str = Field(..., pattern="^(easy|medium|hard)$")
    num_questions: int = Field(..., ge=1, le=10)
    # Optional: schedule for later (ISO 8601). Omit to start the interview right away.
    scheduled_at: Optional[datetime] = None

class InterviewSession(BaseModel):
    user_id: str
    job_description: str
    difficulty: str
    num_questions: int
    questions: List[str]
    # Legacy field from the S3 version. Kept so existing documents keep the same shape.
    video_url: Optional[str] = None
    # Local storage: file name relative to LOCAL_VIDEO_DIR, plus its validated MIME type.
    video_path: Optional[str] = None
    video_mime_type: Optional[str] = None
    analytics: Optional[dict] = None
    # True when the questions were produced in Demo Mode (no Gemini).
    demo: bool = False
    # Lifecycle: "scheduled" | "in_progress" | "completed" (see app/utils/session_status.py).
    # Datetimes are naive UTC.
    status: str = "in_progress"
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
