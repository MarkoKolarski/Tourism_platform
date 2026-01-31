FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including protobuf compiler
RUN apt-get update && apt-get install -y \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from purchases-service directory
COPY purchases-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy proto files and generate Python code
COPY proto /proto
RUN mkdir -p proto
RUN touch proto/__init__.py
RUN python -m grpc_tools.protoc \
    -I/proto \
    --python_out=proto \
    --grpc_python_out=proto \
    /proto/tours.proto || echo "Proto generation failed, will use fallback"

# Generate purchases proto files
RUN python -m grpc_tools.protoc \
    -I/proto \
    --python_out=proto \
    --grpc_python_out=proto \
    /proto/purchases.proto || echo "Purchases proto generation failed"

# Copy purchases-service application
COPY purchases-service/ .

EXPOSE 8003
EXPOSE 50053

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
