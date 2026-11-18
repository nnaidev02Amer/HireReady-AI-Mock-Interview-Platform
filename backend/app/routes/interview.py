import json
import math

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.config import settings
from app.database import db
from app.models.interview import InterviewRequest, InterviewSession
from app.services.analysis_service import analyze_video
from app.services.gemini_service import generate_questions
from app.services.storage_service import (
    EXTENSION_TO_MIME,
    delete_video,
    resolve_video_path,
    save_video,
)
from app.utils.auth import get_current_user
from app.utils.logger import logger
from app.utils.session_status import effective_status, iso, utcnow, validate_schedule

router = APIRouter()


def get_owned_session(session_id: str, current_user: str) -> dict:
    """Load a session by id and make sure it belongs to the authenticated user."""
    try:
        oid = ObjectId(session_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid session ID")
    session = db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if session.get("user_id") != current_user:
        raise HTTPException(
            status_code=403, detail="You do not have access to this interview session"
        )
    return session


def parse_timing(raw_timestamps, raw_duration, num_questions: int):
    """Validate the optional timing sent by the browser.

    question_timestamps: JSON list with, for each question, the seconds from the start of
    the recording at which it was shown. duration_seconds: total recording length.
    Returns (timestamps | None, duration | None); raises 400 if present but invalid.
    """
    if raw_timestamps in (None, ""):
        return None, None
    bad = HTTPException(status_code=400, detail="Invalid question timing data")
    try:
        timestamps = json.loads(raw_timestamps)
        duration = float(raw_duration) if raw_duration not in (None, "") else None
    except (ValueError, TypeError):
        raise bad
    if (
        not isinstance(timestamps, list)
        or len(timestamps) != num_questions
        or not all(isinstance(t, (int, float)) and not isinstance(t, bool) and math.isfinite(t) and 0 <= t < 86400 for t in timestamps)
        or any(b < a for a, b in zip(timestamps, timestamps[1:]))
    ):
        raise bad
    if duration is not None and (not math.isfinite(duration) or duration < timestamps[-1] or duration >= 86400):
        raise bad
    return [float(t) for t in timestamps], duration


def video_api_path(session: dict):
    """URL the frontend uses to fetch a recording (requires the auth header)."""
    if session.get("video_path"):
        return f"/interview/sessions/{session['_id']}/video"
    return session.get("video_url")  # legacy sessions


@router.post("/generate-questions")
async def generate_questions_endpoint(
    request: InterviewRequest, current_user: str = Depends(get_current_user)
):
    # Validate the schedule first so a bad time does not cost a Gemini call.
    scheduled_at = None
    if request.scheduled_at is not None:
        try:
            scheduled_at = validate_schedule(request.scheduled_at)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    try:
        questions = await generate_questions(
            request.job_description, request.difficulty, request.num_questions
        )
        now = utcnow()
        session = InterviewSession(
            user_id=current_user,
            job_description=request.job_description,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            questions=questions,
            demo=settings.demo_mode,
            status="scheduled" if scheduled_at else "in_progress",
            scheduled_at=scheduled_at,
            started_at=None if scheduled_at else now,
        )
        result = db.sessions.insert_one(session.model_dump())
        session_id = str(result.inserted_id)
        logger.info(
            f"Interview session created for user: {current_user}, session_id: {session_id}"
        )
        return {
            "questions": questions,
            "session_id": session_id,
            "status": session.status,
            "scheduled_at": iso(scheduled_at),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generate questions error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate questions")


@router.post("/upload-video")
async def upload_video_endpoint(
    session_id: str = Form(...),
    file: UploadFile = File(...),
    question_timestamps: str = Form(None),
    duration_seconds: str = Form(None),
    current_user: str = Depends(get_current_user),
):
    try:
        # 1. Validate the session BEFORE touching the filesystem.
        session = get_owned_session(session_id, current_user)
        questions = session.get("questions", [])
        if not questions:
            raise HTTPException(status_code=400, detail="No questions found in session")
        status = effective_status(session)
        if status == "completed":
            raise HTTPException(
                status_code=409,
                detail="This interview session has already been submitted",
            )
        if session.get("status") == "scheduled":  # scheduled or missed, but never started
            raise HTTPException(
                status_code=409,
                detail="Start the interview before uploading a recording",
            )

        timestamps, duration = parse_timing(
            question_timestamps, duration_seconds, len(questions)
        )

        # 2. Validate and store the file locally.
        name, mime_type, _ = await save_video(file)
        previous = session.get("video_path")
        db.sessions.update_one(
            {"_id": session["_id"]},
            {"$set": {"video_path": name, "video_mime_type": mime_type}},
        )
        if previous:  # a failed earlier analysis is being retried
            delete_video(previous)

        # 3. Analyze with Gemini. On failure the video stays attached to the
        #    session so the error does not lose the recording.
        analytics = await analyze_video(
            video_path=resolve_video_path(name),
            mime_type=mime_type,
            job_description=session.get("job_description", "Unknown Role"),
            questions=questions,
            timestamps=timestamps,
            duration=duration,
        )
        db.sessions.update_one(
            {"_id": session["_id"]},
            {"$set": {"analytics": analytics, "status": "completed", "completed_at": utcnow()}},
        )

        logger.info(
            f"Video uploaded and analyzed for user: {current_user}, session_id: {session_id}"
        )
        return {
            "video_url": f"/interview/sessions/{session['_id']}/video",
            "analytics": analytics,
        }
    except HTTPException as e:
        logger.warning(f"Upload video rejected ({e.status_code}): {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Upload video error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload video")


@router.post("/sessions/{session_id}/start")
async def start_session(session_id: str, current_user: str = Depends(get_current_user)):
    """Begin (or resume) an interview. Scheduled interviews unlock at their start time."""
    session = get_owned_session(session_id, current_user)
    now = utcnow()
    status = effective_status(session, now)

    if status == "completed":
        raise HTTPException(
            status_code=409, detail="This interview has already been completed"
        )
    if status == "scheduled" and session.get("scheduled_at") > now:
        raise HTTPException(
            status_code=409,
            detail=f"This interview is scheduled for {iso(session['scheduled_at'])} "
            "and cannot be started yet",
        )

    update = {"status": "in_progress"}
    if not session.get("started_at"):
        update["started_at"] = now
    db.sessions.update_one({"_id": session["_id"]}, {"$set": update})
    return {
        "session_id": str(session["_id"]),
        "questions": session.get("questions", []),
        "status": "in_progress",
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: str = Depends(get_current_user)):
    """Cancel/delete one of the user's own interviews, including its stored recording."""
    session = get_owned_session(session_id, current_user)
    delete_video(session.get("video_path"))
    db.sessions.delete_one({"_id": session["_id"]})
    logger.info(f"Session deleted by {current_user}: {session_id}")
    return {"message": "Interview deleted"}


@router.get("/sessions/{session_id}/video")
async def get_session_video(
    session_id: str, current_user: str = Depends(get_current_user)
):
    session = get_owned_session(session_id, current_user)
    name = session.get("video_path")
    path = resolve_video_path(name) if name else None
    if not path:
        raise HTTPException(
            status_code=404, detail="No recording available for this session"
        )
    media_type = session.get("video_mime_type") or EXTENSION_TO_MIME.get(
        path.suffix.lower(), "application/octet-stream"
    )
    return FileResponse(path, media_type=media_type)


@router.get("/dashboard")
async def get_dashboard(current_user: str = Depends(get_current_user)):
    try:
        sessions = list(db.sessions.find({"user_id": current_user}))
        if not sessions:
            logger.info(f"No sessions found for user: {current_user}")
            return {"sessions": [], "message": "No interview sessions found"}

        formatted_sessions = []
        for session in sessions:
            formatted_session = {
                "session_id": str(session["_id"]),
                "job_description": session.get("job_description", "Unknown Role"),
                "difficulty": session.get("difficulty", "Unknown"),
                "num_questions": session.get("num_questions", 0),
                "questions": session.get("questions", []),
                "video_url": video_api_path(session),
                "analytics": session.get("analytics"),
                "status": effective_status(session),
                "scheduled_at": iso(session.get("scheduled_at")),
                "started_at": iso(session.get("started_at")),
                "completed_at": iso(session.get("completed_at")),
                "demo": bool(session.get("demo") or (session.get("analytics") or {}).get("demo")),
                "created_at": session.get(
                    "_id"
                ).generation_time.isoformat(),  # MongoDB timestamp
            }
            formatted_sessions.append(formatted_session)

        logger.info(
            f"Dashboard data retrieved for user: {current_user}, sessions: {len(formatted_sessions)}"
        )
        return {"sessions": formatted_sessions}
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard data")
