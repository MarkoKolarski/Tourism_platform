package database

import (
	"database/sql"
	"fmt"
	"log"
	"tour-service/config"
	"tour-service/models"
)

func InitDB(cfg *config.Config) *sql.DB {
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	// Create tables
	if err := models.CreateToursTable(db); err != nil {
		log.Fatal("Failed to create tours table:", err)
	}

	log.Println("Database connected successfully")
	return db
}
