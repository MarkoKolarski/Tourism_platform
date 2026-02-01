from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Neo4j Database
    neo4j_uri: str
    neo4j_user: str
    neo4j_password: str
        
    # Security
    jwt_secret: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # API
    api_title: str = "Tourism Platform - Followers Service"
    api_version: str = "1.0.0"
    api_prefix: str = ""
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'


settings = Settings()
