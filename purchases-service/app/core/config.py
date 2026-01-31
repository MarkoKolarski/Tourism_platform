from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str

    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # API
    api_title: str = "Tourism Platform - Purchase Service"
    api_version: str = "1.0.0"
    api_prefix: str = ""

    # URLs drugih mikroservisa
    stakeholders_service_url: str = "http://localhost:8001"
    followers_service_url: str = "http://localhost:8002"
    tours_service_url: str = "http://localhost:8005"
    
    # gRPC addresses
    tours_grpc_addr: str = "tours-service:50052"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
