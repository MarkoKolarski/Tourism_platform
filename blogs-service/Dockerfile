# Multi-stage build for Go service with gRPC
FROM golang:1.23-alpine as builder

WORKDIR /app

# Install protobuf compiler and required tools
RUN apk add --no-cache git protobuf protobuf-dev

# Install Go protobuf plugins with compatible versions
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.31.0 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0

# Copy go mod files from correct context
COPY blogs-service/go.mod blogs-service/go.sum ./

# Add gRPC dependencies before go mod download
RUN go get google.golang.org/grpc@v1.58.3 && \
    go get google.golang.org/protobuf@v1.31.0

RUN go mod download

# Copy proto files from parent context
COPY proto/followers.proto /proto/followers.proto

# Create proto output directory
RUN mkdir -p proto/followers

# Generate Go gRPC code
RUN protoc -I/proto \
    --go_out=proto/followers \
    --go_opt=paths=source_relative \
    --go-grpc_out=proto/followers \
    --go-grpc_opt=paths=source_relative \
    /proto/followers.proto

# Copy application source
COPY blogs-service/ .

# Run go mod tidy to clean up dependencies
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o blogs-service .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/blogs-service .

EXPOSE 8004

CMD ["./blogs-service"]
