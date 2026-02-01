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

# Copy proto files from root proto directory
COPY proto /proto

# Create the output directory for generated proto files
RUN mkdir -p proto/tours
RUN mkdir -p proto/purchases

# Generate protobuf files for tours service (server)
RUN protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    --go_opt=Mtours.proto=tours-service/proto/tours \
    --go-grpc_opt=Mtours.proto=tours-service/proto/tours \
    -I/proto /proto/tours.proto

# Generate protobuf files for purchases service (client)
RUN protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    --go_opt=Mpurchases.proto=tours-service/proto/purchases \
    --go-grpc_opt=Mpurchases.proto=tours-service/proto/purchases \
    -I/proto /proto/purchases.proto

# Move generated files to the correct locations
RUN mv tours.pb.go tours_grpc.pb.go proto/tours/ 2>/dev/null || true
RUN mv purchases.pb.go purchases_grpc.pb.go proto/purchases/ 2>/dev/null || true

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
