FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including protobuf compiler
RUN apt-get update && apt-get install -y \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from purchases-service directory
COPY purchases-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy proto files from root and generate Python code
COPY proto /proto
RUN mkdir -p proto
RUN touch proto/__init__.py

# Generate purchases proto files first (what this service implements)
RUN python -m grpc_tools.protoc \
    -I/proto \
    --python_out=proto \
    --grpc_python_out=proto \
    /proto/purchases.proto

# Generate tours proto files (what this service calls)
RUN python -m grpc_tools.protoc \
    -I/proto \
    --python_out=proto \
    --grpc_python_out=proto \
    /proto/tours.proto

# Fix import paths in generated files
RUN sed -i 's/^import purchases_pb2/from . import purchases_pb2/' proto/purchases_pb2_grpc.py || true
RUN sed -i 's/^import tours_pb2/from . import tours_pb2/' proto/tours_pb2_grpc.py || true

# Copy purchases-service application
COPY purchases-service/ .

EXPOSE 8003
EXPOSE 50053

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
