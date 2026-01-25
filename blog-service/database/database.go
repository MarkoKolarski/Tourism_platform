package database

import (
	"blog-service/models"
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() (*gorm.DB, error) {
	// Učitaj environment varijable
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "postgres"
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "password"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "blog_db"
	}

	// Kreiraj connection string
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		dbHost, dbUser, dbPassword, dbName, dbPort,
	)

	// Konfiguriši GORM logger
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold: time.Second,
			LogLevel:      logger.Silent,
			Colorful:      true,
		},
	)

	// Otvori konekciju
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: newLogger,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// PING bazu
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	DB = db
	log.Println(" Database connection established")
	return DB, nil
}

func MigrateModels(db *gorm.DB) error {
	log.Println("Starting database migration...")

	err := db.Exec(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).Error
	if err != nil {
		return fmt.Errorf("failed to create pgcrypto extension: %w", err)
	}

	// Auto migriraj modele
	err = db.AutoMigrate(
		&models.Blog{},
		&models.Comment{},
		&models.BlogLike{},
		&models.User{},
	)
	if err != nil {
		return fmt.Errorf("failed to migrate models: %w", err)
	}

	db.Exec(`CREATE INDEX IF NOT EXISTS idx_blog_created_at ON blogs(created_at DESC)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_comment_created_at ON comments(created_at DESC)`)

	// Unique constraint za likes - jedan user može lajkovati blog samo jednom
	db.Exec(`
		DO $$ 
		 BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint 
				WHERE conname = 'unique_blog_user_like'
			) THEN
				ALTER TABLE blog_likes 
				ADD CONSTRAINT unique_blog_user_like 
				UNIQUE (blog_id, user_id);
			END IF;
		END $$;
	`)

	log.Println("Database migration completed!")
	return nil
}
