# Tourism Platform - Stakeholders Service

Stakeholders servis za Tourism Platform aplikaciju implementiran u Python + FastAPI + PostgreSQL.

## Funkcionalnosti

Ovaj servis implementira sledeće funkcionalnosti:

### Implementirane funkcionalnosti (moj deo):
1. **Registracija korisnika** (`POST /api/users/register`)
   - Kreiranje novog naloga sa poljima: korisničko ime, lozinka, email, uloga
   - Validacija jedinstvenosti korisničkog imena i email-a
   - Hash-ovanje lozinke
   - Podržane uloge: 'vodic', 'turista' (admin se dodaje direktno u bazu)

2. **Izmena profila** (`PUT /api/users/{user_id}/profile`)
   - Korisnik može da menja svoj profil
   - Validacija da korisnik može da menja samo svoj profil
   - Polja: ime, prezime, profilna slika, biografija, moto

### Funkcionalnosti za kolegu:
3. **Pregled svih korisnika** - Admin funkcija
4. **Blokiranje korisnika** - Admin funkcija  
5. **Pregled profila korisnika**

## Tehnička specifikacija

### Tech Stack
- **Backend**: Python 3.11 + FastAPI
- **Baza podataka**: PostgreSQL
- **ORM**: SQLAlchemy
- **Validacija**: Pydantic
- **Security**: bcrypt + JWT (python-jose)
- **Server**: Uvicorn
- **Docker**: Dockerfile za kontejnerizaciju

### Struktura projekta
```
stakeholders-service/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI aplikacija
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py            # SQLAlchemy User model
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── user.py            # Pydantic schemas
│   ├── api/
│   │   ├── __init__.py
│   │   └── users.py           # User endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # Konfiguracija
│   │   ├── database.py        # Database setup
│   │   └── security.py        # Password hashing, JWT
│   └── services/
│       ├── __init__.py
│       └── user_service.py    # Business logika
├── requirements.txt
├── Dockerfile
├── .env                       # Environment varijable
├── init_db.sql               # SQL za inicijalizaciju baze
└── README.md
```

## Setup i pokretanje

### Lokalno pokretanje

1. **Instaliranje dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Pokretanje PostgreSQL** (Docker):
   ```bash
   docker run --name postgres-tourism -e POSTGRES_PASSWORD=password -e POSTGRES_DB=tourism_stakeholders -p 5432:5432 -d postgres:15
   ```

3. **Inicijalizacija baze podataka**:
   ```bash
   psql -h localhost -U postgres -d tourism_stakeholders -f init_db.sql
   ```

4. **Pokretanje aplikacije**:
   ```bash
   cd stakeholders-service
   uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
   ```

### Docker pokretanje

1. **Build Docker image**:
   ```bash
   docker build -t stakeholders-service .
   ```

2. **Pokretanje sa Docker Compose** (kada kolege naprave compose fajl):
   ```bash
   docker-compose up
   ```

## API Endpoints

### 1. Registracija korisnika
```http
POST /api/users/register
Content-Type: application/json

{
    "username": "pera123",
    "email": "pera@example.com",
    "password": "sigurna123",
    "role": "turista"
}
```

**Response**:
```json
{
    "id": 1,
    "username": "pera123",
    "email": "pera@example.com",
    "role": "turista",
    "message": "Korisnik je uspešno registrovan"
}
```

### 2. Izmena profila
```http
PUT /api/users/1/profile
Content-Type: application/json

{
    "first_name": "Petar",
    "last_name": "Petrović",
    "biography": "Volim da putujem po Srbiji",
    "motto": "Putuj, uči, uživaj!"
}
```

**Response**:
```json
{
    "id": 1,
    "username": "pera123",
    "first_name": "Petar",
    "last_name": "Petrović",
    "biography": "Volim da putujem po Srbiji",
    "motto": "Putuj, uči, uživaj!",
    "updated_at": "2025-08-29T10:30:00",
    "message": "Profil je uspešno ažuriran"
}
```

### Health Check endpoints
```http
GET /                          # Basic info
GET /health                    # Health check
```

## Validacije

### Registracija:
- Korisničko ime: 3-50 karaktera, samo slova, brojevi, _, -
- Email: validna email adresa, jedinstvena
- Lozinka: minimum 6 karaktera
- Uloga: samo 'vodic' ili 'turista' (admin se ne može registrovati)

### Profil:
- Ime/Prezime: maksimalno 50 karaktera
- Biografija: maksimalno 1000 karaktera
- Moto: maksimalno 255 karaktera
- Korisnik može menjati samo svoj profil

## Baza podataka

### User tabela:
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'vodic', 'turista')),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    profile_image VARCHAR(255),
    biography TEXT,
    motto VARCHAR(255),
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

### Postman Collection

Kreirati collection sa sledećim request-ovima:

1. **Register Tourist**:
   - POST `http://localhost:8001/api/users/register`
   - Body: JSON sa podacima za turistu

2. **Register Guide**:
   - POST `http://localhost:8001/api/users/register`
   - Body: JSON sa podacima za vodiča

3. **Update Profile**:
   - PUT `http://localhost:8001/api/users/{user_id}/profile`
   - Body: JSON sa podacima profila

### Test scenarios:
- Registracija validnog korisnika
- Pokušaj registracije sa postojećim username/email
- Pokušaj registracije admin uloge
- Izmena profila validnim podacima
- Pokušaj izmene profila drugog korisnika

## Port konfiguracija
- **Stakeholders servis**: port 8001
- **Blog servis** (kolege): port 8002

## Docker

Servis je spreman za Docker deployment:
- Dockerfile konfigurisan
- Port 8001 exposed
- Environment varijable kroz .env

## Koordinacija sa timom

### Sa kolegom na Stakeholders servisu:
- Zajedničko kreiranje baze i User tabele ✅
- Osnovne strukture projekta ✅
- Pydantic schemas ✅
- SQLAlchemy model ✅
- Koordinacija endpoint implementacije

### Sa kolegama na Blog servisu:
- UserResponse format definisan za korišćenje u Blog servisu
- Port separation (8001 vs 8002)

## TODO (za kolegu na Stakeholders servisu):
1. Implementirati autentifikaciju i JWT token handling
2. Implementirati admin funkcionalnosti:
   - GET /api/users (pregled svih korisnika)
   - PUT /api/users/{user_id}/block (blokiranje korisnika)
   - GET /api/users/{user_id} (pregled profila)
3. Dodati authentication middleware u users.py
4. Kreirati docker-compose.yml fajl

## Environment varijable

Kopiraj `.env` fajl i prilagodi varijable za svoje okruženje:
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT secret key (promeni u produkciji!)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration
