from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from app.config import settings



pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = getattr(settings, 'jwt_secret_key', 'fallback_secret_key_change_in_production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_user_from_token(token: str, db):
    """Get user from JWT token without using FastAPI dependencies"""
    from app import crud
    
    class AuthException(Exception):
        pass
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise AuthException("Invalid token payload")
    except JWTError:
        raise AuthException("Invalid token")
    
    user = await crud.get_user_by_email(db, email=email)
    if user is None:
        raise AuthException("User not found")
    
    return user