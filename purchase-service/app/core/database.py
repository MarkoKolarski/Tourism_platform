from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Kreiranje engine-a za PostgreSQL
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base klasa za modele
Base = declarative_base()


def get_db():
    """Dependency za dobijanje database sesije"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
