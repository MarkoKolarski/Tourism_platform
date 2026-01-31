FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git and protobuf compiler
RUN apk add --no-cache git protobuf protobuf-dev

# Install protoc-gen-go and protoc-gen-go-grpc
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Create a directory for the service that matches the module name
RUN mkdir -p tours-service
WORKDIR /app/tours-service

# Copy go mod and sum files into the service directory
COPY tours-service/go.mod tours-service/go.sum ./

# Download dependencies
RUN go mod download
RUN go mod verify

# Copy the rest of the source code
COPY tours-service/ .

# Copy proto files
COPY proto /proto

# Create the output directory for generated proto files
RUN mkdir -p proto/tours

# Generate protobuf files into the correct subdirectory
RUN protoc --go_out=proto/tours --go_opt=paths=source_relative \
    --go-grpc_out=proto/tours --go-grpc_opt=paths=source_relative \
    -I/proto /proto/tours.proto

# Build the application from within the service directory
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/tours-service/main .

EXPOSE 8005
EXPOSE 50052

CMD ["./main"]
