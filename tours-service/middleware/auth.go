package middleware

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"tours-service/config"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
)

// NewAuthMiddleware returns an AuthMiddleware with DB access
func NewAuthMiddleware(cfg *config.Config, db *sql.DB) gin.HandlerFunc {
	// Create a connection to stakeholders DB for user role lookup
	stakeholdersDSN := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, "tourism_stakeholders")

	stakeholdersDB, err := sql.Open("postgres", stakeholdersDSN)
	if err != nil {
		log.Printf("[AuthMiddleware] Failed to connect to stakeholders DB: %v", err)
	} else {
		log.Println("[AuthMiddleware] Connected to stakeholders DB for role lookup")
	}

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		bearerToken := strings.Split(authHeader, " ")
		if len(bearerToken) != 2 || bearerToken[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token, err := jwt.Parse(bearerToken[1], func(token *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			log.Printf("[AuthMiddleware] Invalid token: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		var userIDStr string
		var email interface{}
		var username string
		var role string

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			// Get user_id from "sub" field (now expected as string)
			if sub, ok := claims["sub"].(string); ok {
				userIDStr = sub
			} else {
				log.Printf("[AuthMiddleware] Invalid or missing 'sub' field in token: %v", claims["sub"])
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user_id in token"})
				c.Abort()
				return
			}

			email = claims["email"]

			if un, ok := claims["username"].(string); ok {
				username = un
			}

			if r, ok := claims["role"].(string); ok && r != "" {
				role = r
				log.Printf("[AuthMiddleware] Role found in token: %s", role)
			}
		} else {
			log.Println("[AuthMiddleware] JWT claims not found or not MapClaims")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		// If role is missing, fetch from stakeholders DB
		if role == "" && userIDStr != "" && stakeholdersDB != nil {
			userIDInt, err := strconv.Atoi(userIDStr)
			if err != nil {
				log.Printf("[AuthMiddleware] Invalid user_id format: %s", userIDStr)
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user_id format"})
				c.Abort()
				return
			}

			log.Printf("[AuthMiddleware] Fetching role from stakeholders DB for user_id: %d", userIDInt)
			err = stakeholdersDB.QueryRow("SELECT role FROM users WHERE id = $1", userIDInt).Scan(&role)
			if err != nil {
				log.Printf("[AuthMiddleware] Failed to fetch role from DB for user_id %s: %v", userIDStr, err)
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to fetch user role"})
				c.Abort()
				return
			}
			log.Printf("[AuthMiddleware] Role fetched from DB: %s", role)
		}

		// Set context values
		c.Set("user_id", userIDStr) // Store as string
		if email != nil {
			c.Set("email", email)
		}
		if username != "" {
			c.Set("username", username)
		}
		if role != "" {
			c.Set("role", role)
		}

		c.Next()
	}
}

func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("role")
		log.Printf("[RequireRole] Required: %s, Found: %v (exists: %v)", role, userRole, exists)
		if !exists {
			log.Println("[RequireRole] Role not found in token context")
			c.JSON(http.StatusForbidden, gin.H{"error": "Role not found in token"})
			c.Abort()
			return
		}

		if userRole != role {
			log.Printf("[RequireRole] Insufficient permissions: required %s, got %v", role, userRole)
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}
