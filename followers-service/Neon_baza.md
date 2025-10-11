# 🚀 BRZI START - Neo4j Inicijalizacija

## ⚡ 3 Koraka do Inicijalizovane Baze

### 1️⃣ Pokreni Docker
```powershell
docker-compose up -d
```

### 2️⃣ Inicijalizuj Bazu
```powershell
# Windows (dvoklikom):
init_neo4j.bat

# ILI PowerShell:
.\init_neo4j.ps1

# ILI Python:
python init_db_script.py
```

### 3️⃣ Verifikuj
Otvori: http://localhost:7474
- Username: `neo4j`
- Password: `testpassword`

Upit za proveru:
```cypher
MATCH (u:User) RETURN u;
```

---

## 📊 Šta Dobijam?

Po pokretanju skripte imaćeš:

✅ **10 test korisnika:**
- 1 admin
- 3 vodiča (marko_vodic, ana_guide, stefan_tours)
- 6 turista (jovana_travel, milan_explorer, sara_tourist, ...)

✅ **16+ FOLLOWS relacija** (praćenja između korisnika)

✅ **Constraints i indexe** za performanse

✅ **Verifikaciju** da je sve OK

---

## 🔧 Ako Nešto Ne Radi

### ❌ Docker nije pokrenut
```powershell
# Pokreni Docker Desktop pa ponovo:
docker-compose up -d
```

### ❌ Neo4j driver nije instaliran
```powershell
pip install neo4j
```

### ❌ Neo4j container ne radi
```powershell
docker ps | findstr neo4j
# Ako ne vidiš output:
docker-compose restart neo4j
```

### ❌ Baza već ima podatke
```cypher
// U Neo4j Browser (http://localhost:7474):
MATCH (n) DETACH DELETE n;
```
Zatim ponovo pokreni `init_neo4j.bat`

---

## 📖 Korisni Cypher Upiti

```cypher
// SVI KORISNICI
MATCH (u:User) RETURN u;

// SVE RELACIJE (vizualizacija)
MATCH (a)-[r:FOLLOWS]->(b) RETURN a, r, b;

// PRATIOCI korisnika "marko_vodic"
MATCH (follower)-[:FOLLOWS]->(u:User {username: 'marko_vodic'})
RETURN follower.username;

// KOGA PRATI "jovana_travel"
MATCH (u:User {username: 'jovana_travel'})-[:FOLLOWS]->(following)
RETURN following.username;

// PREPORUKE za "jovana_travel"
MATCH (me:User {username: 'jovana_travel'})-[:FOLLOWS]->()-[:FOLLOWS]->(rec:User)
WHERE NOT (me)-[:FOLLOWS]->(rec) AND me <> rec
RETURN DISTINCT rec.username;

// STATISTIKA - Broj pratilaca po korisniku
MATCH (u:User)
OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower)
RETURN u.username, COUNT(follower) AS followers
ORDER BY followers DESC;
```

---

## 🌐 Linkovi

- **Neo4j Browser:** http://localhost:7474
- **Followers API:** http://localhost:8002/docs
- **Stakeholders API:** http://localhost:8001/docs

---

## 📞 Pomoć

Za detaljnija uputstva: **INICIJALIZACIJA_NEO4J.md**
