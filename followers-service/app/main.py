from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import neo4j_db
from app.api.followers import router as followers_router
import threading
from app.grpc.followers_grpc import serve as grpc_serve

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Followers servis za Tourism Platform - sistem praćenja korisnika sa Neo4j"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Startup event - povezivanje sa Neo4j
@app.on_event("startup")
async def startup_event():
    """Inicijalizacija konekcije sa Neo4j prilikom pokretanja aplikacije"""
    neo4j_db.connect()
    print("Connected to Neo4j database")
    
    driver = neo4j_db.get_driver()
    with driver.session() as session:
        try:
            session.run("""
                CREATE CONSTRAINT user_id_unique IF NOT EXISTS
                FOR (u:User) REQUIRE u.user_id IS UNIQUE
            """)
            print("Created unique constraint on User.user_id")
        except Exception as e:
            print(f"Constraint creation info: {e}")
    
    # Start gRPC server in separate thread
    grpc_thread = threading.Thread(target=grpc_serve, daemon=True)
    grpc_thread.start()
    print("gRPC server started in background")


# Shutdown event - zatvaranje konekcije
@app.on_event("shutdown")
async def shutdown_event():
    """Zatvaranje konekcije sa Neo4j prilikom gašenja aplikacije"""
    neo4j_db.close()
    print("Disconnected from Neo4j database")


app.include_router(
    followers_router, 
    prefix=f"{settings.api_prefix}", 
    tags=["followers"]
)


@app.get("/")
async def root():
    return {
        "message": "Tourism Platform - Followers Service", 
        "version": settings.api_version,
        "status": "running",
        "database": "Neo4j Graph Database"
    }


@app.get("/health")
async def health_check():
    """Provera zdravlja servisa i konekcije sa bazom"""
    db_status = neo4j_db.verify_connectivity()
    
    return {
        "status": "healthy" if db_status else "unhealthy",
        "database_connected": db_status
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8002, 
        reload=True
    )
