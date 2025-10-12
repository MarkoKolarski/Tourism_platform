# 🚀 Quick Start Guide - Tourism Platform Frontend

## Brzo Pokretanje

### 1. Instalacija
```bash
cd frontend
npm install
```

### 2. Pokretanje Backend Servisa (Docker)
```bash
# Iz root folder-a projekta
docker-compose up -d
```

Proveri da li servisi rade:
- Stakeholders: http://localhost:8001/docs
- Followers: http://localhost:8002/docs
- Purchase: http://localhost:8003/docs

### 3. Pokretanje Frontend-a
```bash
cd frontend
npm run dev
```

Frontend: http://localhost:5173

## 📋 Testiranje Funkcionalnosti

### 1️⃣ Stakeholders Service (Users)

**Registracija korisnika:**
1. Idi na http://localhost:5173/users
2. Klikni "Otvori Formu"
3. Popuni podatke:
   - Username: `test_user`
   - Email: `test@example.com`
   - Password: `password123`
   - Uloga: Turista
4. Klikni "Registruj Korisnika"

**Pretraga korisnika:**
1. Unesi User ID (npr. 1)
2. Klikni "Pretraži Korisnika"
3. Vidi detalje korisnika

### 2️⃣ Followers Service

**Follow korisnika:**
1. Idi na http://localhost:5173/followers
2. U "Follow Akcije":
   - Follower ID: 1
   - Following ID: 2
3. Klikni "Follow"

**Pregled statistike:**
1. Unesi User ID (npr. 1)
2. Klikni "Učitaj Podatke"
3. Vidi:
   - Broj pratilaca
   - Broj praćenih
   - Lista pratilaca
   - Lista praćenih
   - Preporuke za praćenje

### 3️⃣ Purchase Service

**Dodavanje u korpu:**
1. Idi na http://localhost:5173/purchase
2. Tab "Shopping Korpa"
3. Popuni formu:
   - Tour ID: 1
   - Naziv: "City Tour"
   - Cena: 100.00
   - Količina: 2
4. Klikni "Dodaj u Korpu"

**Checkout (SAGA Process):**
1. Kad imaš stavke u korpi
2. Klikni "Checkout - SAGA Process"
3. SAGA koraci:
   - ✅ Validate User
   - ✅ Reserve Tours
   - ✅ Process Payment
   - ✅ Generate Tokens
   - ✅ Update Stats
4. Proveri purchase tokene (Tab "Purchase Tokeni")
5. Proveri SAGA transakcije (Tab "SAGA Transakcije")

## 🎯 Demo Scenario (End-to-End)

### Scenario: Korisnik kupuje turu

```
1. REGISTRACIJA
   → Idi na /users
   → Registruj korisnika "marko"
   → Dobij User ID (npr. 1)

2. SOCIAL (FOLLOWERS)
   → Idi na /followers
   → Kreiraj još korisnika u backend-u (ID 2, 3, 4)
   → Follow korisnika 2 i 3
   → Proveri preporuke
   → Vidi statistiku

3. KUPOVINA
   → Idi na /purchase
   → Dodaj Tour #1 (2 osobe)
   → Dodaj Tour #2 (1 osoba)
   → Checkout
   → Vidi purchase tokene
   → Proveri SAGA transakciju

4. VERIFIKACIJA
   → Proveri da li su tokeni aktivni
   → Proveri da li je SAGA status "completed"
   → Proveri steps_completed u transakciji
```

## 🛠️ Troubleshooting

### Problem: Backend ne radi
```bash
# Proveri Docker kontejnere
docker ps

# Restartuj servise
docker-compose restart

# Vidi logs
docker-compose logs -f
```

### Problem: CORS greška
Dodaj u backend servise:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Problem: Port zauzet
```bash
# Promeni port u vite.config.ts
server: {
  port: 3000  // umesto 5173
}
```

## 📊 Backend API Endpoints Reference

### Stakeholders (8001)
```http
POST /api/users/register
GET  /api/users/{user_id}
PUT  /api/users/{user_id}/profile
```

### Followers (8002)
```http
POST /api/followers/follow
POST /api/followers/unfollow
GET  /api/followers/followers/{user_id}
GET  /api/followers/following/{user_id}
GET  /api/followers/stats/{user_id}
GET  /api/followers/recommendations/{user_id}
```

### Purchase (8003)
```http
GET    /api/purchase/cart
POST   /api/purchase/cart/add
DELETE /api/purchase/cart/items/{item_id}
POST   /api/purchase/checkout
GET    /api/purchase/tokens
GET    /api/purchase/transactions
```

## 🎨 Korisni Linkovi

- **Frontend**: http://localhost:5173
- **Stakeholders API Docs**: http://localhost:8001/docs
- **Followers API Docs**: http://localhost:8002/docs
- **Purchase API Docs**: http://localhost:8003/docs

## 💡 Tips

1. **Koristi Browser DevTools** - Network tab za API pozive
2. **Dark Mode** - Automatski se prilagođava sistemu
3. **Responsive** - Testiraj na mobilnom (F12 → Device Toolbar)
4. **State Management** - Refresh stranice resetuje state
5. **Mock Auth** - User ID hardkodovan na 1 za Purchase

## 📞 Support

Ako imaš problema:
1. Proveri da li su svi servisi pokrenuti (`docker ps`)
2. Proveri konzolu u browseru (F12)
3. Proveri backend logs (`docker-compose logs`)
4. Vidi STRUKTURA.md i FRONTEND_README.md za detalje

---

**Happy Coding! 🚀**
