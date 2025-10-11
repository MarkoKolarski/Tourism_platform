# Tourism Platform

Mikro-servisna arhitektura za turističku platformu.

## 🏗️ Arhitektura

Projekat se sastoji od nezavisnih mikroservisa sa različitim tehnologijama:

```
Tourism Platform
├── Stakeholders Service (Port 8001) - PostgreSQL
├── Followers Service (Port 8002) - Neo4j
└── Blog Service (Port 8003) - TBD
```

## 📦 Servisi

### 1. Stakeholders Service (Port 8001)
**Tehnologije**: Python + FastAPI + PostgreSQL  
**Status**: ✅ Implementiran (KT1)

**Implementirane funkcionalnosti**:
- ✅ Registracija korisnika (POST /api/users/register)
- ✅ Izmena profila (PUT /api/users/{user_id}/profile)
- ✅ JWT autentifikacija i autorizacija
- ✅ Admin funkcionalnosti (pregled/blokiranje korisnika)

**Dokumentacija**: `stakeholders-service/README.md`

### 2. Followers Service (Port 8002) - **NOVO! KT2**
**Tehnologije**: Python + FastAPI + Neo4j (Graph Database)  
**Status**: ✅ Implementiran (KT2)

**Implementirane funkcionalnosti**:
- ✅ Follow/Unfollow sistem
- ✅ Pregled pratilaca (followers)
- ✅ Pregled korisnika koje korisnik prati (following)
- ✅ Statistika praćenja
- ✅ Uzajamni pratioci (mutual followers)
- ✅ Preporuke za praćenje (graph-based recommendations)
- ✅ Neo4j grafna baza podataka

**Dokumentacija**: `followers-service/README.md`  
**KT2 Info**: `followers-service/KT2_INFO.md`

### 3. Blog Service (Port 8003)  
**Tehnologije**: TBD  
**Status**: 🚧 Planirano

**Planirane funkcionalnosti**:
- Kreiranje blog objava
- Komentarisanje objava  
- Lajkovanje objava

## 🚀 Pokretanje

### Opcija 1: Docker Compose (Preporučeno)

Pokreće sve servise odjednom:

```powershell
docker-compose up -d
```

Servisi će biti dostupni na:
- Stakeholders Service: http://localhost:8001
- Followers Service: http://localhost:8002
- Neo4j Browser: http://localhost:7474

### Opcija 2: Pojedinačno Pokretanje

#### Stakeholders Service
```powershell
cd stakeholders-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Detaljne instrukcije: `stakeholders-service/POKRETANJE.md`

#### Followers Service (KT2)

1. Pokrenite Neo4j:
```powershell
docker run -d --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/testpassword neo4j:latest
```

2. Pokrenite servis:
```powershell
cd followers-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

Detaljne instrukcije: `followers-service/POKRETANJE.md`

## 🧪 Testiranje

### Stakeholders Service
```powershell
cd stakeholders-service
python test_endpoints.py
```

### Followers Service
```powershell
cd followers-service
python test_endpoints.py
```

## 🐳 Docker

Svaki servis ima svoj `Dockerfile`.  
`docker-compose.yml` pokreće kompletan stack sa svim servisima i bazama podataka.

## 📊 Tehnologije po Servisima

| Servis | Framework | Baza | Port | Status |
|--------|-----------|------|------|--------|
| Stakeholders | FastAPI | PostgreSQL | 8001 | ✅ KT1 |
| Followers | FastAPI | Neo4j | 8002 | ✅ KT2 |
| Blog | TBD | TBD | 8003 | 🚧 Planirano |

## 🎯 Kontrolne Tačke (KT)

### ✅ KT1 - Stakeholders Service
- [x] Registracija i upravljanje korisnicima
- [x] PostgreSQL relaciona baza
- [x] JWT autentifikacija
- [x] RESTful API

### ✅ KT2 - Followers Service (NoSQL i Praćenje)
- [x] Potpuno novi mikroservis
- [x] Follow/Unfollow sistem
- [x] Neo4j grafna baza podataka
- [x] Iskorišćavanje grafnih mogućnosti
- [x] Preporuke baziranih na grafu
- [x] RESTful API

### 🚧 KT3 - Blog Service (Planirano)
- [ ] Blog objave
- [ ] Komentari
- [ ] Lajkovanje

## 🔗 API Dokumentacija

Svaki servis ima interaktivnu Swagger dokumentaciju:

- Stakeholders: http://localhost:8001/docs
- Followers: http://localhost:8002/docs

## 🌐 Health Checks

```powershell
# Stakeholders Service
curl http://localhost:8001/health

# Followers Service
curl http://localhost:8002/health
```

## 📁 Struktura Projekta

```
Tourism_platform/
├── stakeholders-service/      # KT1 - Korisnici i autentifikacija
│   ├── app/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
├── followers-service/          # KT2 - Praćenje korisnika (Neo4j)
│   ├── app/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── README.md
│   └── KT2_INFO.md
├── docker-compose.yml          # Orkestacija svih servisa
└── README.md
```

## 👥 Tim

Projekat razvijen kao deo kursa za napredne web tehnologije sa mikroservisnom arhitekturom.