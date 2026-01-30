# Multi-stage build for Python service with gRPC
FROM python:3.11-slim as builder

WORKDIR /app

# Install protobuf compiler and tools
RUN apt-get update && apt-get install -y \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY followers-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy proto files from parent context
COPY proto/followers.proto /proto/followers.proto

# Generate Python gRPC code
RUN python -m grpc_tools.protoc \
    -I/proto \
    --python_out=/app \
    --grpc_python_out=/app \
    /proto/followers.proto

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
COPY followers-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy generated proto files
COPY --from=builder /app/followers_pb2.py /app/
COPY --from=builder /app/followers_pb2_grpc.py /app/

# Copy application code
COPY followers-service/app/ ./app/

# Expose ports (8002 for FastAPI, 50051 for gRPC)
EXPOSE 8002 50051

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
