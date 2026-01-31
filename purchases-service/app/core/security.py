from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings
import logging

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifikuj da li je plain password tačan"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Heširanje passworda"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Kreiranje JWT tokena"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.algorithm)
    
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Dekodiranje JWT tokena"""
    try:
        logging.debug(f"[JWT] Decoding token with secret: {settings.jwt_secret[:10]}...")
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.algorithm])
        logging.debug(f"[JWT] Successfully decoded payload: {payload}")
        return payload
    except JWTError as e:
        logging.error(f"[JWT] Token decode error: {str(e)}")
        return None
    except Exception as e:
        logging.error(f"[JWT] Unexpected error decoding token: {str(e)}")
        return None
