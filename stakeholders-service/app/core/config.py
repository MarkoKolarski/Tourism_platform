from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://postgres:password@localhost:5432/tourism_stakeholders"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # API
    api_title: str = "Tourism Platform - Stakeholders Service"
    api_version: str = "1.0.0"
    api_prefix: str = "/api"
    
    class Config:
        env_file = ".env"


settings = Settings()
