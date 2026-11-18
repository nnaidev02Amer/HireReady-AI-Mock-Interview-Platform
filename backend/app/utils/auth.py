from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import ExpiredSignatureError, JWTError, jwt

from app.config import settings
from app.utils.logger import logger

SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    headers = {"WWW-Authenticate": "Bearer"}
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"require_exp": True},
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=401, detail="Token has expired. Please log in again.", headers=headers
        )
    except JWTError as e:
        logger.warning(f"Invalid JWT: {e}")
        raise HTTPException(
            status_code=401, detail="Could not validate credentials", headers=headers
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=401, detail="Could not validate credentials", headers=headers
        )
    return email
