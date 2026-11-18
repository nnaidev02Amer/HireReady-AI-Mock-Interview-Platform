import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext
from pymongo.errors import DuplicateKeyError

from app.database import db
from app.models.user import Token, User
from app.utils.auth import create_access_token, get_current_user
from app.utils.logger import logger

# passlib 1.7.4 reads `bcrypt.__about__`, which bcrypt >= 4.1 removed. Hashing still
# works; passlib just logs a harmless "error reading bcrypt version" warning.
logging.getLogger("passlib").setLevel(logging.ERROR)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/register")
async def register(user: User):
    if db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    try:
        db.users.insert_one(
            {"email": user.email, "password": pwd_context.hash(user.password)}
        )
    except DuplicateKeyError:  # two simultaneous registrations (unique index)
        raise HTTPException(status_code=400, detail="Email already exists")
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")
    logger.info(f"User registered: {user.email}")
    return {"message": "User registered successfully"}


@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        user = db.users.find_one({"email": form_data.username})
        valid = bool(user) and pwd_context.verify(form_data.password, user["password"])
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    logger.info(f"User logged in: {user['email']}")
    return {
        "access_token": create_access_token(data={"sub": user["email"]}),
        "token_type": "bearer",
    }


@router.get("/me")
async def get_user(current_user: str = Depends(get_current_user)):
    return {"email": current_user}
