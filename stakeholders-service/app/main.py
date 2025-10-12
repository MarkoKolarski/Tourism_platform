from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine
from app.models.user import Base
from app.models.current_location import CurrentLocation  # Import za kreiranje tabele
from app.api.users import router as users_router
from app.api.locations import router as locations_router

# Kreiranje tabela u bazi
Base.metadata.create_all(bind=engine)

# Kreiranje FastAPI aplikacije
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Stakeholders servis za Tourism Platform - registracija i upravljanje korisnicima"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uključivanje router-a
app.include_router(
    users_router, 
    prefix=f"{settings.api_prefix}/users", 
    tags=["users"]
)

app.include_router(
    locations_router,
    prefix=f"{settings.api_prefix}/locations",
    tags=["locations"]
)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Tourism Platform - Stakeholders Service", 
        "version": settings.api_version,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8001, 
        reload=True
    )
