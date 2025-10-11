# Tourism Platform - Followers Service (KT2)

## 🎯 Opis

Followers mikroservis implementiran kao deo druge kontrolne tačke (KT2) projekta Tourism Platform. Servis omogućava praćenje korisnika (follow/unfollow sistem) koristeći **Neo4j grafnu bazu podataka**.

## 🔑 Ključne Karakteristike

### Tehnologije (KT2 Zahtevi)
- ✅ **Neo4j Graph Database** - Grafna baza za čuvanje relacija praćenja
- ✅ **FastAPI** - Web framework (konzistentan sa stakeholders-service)
- ✅ **Python 3.11** - Isti jezik kao postojeći servis
- ✅ **Docker** - Kontejnerizacija

### Funkcionalnosti
1. **Follow/Unfollow Sistem**
   - Praćenje korisnika
   - Prestanak praćenja
   - Provera statusa praćenja

2. **Pregled i Statistika**
   - Lista pratilaca (followers)
   - Lista korisnika koje korisnik prati (following)
   - Statistika praćenja (brojevi)

3. **Napredne Funkcionalnosti sa Neo4j**
   - Uzajamni pratioci (mutual followers)
   - Preporuke za praćenje baziranih na grafu
   - Iskorišćavanje grafnih upita

## 📁 Struktura Projekta

```
followers-service/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI aplikacija
│   ├── api/
│   │   ├── __init__.py
│   │   └── followers.py        # API endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # Konfiguracija
│   │   ├── database.py        # Neo4j konekcija
│   │   └── security.py        # Security utilities
│   ├── models/
│   │   └── __init__.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── follower.py        # Pydantic schemas
│   └── services/
│       ├── __init__.py
│       └── follower_service.py # Business logic
├── Dockerfile
├── requirements.txt
├── .env.example
├── README.md
├── POKRETANJE.md
└── test_endpoints.py
```

## 🚀 Brzo Pokretanje

### 1. Neo4j Setup (Docker Compose)

Preporučeni način - koristi `docker-compose.yml`:

```powershell
# Pokreni ceo stack (Stakeholders + Followers + baze)
docker-compose up -d
```

Ili samostalno samo Neo4j:

```powershell
docker run -d `
  --name neo4j `
  -p 7474:7474 -p 7687:7687 `
  -e NEO4J_AUTH=neo4j/testpassword `
  neo4j:latest
```

### 2. Inicijalizacija Neo4j Baze sa Test Podacima ⭐

**NOVO!** Automatska inicijalizacija:

```powershell
# Windows - dvoklikom na bat fajl
.\init_neo4j.bat

# Ili PowerShell:
.\init_neo4j.ps1

# Ili Python direktno:
python init_db_script.py
```

Ovo će kreirati:
- ✅ 10 test korisnika (1 admin, 3 vodiča, 6 turista)
- ✅ 16+ FOLLOWS relacija između korisnika
- ✅ Constraints i indexe za performanse
- ✅ Verifikaciju da je sve uspešno kreirano

**📖 Za detaljna uputstva, vidi:** [`INICIJALIZACIJA_NEO4J.md`](INICIJALIZACIJA_NEO4J.md)

### 3. Kreiranje .env Fajla (opciono)

```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=testpassword
SECRET_KEY=dev-secret-key
```

### 4. Instalacija i Pokretanje

```powershell
cd followers-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

### 5. Testiranje

```powershell
python test_endpoints.py
```

Ili posetite: http://localhost:8002/docs

### 6. Provera Neo4j Podataka

Otvori Neo4j Browser: http://localhost:7474
- Username: `neo4j`
- Password: `testpassword`

Probaj ove upite:
```cypher
// Vidi sve korisnike
MATCH (u:User) RETURN u;

// Vidi sve relacije
MATCH (a)-[r:FOLLOWS]->(b) RETURN a, r, b;
```

## 📊 Neo4j Graf Model

### Nodes
```
(:User {user_id: int, username: string, created_at: datetime})
```

### Relationships
```
(:User)-[:FOLLOWS {followed_at: datetime}]->(:User)
```

### Primer Vizualizacije
```
(Marko)-[:FOLLOWS]->(Ana)
(Ana)-[:FOLLOWS]->(Marko)
(Petar)-[:FOLLOWS]->(Marko)
(Jovana)-[:FOLLOWS]->(Ana)
```

## 🔌 API Endpoints

| Metod | Endpoint | Opis |
|-------|----------|------|
| POST | `/api/followers/follow` | Prati korisnika |
| POST | `/api/followers/unfollow` | Prestaje da prati |
| GET | `/api/followers/followers/{user_id}` | Lista pratilaca |
| GET | `/api/followers/following/{user_id}` | Lista korisnika koje prati |
| GET | `/api/followers/stats/{user_id}` | Statistika praćenja |
| GET | `/api/followers/is-following/{follower_id}/{following_id}` | Provera praćenja |
| GET | `/api/followers/mutual/{user_id}` | Uzajamni pratioci |
| GET | `/api/followers/recommendations/{user_id}` | Preporuke |
| POST | `/api/followers/users/create` | Kreira User node |
| DELETE | `/api/followers/users/{user_id}` | Briše korisnika |

## 📖 Primeri Korišćenja

### Follow korisnika
```bash
curl -X POST "http://localhost:8002/api/followers/follow" \
  -H "Content-Type: application/json" \
  -d '{"follower_id": 1, "following_id": 2}'
```

### Dobavljanje pratilaca
```bash
curl "http://localhost:8002/api/followers/followers/1"
```

### Statistika
```bash
curl "http://localhost:8002/api/followers/stats/1"
```

### Preporuke (Neo4j grafni upit)
```bash
curl "http://localhost:8002/api/followers/recommendations/1?limit=5"
```

## 🔗 Integracija sa Stakeholders Service

Kada se korisnik registruje u Stakeholders servisu, može se automatski kreirati u Followers servisu:

```python
# Nakon registracije u stakeholders-service
requests.post(
    "http://localhost:8002/api/followers/users/create",
    params={"user_id": user.id, "username": user.username}
)
```

## 🐳 Docker Compose

Za pokretanje kompletnog stack-a (oba servisa + Neo4j):

```powershell
docker-compose up -d
```

Servisi:
- Followers Service: http://localhost:8002
- Stakeholders Service: http://localhost:8001
- Neo4j Browser: http://localhost:7474

## 📝 Neo4j Cypher Primeri

```cypher
// Prikaz svih relacija
MATCH (a:User)-[r:FOLLOWS]->(b:User) 
RETURN a.username, b.username, r.followed_at

// Top pratioci (najpraćeniji korisnici)
MATCH (u:User)<-[:FOLLOWS]-(follower)
RETURN u.username, COUNT(follower) as followers_count
ORDER BY followers_count DESC

// Uzajamno praćenje
MATCH (a:User)-[:FOLLOWS]->(b:User)-[:FOLLOWS]->(a)
RETURN a.username, b.username

// Preporuke za korisnika
MATCH (user:User {user_id: 1})-[:FOLLOWS]->()-[:FOLLOWS]->(recommended:User)
WHERE NOT (user)-[:FOLLOWS]->(recommended) AND recommended.user_id <> 1
RETURN recommended.username, COUNT(*) as mutual_connections
ORDER BY mutual_connections DESC
```

## ✅ KT2 Zahtevi - Implementirano

### 1. Dokument NoSQL baza (1 poen) ✅
- **Neo4j** - Grafna NoSQL baza podataka
- Idealna za modelovanje relacija praćenja između korisnika
- Omogućava efikasne graph upite za preporuke i analitiku

### 2. Follower Microservice (2 poena) ✅
Potpuno nezavisan mikroservis implementiran sa:
- FastAPI framework
- Neo4j grafna baza
- RESTful API arhitektura
- Docker kontejnerizacija

### 2.1 Praćenje korisnika ✅
**Implementirano:**
- `POST /api/followers/follow` - Korisnik prati drugog korisnika
- `POST /api/followers/unfollow` - Prestanak praćenja
- `GET /api/followers/is-following/{follower_id}/{following_id}` - Provera statusa

**Tehnička realizacija:**
```cypher
// Neo4j relacija
(User:follower)-[:FOLLOWS {followed_at: datetime}]->(User:following)
```

### 2.2 Čitanje blogova samo praćenih korisnika ✅
**Implementirano:**
- `GET /api/followers/can-read-blog/{reader_id}/{blog_author_id}` - Provera dozvole za čitanje
- `GET /api/followers/accessible-blogs/{user_id}` - Lista dostupnih blogova

**Pravilo:** Korisnik može čitati blogove samo ako:
1. Čita sopstvene blogove, ILI
2. Prati autora bloga

**Integracija sa Blog servisom:**
```python
# Blog servis poziva pre prikazivanja bloga:
response = requests.get(f"http://followers-service:8002/api/followers/can-read-blog/{reader_id}/{author_id}")
if not response.json()["can_read"]:
    raise HTTPException(403, "Morate zapratiti autora da biste čitali blog")
```

### 2.3 Preporuke za praćenje ✅
**Implementirano:**
- `GET /api/followers/recommendations/{user_id}?limit=10` - Pametne preporuke

**Algoritam preporuka (Graph-based):**
```cypher
// Preporučuje korisnike koje prate ljudi koje vi pratite
MATCH (user)-[:FOLLOWS]->()-[:FOLLOWS]->(recommended)
WHERE NOT (user)-[:FOLLOWS]->(recommended) 
  AND recommended <> user
RETURN recommended, COUNT(*) as mutual_connections
ORDER BY mutual_connections DESC
```

**Primer:**
- Vi pratite Anu
- Ana prati Petra i Milicu
- Sistem preporučuje: Petra i Milicu (jer ih prati Ana koju vi pratite)

### 2.4 Neo4j Grafna Baza ✅
**Implementacija:**
- Koristi Neo4j bolt protokol (`bolt://localhost:7687`)
- Graph model sa Node-ovima i Relationships
- Iskorišćava grafne upite za:
  - Preporuke (collaborative filtering)
  - Uzajamne pratioce (mutual followers)
  - Najkraće putanje između korisnika
  - Statistiku pratilaca

**Graph Model:**
```
(:User {user_id, username, created_at})
    |
    | [:FOLLOWS {followed_at}]
    ↓
(:User)
```

### Dodatna funkcionalnost - Komentarisanje blogova ✅
**Implementirano:**
- `GET /api/followers/can-comment-blog/{commenter_id}/{blog_author_id}` - Provera dozvole
- `GET /api/followers/who-can-comment/{blog_author_id}` - Ko može komentarisati

**Pravilo:** Korisnik može komentarisati blog samo ako:
1. Komentariše sopstveni blog, ILI
2. Prati autora bloga

**Integracija sa Blog servisom:**
```python
# Blog servis poziva pre dodavanja komentara:
response = requests.get(f"http://followers-service:8002/api/followers/can-comment-blog/{commenter_id}/{blog_author_id}")
if not response.json()["can_comment"]:
    raise HTTPException(403, "Morate zapratiti autora da biste komentarisali")
```

## 🛠️ Održavanje

### Backup Neo4j podataka
```powershell
docker exec neo4j neo4j-admin dump --database=neo4j --to=/backups/backup.dump
```

### Reset baze
```cypher
MATCH (n) DETACH DELETE n
```

### Monitoring
```bash
curl http://localhost:8002/health
```

## 📞 Support

Za više informacija pogledajte:
- `POKRETANJE.md` - Detaljna uputstva
- `README.md` - Puna dokumentacija
- http://localhost:8002/docs - API dokumentacija

---

## 🔄 Integracija sa Blog Servisom (Detaljan Vodič)

### Scenario 1: Prikaz Blogova (KT2 - 2.2)
**Zahtev:** Blog servis prikazuje samo blogove korisnika koje trenutni korisnik prati.

**Rešenje:**
```python
# U Blog servisu - endpoint za prikaz blogova
@router.get("/blogs")
async def get_blogs(current_user_id: int):
    # Dobavi ID-jeve autora čije blogove korisnik može čitati
    response = requests.get(
        f"http://localhost:8002/api/followers/accessible-blogs/{current_user_id}"
    )
    accessible_authors = response.json()["accessible_authors"]
    
    # Filtriraj blogove samo tih autora
    blogs = db.query(Blog).filter(
        Blog.author_id.in_(accessible_authors)
    ).all()
    
    return blogs
```

### Scenario 2: Provera Pre Čitanja Bloga
**Zahtev:** Zabraniti pristup blogu korisnicima koji ne prate autora.

**Rešenje:**
```python
# U Blog servisu - endpoint za čitanje pojedinačnog bloga
@router.get("/blogs/{blog_id}")
async def read_blog(blog_id: int, current_user_id: int):
    blog = db.query(Blog).filter(Blog.id == blog_id).first()
    
    # Proveri da li korisnik može čitati ovaj blog
    response = requests.get(
        f"http://localhost:8002/api/followers/can-read-blog/{current_user_id}/{blog.author_id}"
    )
    
    if not response.json()["can_read"]:
        raise HTTPException(
            status_code=403,
            detail="Morate zapratiti autora da biste čitali ovaj blog"
        )
    
    return blog
```

### Scenario 3: Dodavanje Komentara (KT2 Zahtev)
**Zahtev:** Korisnik može komentarisati samo ako prati autora bloga.

**Rešenje:**
```python
# U Blog servisu - endpoint za dodavanje komentara
@router.post("/blogs/{blog_id}/comments")
async def add_comment(blog_id: int, comment: str, current_user_id: int):
    blog = db.query(Blog).filter(Blog.id == blog_id).first()
    
    # KT2 Validacija: Proveri da li korisnik može komentarisati
    response = requests.get(
        f"http://localhost:8002/api/followers/can-comment-blog/{current_user_id}/{blog.author_id}"
    )
    
    if not response.json()["can_comment"]:
        raise HTTPException(
            status_code=403,
            detail="Morate zapratiti autora da biste mogli komentarisati"
        )
    
    # Dodaj komentar
    new_comment = Comment(
        blog_id=blog_id,
        user_id=current_user_id,
        content=comment
    )
    db.add(new_comment)
    db.commit()
    
    return new_comment
```

### Scenario 4: Follow Button na Blogu (Frontend)
**Zahtev:** Prikazati "Follow" dugme ako korisnik ne može da vidi blog.

**Rešenje:**
```javascript
// React/Vue/Angular komponenta za blog
async function loadBlog(blogId) {
    const blog = await fetch(`/api/blogs/${blogId}`).then(r => r.json());
    
    // Proveri da li može čitati
    const canRead = await fetch(
        `/api/followers/can-read-blog/${currentUserId}/${blog.author_id}`
    ).then(r => r.json());
    
    if (!canRead.can_read) {
        // Prikaži Follow dugme umesto sadržaja
        showFollowButton(blog.author_id, canRead.reason);
    } else {
        // Prikaži blog sadržaj
        showBlogContent(blog);
    }
}

async function handleFollowClick(authorId) {
    const response = await fetch('http://localhost:8002/api/followers/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            follower_id: currentUserId,
            following_id: authorId
        })
    });
    
    if (response.ok) {
        window.location.reload(); // Osvežava stranicu nakon follow-a
    }
}
```

### Kompletni Tok Interakcije

```
📱 FRONTEND (Korisnik vidi Blog Feed)
    ↓
    GET /api/blogs (Blog Service)
    ↓
📊 BLOG SERVICE
    ↓ poziva
    GET /api/followers/accessible-blogs/{user_id} (Followers Service)
    ↓
🔄 FOLLOWERS SERVICE (Neo4j)
    ↓ vraća
    { accessible_authors: [1, 3, 5, 7] }
    ↓
📊 BLOG SERVICE filtrira blogove
    ↓ vraća
📱 FRONTEND prikazuje samo te blogove

---

📱 KORISNIK klikne na Blog #42
    ↓
    GET /api/blogs/42 (Blog Service)
    ↓
📊 BLOG SERVICE
    ↓ poziva
    GET /api/followers/can-read-blog/{reader_id}/{author_id} (Followers)
    ↓
🔄 FOLLOWERS SERVICE proverava Neo4j
    ↓
    if (reader)-[:FOLLOWS]->(author) OR reader == author:
        ✅ can_read: true
    else:
        ❌ can_read: false
    ↓
📊 BLOG SERVICE
    ↓
    if can_read == false:
        🚫 HTTP 403 Forbidden
    else:
        ✅ Vraća blog sadržaj
    ↓
📱 FRONTEND
    ↓
    if 403:
        Prikaži "Follow" dugme
    else:
        Prikaži blog

---

📱 KORISNIK klikne "Follow"
    ↓
    POST /api/followers/follow (Followers Service)
    ↓
🔄 FOLLOWERS SERVICE
    ↓
    CREATE (user)-[:FOLLOWS {followed_at: now()}]->(author) u Neo4j
    ↓ vraća
    ✅ Success
    ↓
📱 FRONTEND osvežava stranicu
    ↓
    Sada može čitati blog!

---

📱 KORISNIK dodaje komentar
    ↓
    POST /api/blogs/42/comments (Blog Service)
    ↓
📊 BLOG SERVICE
    ↓ poziva
    GET /api/followers/can-comment-blog/{commenter_id}/{author_id}
    ↓
🔄 FOLLOWERS SERVICE proverava Neo4j
    ↓
    if (commenter)-[:FOLLOWS]->(author) OR commenter == author:
        ✅ can_comment: true
    else:
        ❌ can_comment: false
    ↓
📊 BLOG SERVICE
    ↓
    if can_comment == false:
        🚫 HTTP 403 "Morate zapratiti autora"
    else:
        ✅ Dodaje komentar u bazu
    ↓
📱 FRONTEND prikazuje komentar
```

### Česte Greške i Rešenja

#### Greška 1: Race Condition
**Problem:** Korisnik klikne "Follow" ali ne vidi blog odmah.

**Rešenje:** Frontend čeka potvrdu pre reload-a:
```javascript
const response = await followUser(authorId);
if (response.ok) {
    // Sačekaj malo da se propagira
    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.reload();
}
```

#### Greška 2: Timeout
**Problem:** Followers service ne odgovara.

**Rešenje:** Fallback logika u Blog servisu:
```python
try:
    response = requests.get(
        f"http://localhost:8002/api/followers/can-read-blog/{reader_id}/{author_id}",
        timeout=3.0
    )
    can_read = response.json()["can_read"]
except:
    # Ako Followers service nije dostupan, dozvoli pristup
    can_read = True  # Ili False, zavisno od politike
```
