from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine
from app.models.purchase import Base
from app.api.purchase import router as purchase_router

# Kreiranje tabela u bazi
Base.metadata.create_all(bind=engine)

# Kreiranje FastAPI aplikacije
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="""
    Purchase servis za Tourism Platform - kupovina tura sa SAGA pattern-om
    
    ## Funkcionalnosti
    
    ### 🛒 Shopping Cart
    - Dodavanje tura u korpu
    - Uklanjanje tura iz korpe
    - Ažuriranje količine
    - Automatsko računanje ukupne cene
    
    ### 💳 Checkout Process (SAGA Pattern)
    - Validacija korisnika
    - Rezervacija tura
    - Procesiranje plaćanja
    - Generisanje purchase tokena
    - Ažuriranje statistike
    
    ### 🎫 Purchase Tokens
    - Pregled kupljenih tura
    - Token kao dokaz kupovine
    - Pristup detaljima kupljenih tura
    
    ### 🔄 SAGA Transactions
    - Praćenje statusa transakcija
    - Automatska kompenzacija pri neuspehu
    - Transaction log
    """
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # U produkciji treba ograničiti
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uključivanje router-a
app.include_router(
    purchase_router, 
    prefix=f"{settings.api_prefix}/purchase", 
    tags=["purchase"]
)

# Health check endpoints
@app.get("/")
async def root():
    return {
        "message": "Tourism Platform - Purchase Service", 
        "version": settings.api_version,
        "status": "running",
        "features": [
            "Shopping Cart",
            "SAGA Pattern Checkout",
            "Purchase Tokens",
            "Distributed Transactions"
        ]
    }

@app.get("/health")
async def health_check():
    """Provera zdravlja servisa"""
    # TODO: Proveri konekciju sa bazom
    return {
        "status": "healthy",
        "service": "purchase",
        "database": "connected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8003, 
        reload=True
    )
