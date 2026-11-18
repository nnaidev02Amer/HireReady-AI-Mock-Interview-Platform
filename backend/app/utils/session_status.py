"""Interview session lifecycle helpers.

Stored status:   "scheduled" -> "in_progress" -> "completed"
Reported status: the same, plus "missed" (a scheduled interview whose time passed
                 more than MISSED_GRACE ago without being started). "missed" is
                 computed on read, never stored, and a missed interview can still be started.

Sessions created before scheduling existed have no `status`; they are classified from
their data (analytics present -> completed, otherwise in progress), so no migration is needed.

All datetimes are stored as naive UTC and returned as ISO strings ending in "Z".
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

MISSED_GRACE = timedelta(minutes=60)
MAX_SCHEDULE_AHEAD = timedelta(days=365)
PAST_TOLERANCE = timedelta(minutes=2)  # forgives small clock differences between browser and server


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_naive_utc(dt: datetime) -> datetime:
    """Aware datetimes are converted to UTC; naive ones are assumed to already be UTC."""
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat(timespec="seconds") + "Z" if dt else None


def effective_status(session: dict, now: Optional[datetime] = None) -> str:
    now = now or utcnow()
    if session.get("analytics"):
        return "completed"
    if session.get("status") == "completed":
        return "completed"
    if session.get("status") == "scheduled":
        scheduled_at = session.get("scheduled_at")
        if scheduled_at and now > scheduled_at + MISSED_GRACE:
            return "missed"
        return "scheduled"
    return "in_progress"


def validate_schedule(scheduled_at: datetime, now: Optional[datetime] = None) -> datetime:
    """Return the schedule as naive UTC, or raise ValueError with a user-facing message."""
    now = now or utcnow()
    when = to_naive_utc(scheduled_at)
    if when < now - PAST_TOLERANCE:
        raise ValueError("Scheduled time must be in the future")
    if when > now + MAX_SCHEDULE_AHEAD:
        raise ValueError("Scheduled time must be within the next 365 days")
    return when
