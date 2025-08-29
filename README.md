# Tourism Platform

Mikro-servisna arhitektura za turističku platformu.

## Servisi

### 1. Stakeholders Service (Port 8001)
**Tehnologije**: Python + FastAPI + PostgreSQL
**Status**: ✅ Implementiran (moj deo)

**Implementirane funkcionalnosti**:
- Registracija korisnika (POST /api/users/register)
- Izmena profila (PUT /api/users/{user_id}/profile)

**TODO za kolegu**:
- Admin funkcionalnosti (pregled/blokiranje korisnika)
- Autentifikacija i JWT
- Pregled profila

### 2. Blog Service (Port 8002)  
**Tehnologije**: TBD
**Status**: 🚧 U razvoju (kolege)

**Planirane funkcionalnosti**:
- Kreiranje blog objava
- Komentarisanje objava  
- Lajkovanje objava

## Pokretanje

### Stakeholders Service
```bash
cd stakeholders-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Detaljne instrukcije: `stakeholders-service/POKRETANJE.md`

## Docker

Svaki servis ima svoj Dockerfile.
Docker Compose fajl će biti kreiran kada budu svi servisi gotovi.

## Tim

- **Stakeholders servis**: 
  - Funkcionalnosti 1,2 (registracija, izmena profila) - ✅ Gotovo
  - Funkcionalnosti 3,4,5 (admin funkcije, pregled) - 🚧 Kolega
- **Blog servis**: Kolege rade funkcionalnosti 6,7,8
- **Docker**: Svi zajedno