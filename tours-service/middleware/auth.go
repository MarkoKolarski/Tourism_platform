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
		log.Printf("[AuthMiddleware] Authorization header: %s", authHeader)
		if authHeader == "" {
			log.Println("[AuthMiddleware] Missing Authorization header")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		bearerToken := strings.Split(authHeader, " ")
		if len(bearerToken) != 2 || bearerToken[0] != "Bearer" {
			log.Printf("[AuthMiddleware] Invalid authorization header format: %v", bearerToken)
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

		var userID interface{}
		var email interface{}
		var username string
		var role string

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			log.Printf("[AuthMiddleware] JWT claims: %+v", claims)

			// Try to get user_id from "user_id" or "sub"
			if uid, ok := claims["user_id"]; ok {
				userID = uid
			} else if sub, ok := claims["sub"]; ok {
				userID = sub
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
		}

		// If role is missing, fetch from stakeholders DB
		if role == "" && userID != nil && stakeholdersDB != nil {
			var userIDInt int
			switch v := userID.(type) {
			case float64:
				userIDInt = int(v)
			case int:
				userIDInt = v
			case string:
				var err error
				userIDInt, err = strconv.Atoi(v)
				if err != nil {
					log.Printf("[AuthMiddleware] Invalid user_id format: %v", v)
					c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user_id in token"})
					c.Abort()
					return
				}
			default:
				log.Printf("[AuthMiddleware] Unknown user_id type: %T", userID)
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user_id in token"})
				c.Abort()
				return
			}

			log.Printf("[AuthMiddleware] Fetching role from stakeholders DB for user_id: %d", userIDInt)
			err := stakeholdersDB.QueryRow("SELECT role FROM users WHERE id = $1", userIDInt).Scan(&role)
			if err != nil {
				log.Printf("[AuthMiddleware] Failed to fetch role from DB for user_id %v: %v", userIDInt, err)
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to fetch user role"})
				c.Abort()
				return
			}
			log.Printf("[AuthMiddleware] Role fetched from DB: %s", role)
		}

		if userID != nil {
			c.Set("user_id", userID)
		}
		if email != nil {
			c.Set("email", email)
		}
		if username != "" {
			c.Set("username", username)
		}
		if role != "" {
			c.Set("role", role)
		} else {
			log.Println("[AuthMiddleware] Role not found in token or DB")
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
