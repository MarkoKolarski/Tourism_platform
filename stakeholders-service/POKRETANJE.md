# INSTRUKCIJE ZA POKRETANJE STAKEHOLDERS SERVISA

## BRZO POKRETANJE - KORAK PO KORAK

### 1. PRIPREMA BAZE PODATAKA

Pokreni PostgreSQL u Docker-u:
```powershell
docker run --name postgres-tourism -e POSTGRES_PASSWORD=password -e POSTGRES_DB=tourism_stakeholders -p 5432:5432 -d postgres:15
```

Inicijalizuj bazu podataka:
```powershell
# Kopiraj SQL komande iz init_db.sql i izvršiti u psql ili pgAdmin
# Ili direktno:
docker exec -i postgres-tourism psql -U postgres -d tourism_stakeholders < init_db.sql
```

### 2. POKRETANJE SERVISA

Instaliraj dependencies:
```powershell
cd stakeholders-service
pip install -r requirements.txt
```

Pokreni servis:
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 3. TESTIRANJE

Otvori drugi terminal i pokreni test:
```powershell
cd stakeholders-service
python test_endpoints.py
```

### 4. MANUAL TESTIRANJE

Otvori browser: http://localhost:8001/docs
- Automatska Swagger dokumentacija
- Možeš testirati endpoint-ove direktno

### 5. POSTMAN TESTIRANJE

Kreiraj novi Collection sa sledećim request-ovima:

**1. Health Check**
- GET http://localhost:8001/
- GET http://localhost:8001/health

**2. Register Tourist**
- POST http://localhost:8001/api/users/register
- Body (JSON):
```json
{
    "username": "tourist123",
    "email": "tourist@example.com", 
    "password": "password123",
    "role": "turista"
}
```

**3. Register Guide**
- POST http://localhost:8001/api/users/register
- Body (JSON):
```json
{
    "username": "guide456",
    "email": "guide@example.com",
    "password": "password123", 
    "role": "vodic"
}
```

**4. Update Profile**
- PUT http://localhost:8001/api/users/1/profile
- Body (JSON):
```json
{
    "first_name": "Marko",
    "last_name": "Petrović",
    "biography": "Ljubitelj prirode i planina",
    "motto": "Život je putovanje, ne destinacija"
}
```

## OČEKIVANI REZULTATI

✅ Registracija korisnika uspešna
✅ Validacija - admin se ne može registrovati  
✅ Validacija - duplikat username/email se odbacuje
✅ Izmena profila uspešna
✅ Lozinke su hash-ovane u bazi
✅ Timestamps se automatski postavljaju

## SLEDEĆI KORACI ZA KOLEGU

1. Implementirati JWT autentifikaciju
2. Dodati admin endpoint-ove
3. Kreirati docker-compose.yml
4. Koordinirati sa Blog servisom

## PORTOVI

- Stakeholders servis: 8001
- PostgreSQL: 5432  
- Blog servis (kada ga kolege naprave): 8002
