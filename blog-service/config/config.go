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
        Port:       getEnv("PORT", "8082"),
        DBHost:     getEnv("DB_HOST", "localhost"),
        DBPort:     getEnv("DB_PORT", "5432"),
        DBUser:     getEnv("DB_USER", "blog_user"),
        DBPassword: getEnv("DB_PASSWORD", "blog_password"),
        DBName:     getEnv("DB_NAME", "blog_db"),
        JWTSecret:  getEnv("JWT_SECRET", "your-secret-key"),
    }
}

func getEnv(key, defaultValue string) string {
    if value, exists := os.LookupEnv(key); exists {
        return value
    }
    return defaultValue
}