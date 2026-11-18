"""Interview video analysis using the Gemini API (API key only, no Vertex AI)."""
import asyncio
import time
from pathlib import Path

from fastapi import HTTPException
from google.genai import types

from app.config import settings
from app.services import demo_service
from app.services.gemini_service import (
    call_with_retries,
    client,
    gemini_http_error,
    parse_json_text,
)
from app.utils.logger import logger

PROCESSING_TIMEOUT_SECONDS = 180


def _clock(seconds: float) -> str:
    return f"{int(seconds) // 60}:{int(seconds) % 60:02d}"


def _timing_block(timestamps, duration) -> str:
    """Exact question start times measured by the browser (more reliable than reading the video)."""
    if not timestamps:
        return ""
    lines = []
    for i, start in enumerate(timestamps):
        end = timestamps[i + 1] if i + 1 < len(timestamps) else duration
        span = f"{_clock(start)} to {_clock(end)}" if end else f"from {_clock(start)} to the end"
        lines.append(f"- Question {i + 1} was shown {span} ({start:.0f}s from the start of the video)")
    return (
        "\nExact timing measured by the app (use this to segment the answers; the on-screen "
        '"Question N" label only confirms it):\n' + "\n".join(lines) + "\n"
    )


def _build_prompt(job_description: str, questions: list, timestamps=None, duration=None) -> str:
    questions_text = "\n".join(f"{i + 1}. {q}" for i, q in enumerate(questions))
    questions_text += _timing_block(timestamps, duration)
    if timestamps:
        segmentation_rules = """Segment the recording strictly by the exact timing listed above:
- Each answer contains ONLY the words the candidate spoke inside that question's time window.
- Speech after the next question's start time belongs to the NEXT question's answer, never to this one.
- Never repeat the same sentence in two answers. If nothing was said in a window, return an empty answer with score 0.
- Transcribe exactly what was said; do not summarise or invent content.
"""
    else:
        segmentation_rules = """Make sure to:
Fetch the every questions and answers from the video. Question Number is on the left top corner of the video (region: x=10, y=10, width=200, height=40).
Detect question numbers (e.g., "Question 1", "Question 2", etc) and extract their timestamps to segment the video.
Map each detected "Question X" to the corresponding question in the provided list (e.g., "Question 1" to the first question).
Fetch each answer from the video segment starting at the question numbers timestamp until the next question number or video end.
"""
    return f"""
You are an expert AI interviewer analyzing a candidate's video response for a {job_description} role.

The candidate is responding to the following interview questions:
{questions_text}

{segmentation_rules}
For each question:
1. Transcribe the candidate's answer from the video.
2. Assign a score (0-100) based on accuracy, relevance, and clarity.
3. Analyze body language (e.g., posture, gestures, eye contact).
4. Analyze communication (e.g., tone, fluency, confidence).
5. Estimate time consumed (in seconds) for the response.

If a question is not answered, return an empty answer with a score of 0.

Additionally:
- Generate 3 insights (25 words or less each) highlighting user feedback from the responses, focusing on strengths or areas for improvement.
- Analyze communication skills across the transcript, providing:
  - A communication score (0-10).
  - A 2-3 sentence overall feedback summary.
  - Supporting quotes with analysis (strengths and improvement areas).
  - Lists of strengths and improvement areas.

Return a JSON object with:
- A 'questions' array containing, for each question:
  - 'question': The question text.
  - 'answer': The transcribed answer (or empty string if unanswered).
  - 'score': The score (0-100).
  - 'body_language': Description of body language (or empty string if unanswered).
  - 'communication': Description of communication (or empty string if unanswered).
  - 'time_consumed_seconds': Time taken to answer (or 0 if unanswered).
- An 'overall_score' (0-100) based on all responses, weighted by answered questions.
- An 'insights' array with 3 feedback insights.
- A 'communication' object with:
  - 'score': Communication score (0-10).
  - 'overallFeedback': Summary feedback.
  - 'supportingQuotes': Array of quotes with analysis and type (strength/improvement_area).
  - 'strengths': List of strengths.
  - 'improvementAreas': List of improvement areas.

Example output:
{{
  "questions": [
    {{
      "question": "Tell me about yourself.",
      "answer": "I'm a software engineer with 5 years of experience in Python and React.",
      "score": 85,
      "body_language": "Maintains good eye contact, upright posture.",
      "communication": "Clear and confident tone, minimal filler words.",
      "time_consumed_seconds": 45.2
    }}
  ],
  "overall_score": 85,
  "insights": [
    "Strong technical knowledge in Python demonstrated.",
    "Needs to reduce filler words for clarity.",
    "Confident delivery in behavioral questions."
  ],
  "communication": {{
    "score": 8,
    "overallFeedback": "The candidate communicates clearly with confidence. Minor filler words detected.",
    "supportingQuotes": [
      {{
        "quote": "I led a team to deliver a Python project.",
        "analysis": "Shows leadership and clarity.",
        "type": "strength"
      }}
    ],
    "strengths": ["Confident tone", "Clear articulation"],
    "improvementAreas": ["Reduce filler words", "Improve pacing"]
  }}
}}
"""


def _num(value, low, high, default=None):
    """Coerce a model-provided number into [low, high]; return default if it is not a number."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        try:
            value = float(str(value).strip().rstrip("%"))
        except (TypeError, ValueError):
            return default
    return max(low, min(high, value))


def _validate_result(result) -> dict:
    """Check the model output has the expected shape and make its numbers safe to display."""
    if not isinstance(result, dict) or not isinstance(result.get("questions"), list):
        raise ValueError("Missing 'questions'")
    if not result["questions"]:
        raise ValueError("No per-question results")

    for q in result["questions"]:
        if not isinstance(q, dict):
            raise ValueError("Malformed question entry")
        q["answer"] = q.get("answer") if isinstance(q.get("answer"), str) else ""
        q["score"] = _num(q.get("score"), 0, 100, 0)
        q["time_consumed_seconds"] = _num(q.get("time_consumed_seconds"), 0, 86400, 0)
        for key in ("body_language", "communication"):
            if not isinstance(q.get(key), str):
                q[key] = ""

    overall = _num(result.get("overall_score"), 0, 100)
    if overall is None:  # derive it rather than failing the whole analysis
        scores = [q["score"] for q in result["questions"]]
        overall = sum(scores) / len(scores)
    result["overall_score"] = round(overall)

    if not isinstance(result.get("insights"), list):
        result["insights"] = []
    result["insights"] = [str(i) for i in result["insights"]][:5]

    comm = result.get("communication")
    result["communication"] = comm = comm if isinstance(comm, dict) else {}
    comm["score"] = _num(comm.get("score"), 0, 10, 0)
    for key in ("strengths", "improvementAreas", "supportingQuotes"):
        if not isinstance(comm.get(key), list):
            comm[key] = []
    if not isinstance(comm.get("overallFeedback"), str):
        comm["overallFeedback"] = ""
    return result


def apply_measured_times(result: dict, timestamps, duration) -> dict:
    """Replace the model's guessed answer times with the times measured by the browser."""
    if not timestamps:
        return result
    for i, q in enumerate(result.get("questions", [])[: len(timestamps)]):
        end = timestamps[i + 1] if i + 1 < len(timestamps) else duration
        if end is not None and end >= timestamps[i]:
            q["time_consumed_seconds"] = round(end - timestamps[i], 1)
    return result


def _analyze_sync(video_path: Path, mime_type: str, prompt: str) -> str:
    """Upload the file to Gemini, wait until it is ready, and request the analysis."""
    uploaded = call_with_retries(
        lambda: client.files.upload(
            file=str(video_path), config=types.UploadFileConfig(mime_type=mime_type)
        ),
        "Video upload to Gemini",
    )
    try:
        deadline = time.monotonic() + PROCESSING_TIMEOUT_SECONDS
        while uploaded.state is not None and uploaded.state.name == "PROCESSING":
            if time.monotonic() > deadline:
                raise TimeoutError("Gemini took too long to process the video")
            time.sleep(2)
            uploaded = call_with_retries(
                lambda: client.files.get(name=uploaded.name), "Gemini file status check"
            )
        if uploaded.state is not None and uploaded.state.name != "ACTIVE":
            raise ValueError("Gemini could not process this video file")

        response = call_with_retries(
            lambda: client.models.generate_content(
                model=settings.gemini_model,
                contents=[uploaded, prompt],
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            ),
            "Video analysis",
        )
        return response.text or ""
    finally:
        try:  # never leave the recording on Gemini's servers
            client.files.delete(name=uploaded.name)
        except Exception as e:
            logger.warning(f"Could not delete remote Gemini file: {type(e).__name__}")


async def analyze_video(
    video_path: Path,
    mime_type: str,
    job_description: str,
    questions: list,
    timestamps=None,
    duration=None,
) -> dict:
    if not questions or not isinstance(questions, list):
        raise HTTPException(
            status_code=400, detail="Questions must be a non-empty list of strings"
        )

    if settings.demo_mode:
        return apply_measured_times(
            demo_service.generate_demo_analysis(questions), timestamps, duration
        )

    prompt = _build_prompt(job_description, questions, timestamps, duration)
    try:
        text = await asyncio.to_thread(_analyze_sync, video_path, mime_type, prompt)
    except TimeoutError as e:
        logger.error(str(e))
        raise HTTPException(status_code=504, detail=str(e) + ". Please try again.")
    except ValueError as e:
        logger.error(str(e))
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise gemini_http_error(e)

    try:
        result = _validate_result(parse_json_text(text))
    except ValueError as e:
        logger.error(f"Invalid analysis response: {e}")
        raise HTTPException(
            status_code=502, detail="Gemini returned an unusable analysis. Please try again."
        )

    logger.info("Video analysis completed")
    return apply_measured_times(result, timestamps, duration)
