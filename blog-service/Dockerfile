FROM golang:1.23-alpine

WORKDIR /app

# Install git (needed for go mod download)
RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o blog-service .

EXPOSE 8004

CMD ["./blog-service"]
