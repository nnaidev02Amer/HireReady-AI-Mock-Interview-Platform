from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings  # validates configuration at import time
from app.database import client, db, check_connection
from app.routes import auth, interview
from app.utils.logger import logger

app = FastAPI(title="AI Mock Interview Platform", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update to your production frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Return validation errors as {"detail": "<message>"} like every other error."""
    messages = []
    for err in exc.errors():
        field = ".".join(str(p) for p in err["loc"] if p not in ("body", "query", "form"))
        msg = err["msg"].removeprefix("Value error, ")
        messages.append(f"{field}: {msg}" if field else msg)
    return JSONResponse(status_code=422, content={"detail": "; ".join(messages)})

# Include Routes
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(interview.router, prefix="/interview", tags=["interview"])

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup")
    check_connection()  # fails fast with a clear message if MongoDB is unreachable
    logger.info(f"Connected to MongoDB (database: {settings.database_name})")
    if settings.demo_mode:
        logger.warning(f"DEMO MODE is ON ({settings.demo_reason}): Gemini is not used.")
    # Ensure MongoDB indexes
    db.users.create_index("email", unique=True)
    db.sessions.create_index("user_id")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutdown")
    client.close()

@app.get("/config")
async def public_config():
    """Non-secret settings the frontend needs (e.g. to show the Demo Mode banner)."""
    return {
        "demo_mode": settings.demo_mode,
        "demo_reason": settings.demo_reason,
        "max_video_size_mb": settings.max_video_size_mb,
    }

@app.get("/")
async def root():
    return {"message": "AI Mock Interview Platform"}
