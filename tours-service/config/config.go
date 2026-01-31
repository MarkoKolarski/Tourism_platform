package config

import "os"

type Config struct {
	DBHost              string
	DBPort              string
	DBUser              string
	DBPassword          string
	DBName              string
	JWTSecret           string
	Port                string
	GRPCPort            string
	PurchasesServiceURL string
}

func LoadConfig() *Config {
	return &Config{
		DBHost:              getEnv("DB_HOST", "localhost"),
		DBPort:              getEnv("DB_PORT", "5432"),
		DBUser:              getEnv("DB_USER", "postgres"),
		DBPassword:          getEnv("DB_PASSWORD", ""),
		DBName:              getEnv("DB_NAME", "tourism_tour"),
		JWTSecret:           getEnv("JWT_SECRET", "dev-secret-key"),
		Port:                getEnv("PORT", "8005"),
		GRPCPort:            getEnv("GRPC_PORT", "50052"),
		PurchasesServiceURL: getEnv("PURCHASES_SERVICE_URL", "http://localhost:8003"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
