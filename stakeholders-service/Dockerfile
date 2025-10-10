# Koristimo Python 3.11 slim image
FROM python:3.11-slim

# Postavljamo radni direktorijum
WORKDIR /app

# Kopiramo requirements.txt
COPY requirements.txt .

# Instaliramo Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Kopiramo aplikaciju
COPY app/ ./app/

# Izlažemo port 8001
EXPOSE 8001

# Komanda za pokretanje aplikacije
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
