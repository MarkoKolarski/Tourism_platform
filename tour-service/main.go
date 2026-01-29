package main

import (
	"log"
	"os"
	"tour-service/config"
	"tour-service/database"
	"tour-service/routes"

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

	// Initialize Gin router
	r := gin.Default()

	// Setup routes
	routes.SetupRoutes(r, db, cfg)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8005"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
