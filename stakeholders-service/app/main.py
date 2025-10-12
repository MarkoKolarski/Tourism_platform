from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine
from app.models.user import Base
from app.models.current_location import CurrentLocation  # Import za kreiranje tabele
from app.api.users import router as users_router
from app.api.locations import router as locations_router
from app.observability import observability, get_logger

# Setup observability pre kreiranja app-a
logger = get_logger()

# Kreiranje tabela u bazi
Base.metadata.create_all(bind=engine)
logger.info("Database tables created successfully")

# Kreiranje FastAPI aplikacije
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="""
    Stakeholders servis za Tourism Platform - registracija i upravljanje korisnicima
    
    ## Observability Features
    - OpenTelemetry distributed tracing (Jaeger)
    - Prometheus metrics collection
    - Structured JSON logging (Loki)
    - Performance monitoring
    """
)

# Setup observability instrumentacija
observability.instrument_fastapi(app)
observability.instrument_sqlalchemy(engine)
logger.info("Observability instrumentation completed")

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
    """Root endpoint with service info"""
    logger.info("Root endpoint accessed")
    return {
        "message": "Tourism Platform - Stakeholders Service", 
        "version": settings.api_version,
        "status": "running",
        "observability": {
            "tracing": "OpenTelemetry + Jaeger",
            "metrics": "Prometheus",
            "logging": "JSON + Loki"
        }
    }

@app.get("/health")
async def health_check():
    """Enhanced health check with observability info"""
    logger.info("Health check requested")
    
    try:
        # Test database connection
        from sqlalchemy import text
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        db_status = "connected"
        logger.info("Health check: database connection successful")
    except Exception as e:
        db_status = f"error: {str(e)}"
        logger.error(f"Health check: database connection failed - {str(e)}")
    
    health_data = {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "service": "stakeholders",
        "database": db_status,
        "observability": {
            "tracing": "enabled",
            "metrics": "enabled", 
            "logging": "enabled"
        }
    }
    
    return health_data


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8001, 
        reload=True
    )
