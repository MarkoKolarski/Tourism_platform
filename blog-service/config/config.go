package config

import (
    "os"
)

type Config struct {
    Port         string
    DBHost       string
    DBPort       string
    DBUser       string
    DBPassword   string
    DBName       string
    JWTSecret    string
}

func LoadConfig() Config {
    return Config{
        Port:       getEnv("PORT", "8004"),
        DBHost:     getEnv("DB_HOST", "localhost"),
        DBPort:     getEnv("DB_PORT", "5432"),
        DBUser:     getEnv("DB_USER", "postgres"),  //"blog_user"
        DBPassword: getEnv("DB_PASSWORD", "ftn"),
        DBName:     getEnv("DB_NAME", "tourism_blog"), //blog_db
        JWTSecret:  getEnv("JWT_SECRET", "dev-secret-key-change-this-in-production"),  //your-secret-key
    }
}

func getEnv(key, defaultValue string) string {
    if value, exists := os.LookupEnv(key); exists {
        return value
    }
    return defaultValue
}