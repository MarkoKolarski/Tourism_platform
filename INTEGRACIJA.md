# Integracija Stakeholders i Followers Servisa

## 📋 Pregled

Stakeholders servis (PostgreSQL) upravlja korisničkim nalozima, dok Followers servis (Neo4j) upravlja relacijama praćenja. Ova dva servisa treba da budu sinhronizovana.

## 🔄 Tokovi Integracije

### 1. Registracija Novog Korisnika

Kada se korisnik registruje u Stakeholders servisu, automatski kreiraj node u Neo4j:

```python
# U stakeholders-service/app/api/users.py

import httpx

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    # ... postojeći kod za kreiranje korisnika ...
    
    # Nakon uspešne registracije, sinhronizuj sa Followers servisom
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "http://localhost:8002/api/followers/users/create",
                params={
                    "user_id": new_user.id,
                    "username": new_user.username
                },
                timeout=5.0
            )
    except Exception as e:
        # Log greške, ali ne blokiraj registraciju
        print(f"Followers service sync error: {e}")
    
    return new_user
```

### 2. Brisanje Korisnika

Kada se korisnik obriše iz Stakeholders servisa:

```python
# U stakeholders-service/app/api/users.py

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    # ... postojeći kod za brisanje ...
    
    # Sinhronizuj brisanje sa Followers servisom
    try:
        async with httpx.AsyncClient() as client:
            await client.delete(
                f"http://localhost:8002/api/followers/users/{user_id}",
                timeout=5.0
            )
    except Exception as e:
        print(f"Followers service sync error: {e}")
    
    return {"message": "User deleted"}
```

### 3. Izmena Username-a

Ako se username menja:

```python
@router.put("/users/{user_id}/profile")
async def update_profile(user_id: int, profile_data: ProfileUpdate, db: Session = Depends(get_db)):
    # ... postojeći kod za update ...
    
    # Sinhronizuj sa Followers servisom (re-create node sa novim username-om)
    if profile_data.username:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:8002/api/followers/users/create",
                    params={
                        "user_id": user_id,
                        "username": profile_data.username
                    },
                    timeout=5.0
                )
        except Exception as e:
            print(f"Followers service sync error: {e}")
    
    return updated_user
```

## 📦 Instalacija httpx

U `stakeholders-service/requirements.txt` dodaj:
```
httpx==0.25.0
```

Zatim:
```powershell
cd stakeholders-service
pip install httpx
```

## 🔧 Konfigurisanje URL-ova

Koristi environment variable za Followers service URL:

```python
# stakeholders-service/app/core/config.py

class Settings(BaseSettings):
    # ... postojeće postavke ...
    
    followers_service_url: str = "http://localhost:8002"
```

```python
# U .env fajlu
FOLLOWERS_SERVICE_URL=http://localhost:8002
```

## 🚨 Error Handling

**Važno**: Greške u sinhronizaciji NE SMEJU blokirati glavne operacije!

```python
async def sync_with_followers(user_id: int, username: str):
    """Helper funkcija za sinhronizaciju"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.followers_service_url}/api/followers/users/create",
                params={"user_id": user_id, "username": username},
                timeout=5.0
            )
            response.raise_for_status()
            return True
    except httpx.TimeoutException:
        print(f"Followers service timeout for user {user_id}")
        return False
    except httpx.HTTPError as e:
        print(f"Followers service HTTP error: {e}")
        return False
    except Exception as e:
        print(f"Followers service error: {e}")
        return False
```

## 🔍 Validacija Integracije

### Test Scenario 1: Registracija
```powershell
# 1. Registruj korisnika u Stakeholders
curl -X POST "http://localhost:8001/api/users/register" -H "Content-Type: application/json" -d '{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "role": "tourist"
}'

# 2. Proveri u Followers servisu
curl "http://localhost:8002/api/followers/stats/1"
```

### Test Scenario 2: Follow/Unfollow
```powershell
# Korisnik 1 prati korisnika 2
curl -X POST "http://localhost:8002/api/followers/follow" -H "Content-Type: application/json" -d '{
  "follower_id": 1,
  "following_id": 2
}'

# Proveri pratioce
curl "http://localhost:8002/api/followers/followers/2"
```

## 🌐 Opcija: API Gateway

Za produkciju, razmisli o API Gateway-u koji će rutirati zahteve:

```
Client Request
    ↓
API Gateway (Port 8000)
    ↓
    ├─→ Stakeholders Service (8001)
    └─→ Followers Service (8002)
```

Možete koristiti:
- **Kong**
- **Nginx**
- **Traefik**
- Ili jednostavan FastAPI gateway

## 📊 Primer: Kombinirani Profil

Endpoint koji kombinuje podatke iz oba servisa:

```python
# Novi endpoint u stakeholders-service

@router.get("/users/{user_id}/profile-with-stats")
async def get_profile_with_stats(user_id: int, db: Session = Depends(get_db)):
    # Osnovni profil iz PostgreSQL
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Statistika iz Neo4j
    followers_stats = {}
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.followers_service_url}/api/followers/stats/{user_id}",
                timeout=5.0
            )
            if response.status_code == 200:
                followers_stats = response.json()
    except:
        pass
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "followers_count": followers_stats.get("followers_count", 0),
        "following_count": followers_stats.get("following_count", 0)
    }
```

## 🔐 Autentifikacija

Followers servis trenutno nema autentifikaciju. Za produkciju:

1. **Opcija A**: Followers endpoints poziva samo Stakeholders servis (internal)
2. **Opcija B**: Dodaj JWT validaciju i u Followers servis
3. **Opcija C**: Koristi API Gateway za autentifikaciju

### Primer: Validacija JWT tokena u Followers servisu

```python
# followers-service/app/api/followers.py

from app.core.security import decode_access_token
from fastapi import Header, HTTPException

async def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return payload

# Primena na endpoint
@router.post("/follow")
async def follow_user(
    request: FollowRequest,
    current_user = Depends(verify_token)
):
    # Proveri da li korisnik prati sam sebe
    if request.follower_id != current_user.get("user_id"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # ... ostatak koda ...
```

## 🧪 Integration Tests

```python
# tests/test_integration.py

import pytest
import httpx

@pytest.mark.asyncio
async def test_user_registration_sync():
    # Registruj korisnika u Stakeholders
    async with httpx.AsyncClient() as client:
        register_response = await client.post(
            "http://localhost:8001/api/users/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "password123",
                "role": "tourist"
            }
        )
        assert register_response.status_code == 201
        user_id = register_response.json()["id"]
        
        # Proveri da li je korisnik kreiran u Followers servisu
        stats_response = await client.get(
            f"http://localhost:8002/api/followers/stats/{user_id}"
        )
        assert stats_response.status_code == 200
```

## 📝 Napomene

1. **Asinhronost**: Koristi `async/await` za ne-blokirajuće pozive
2. **Timeout**: Postavi razumne timeout-e (3-5 sekundi)
3. **Retry Logic**: Razmisli o retry mehanizmu za kritične operacije
4. **Logging**: Loguj sve sinhronizacione greške
5. **Monitoring**: Prati status oba servisa
6. **Eventual Consistency**: Prihvati da podaci mogu biti kratko nekonzistentni

## 🚀 Deployment

U produkciji, koristi service discovery:
- Kubernetes Services
- Consul
- Docker Swarm

Umesto hardkodiranih URL-ova.
