package main

import (
	"log"
	"os"
	"tours-service/config"
	"tours-service/database"
	"tours-service/grpc"
	"tours-service/routes"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq" // PostgreSQL driver
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize configuration
	cfg := config.LoadConfig()

	// Initialize database
	db := database.InitDB(cfg)
	defer db.Close()

	// Initialize gRPC client for purchases service
	log.Printf("[gRPC] Connecting to Purchases service at %s", cfg.PurchasesGRPCAddr)

	// Start gRPC server in goroutine
	go func() {
		grpcPort := cfg.GRPCPort
		if grpcPort == "" {
			grpcPort = "50052"
		}
		log.Printf("[gRPC] Starting Tours gRPC server on port %s", grpcPort)
		if err := grpc.StartGRPCServer(db, grpcPort, cfg.PurchasesGRPCAddr); err != nil {
			log.Fatalf("Failed to start gRPC server: %v", err)
		}
	}()

	// Initialize Gin router
	r := gin.Default()

	// Setup routes
	routes.SetupRoutes(r, db, cfg)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8005"
	}

	log.Printf("[HTTP] Tours service starting on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
