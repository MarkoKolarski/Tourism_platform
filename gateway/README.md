# Tourism Platform API Gateway

API Gateway za Tourism Platform mikroservisnu aplikaciju implementiran sa Nginx-om kao reverse proxy.

## 🌐 Funkcionalnosti

### Centralizovani pristup
- **Jedina tačka ulaska** u sistem - port `80`
- **Load balancing** između mikroservisa
- **CORS handling** za frontend aplikacije
- **Health checks** za sve servise

### Routing
```
Frontend:           localhost/              → frontend:3000
Users API:          localhost/api/v1/users  → stakeholders-service:8001/api/users
Locations:          localhost/api/v1/locations → stakeholders-service:8001/api/locations
Followers:          localhost/api/v1/followers → followers-service:8002/api/followers
Purchase:           localhost/api/v1/purchase → purchase-service:8003/api/purchase
```

**URL Mapiranje:**
Gateway dodaje verziju (`v1`) u URL-ove za eksterne klijente, ali interno mapira na stvarne endpoint-e mikroservisa koji koriste `/api` prefix.

### Security & Performance
- **Static content caching** (JS, CSS, images)
- **Gzip compression** za bolje performanse
- **Request timeout** konfiguracija
- **Access logging** za monitoring

## 🏗️ Arhitektura

```
Internet
   ↓
┌─────────────────┐
│   API Gateway   │ ← Port 80 (jedini izložen port)
│   (Nginx)       │
└─────────────────┘
   ↓ ↓ ↓ ↓
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ UI  │ │Users│ │Folw │ │Shop │
│:3000│ │:8001│ │:8002│ │:8003│
└─────┘ └─────┘ └─────┘ └─────┘
```

## 🚀 Pokretanje

```bash
# Pokretanje celog sistema
docker-compose up -d

# Pristup aplikaciji
http://localhost

# Health checks
http://localhost/health
http://localhost/health/stakeholders
http://localhost/health/followers
http://localhost/health/purchase
```

## 📊 Health Monitoring

Gateway pruža health check endpoint-e:

- `GET /health` - Gateway status
- `GET /health/stakeholders` - Stakeholders service status
- `GET /health/followers` - Followers service status  
- `GET /health/purchase` - Purchase service status

## 🔧 Konfiguracija

Gateway konfiguracija se nalazi u `nginx.conf` fajlu sa:

- **Upstream servers** definicije
- **Load balancing** strategije
- **CORS policies**
- **Caching rules**
- **Timeout values**

## 🔒 Sigurnost

- Mikroservisi nisu direktno dostupni spolja
- CORS je konfigurisan za frontend
- Request validation i timeout-ovi
- Access logging za audit trail

## 📈 Prednosti

1. **Centralizacija** - jedan endpoint za sve
2. **Sigurnost** - mikroservisi su izolovani
3. **Skalabilnost** - lako dodavanje novih servisa
4. **Monitoring** - centralizovano logovanje
5. **Performance** - caching i compression