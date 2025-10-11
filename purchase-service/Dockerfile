FROM python:3.11-slim

WORKDIR /app

# Instalacija dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopiranje aplikacije
COPY . .

# Ekspozicija porta
EXPOSE 8003

# Pokretanje aplikacije
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
