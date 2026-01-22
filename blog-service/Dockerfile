FROM golang:1.19-alpine

WORKDIR /app

# Install git (needed for go mod download)
RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o blog-service .

CMD ["./blog-service"]
