# Tourism Platform - Complete Observability Stack

Kompletno observability rešenje za Tourism Platform mikroservisnu aplikaciju implementirano sa OpenTelemetry, Prometheus, Grafana i Jaeger.

## 🏗️ Arhitektura

```
                    Internet
                       ↓
              ┌─────────────────┐
              │   API Gateway   │ ← Port 80 (Nginx)
              │                 │
              └─────────────────┘
                 ↓ ↓ ↓ ↓ ↓
    ┌─────────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
    │Frontend │ │Users│ │Folw │ │Shop │ │Neo4j│
    │   UI    │ │ API │ │ API │ │ API │ │ DB  │
    │  :3000  │ │:8001│ │:8002│ │:8003│ │:7687│
    └─────────┘ └─────┘ └─────┘ └─────┘ └─────┘
                       │                     
                   Observability
                       │
    ┌─────────────────────────────────────────────┐
    │           Monitoring Stack                   │
    ├─────────────────────────────────────────────┤
    │ 📊 Grafana (4000) │ 📈 Prometheus (9090)   │
    │ 🔍 Jaeger (16686) │ 📝 JSON Logging        │
    │ 💻 Node-Exp(9100) │ 🐳 cAdvisor (8080)     │
    └─────────────────────────────────────────────┘
```

## 🚀 Pokretanje

### Brzo pokretanje sa PowerShell scriptom:
```powershell
.\start-with-monitoring.ps1
```

### Manualno pokretanje:
```bash
# 1. Pokrenite glavni sistem
docker-compose up -d

# 2. Pokrenite monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# 3. Proverite status
docker-compose -f docker-compose.monitoring.yml ps
```

## 🌐 Pristp UI-jima

- **API Gateway**: http://localhost:80
- **Jaeger UI**: http://localhost:16686
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:4000 (admin/admin)
- **cAdvisor**: http://localhost:8080
- **Node Exporter**: http://localhost:9100/metrics

## 📊 Observability Pillar

### 1. 🔍 Distributed Tracing (OpenTelemetry + Jaeger)

**Stakeholders-service** je instrumentovan sa:
- **FastAPI auto-instrumentation** - automatsko praćenje HTTP requestova
- **SQLAlchemy instrumentation** - praćenje database querija  
- **Custom spans** - ručno dodavanje trace informacija
- **Trace correlation** - povezivanje sa logovima

**Features:**
- End-to-end request praćenje kroz mikroservise
- Performance bottleneck identifikacija
- Error tracking i debugging
- Service dependency mapping

### 2. 📈 Metrics Collection (Prometheus + Grafana)

**Metrike koje se prikupljaju:**
- **Infrastructure metrike** (CPU, Memory, Disk, Network)
- **Container metrike** (Docker stats)
- **HTTP metrike** (request count, duration, status codes)
- **Database metrike** (connection pool, query duration)
- **Custom business metrike** (user registrations, login attempts)

**Data Sources:**
- **node-exporter** - host system metrike
- **cAdvisor** - Docker container metrike
- **Stakeholders-service** - application metrike

### 3. 📝 Structured Logging (JSON)

**Stakeholders-service** koristi:
- **JSON structured logging** - direktno u fajlove
- **Trace correlation** - svaki log ima trace_id i span_id
- **Multiple log levels** (DEBUG, INFO, WARNING, ERROR)
- **Request/Response logging** sa timing informacijama
- **Error logging** sa stack traces

**Log Format:**
```json
{
  "timestamp": "2025-10-12T16:30:45.123Z",
  "level": "INFO",
  "service": "stakeholders-service",
  "trace_id": "a1b2c3d4e5f6",
  "span_id": "1a2b3c4d",
  "message": "User registration successful",
  "extra": {
    "user_id": 123,
    "email": "user@example.com",
    "response_time": 0.045
  }
}
```

## 🛠️ Tehnička Implementacija

### Struktura projekta:
```
├── docker-compose.monitoring.yml      # Monitoring services
├── monitoring/
│   ├── prometheus/
│   │   └── prometheus.yml             # Prometheus config
│   └── grafana/
│       ├── datasources/
│       │   └── datasources.yml        # Data sources
│       └── dashboards/
│           └── dashboard.yml          # Dashboard config
├── stakeholders-service/
│   └── app/
│       ├── observability.py           # Observability setup
│       └── main.py                    # FastAPI app sa instrumentacijom
└── start-with-monitoring.ps1          # PowerShell startup script
```

### Observability konfiguracija u stakeholders-service:

**OpenTelemetry Setup:**
```python
# Jaeger exporter konfiguracija
jaeger_exporter = JaegerExporter(
    agent_host_name="jaeger",
    agent_port=6831,
)

# FastAPI auto-instrumentation
FastAPIInstrumentor.instrument_app(app)
SQLAlchemyInstrumentor().instrument(engine=engine)
```

**Structured Logging:**
```python
# JSON formatter sa trace correlation
class TraceFormatter(logging.Formatter):
    def format(self, record):
        span = trace.get_current_span()
        trace_id = format(span.get_span_context().trace_id, "032x")
        span_id = format(span.get_span_context().span_id, "016x")
        
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "service": "stakeholders-service",
            "trace_id": trace_id,
            "span_id": span_id,
            "message": record.getMessage()
        }
        return json.dumps(log_data)
```

## 📋 Monitoring Capabilities

### 1. Performance Monitoring
- Request latency tracking
- Database query performance
- Resource utilization monitoring
- Error rate monitoring

### 2. Business Intelligence
- User registration trends
- API usage patterns
- Service health metrics
- Custom business KPIs

### 3. Infrastructure Oversight
- Host machine resources
- Container performance
- Network traffic
- Storage utilization

### 4. Debugging & Troubleshooting
- Distributed trace analysis
- Error correlation across services
- Performance bottleneck identification
- Log correlation sa traces

## 🎯 Key Benefits

✅ **Complete Visibility** - End-to-end praćenje kroz ceo sistem
✅ **Performance Optimization** - Identifikacija bottlenecks-a
✅ **Proactive Monitoring** - Alerting na probleme
✅ **Debugging Support** - Brža identifikacija uzroka problema
✅ **Business Intelligence** - Insights iz application metrika
✅ **Scalability Insights** - Resource planning i optimization

## 🔧 Maintenance

### Log Rotation
Stakeholders-service automatski rotira logove:
- Maksimalna veličina: 10MB
- Backup count: 5 fajlova
- Lokacija: `/app/logs/stakeholders.log`

### Metrics Retention
- Prometheus: 15 dana retention
- Grafana: perzistentni dashboards
- Jaeger: 24h trace retention

### Health Checks
Svi servisi imaju health check endpoints:
- `/health` - basic health check
- `/health/stakeholders` - stakeholders service health
- `/metrics` - Prometheus metrics endpoint

---

**Observability Stack je spreman za production use! 🚀**