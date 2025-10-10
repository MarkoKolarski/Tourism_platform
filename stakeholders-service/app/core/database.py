from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Kreiranje engine-a
engine = create_engine(settings.database_url)

# Session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base klasa za modele
Base = declarative_base()


# Dependency za dobijanje database session-a
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
