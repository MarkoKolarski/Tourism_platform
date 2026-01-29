package routes

import (
	"database/sql"
	"net/http"
	"strconv"
	"tour-service/config"
	"tour-service/middleware"
	"tour-service/models"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine, db *sql.DB, cfg *config.Config) {
	api := r.Group("/api/v1")

	// Public routes
	api.GET("/health", healthCheck)
	api.GET("/tours", getTours(db))
	api.GET("/tours/:id", getTour(db))

	// Protected routes
	protected := api.Use(middleware.AuthMiddleware(cfg))
	protected.POST("/tours", createTour(db))
	protected.PUT("/tours/:id", updateTour(db))
	protected.DELETE("/tours/:id", deleteTour(db))
}

func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "tour-service"})
}

func getTours(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tours, err := models.GetAllTours(db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tours"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"tours": tours})
	}
}

func getTour(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idParam := c.Param("id")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
			return
		}

		tour, err := models.GetTourByID(db, id)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "Tour not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tour"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"tour": tour})
	}
}

func createTour(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.CreateTourRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userIDInterface, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
			return
		}

		var authorID int
		switch v := userIDInterface.(type) {
		case float64:
			authorID = int(v)
		case string:
			var err error
			authorID, err = strconv.Atoi(v)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
				return
			}
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID type"})
			return
		}

		tour, err := models.CreateTour(db, req, authorID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tour"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"tour": tour})
	}
}

func updateTour(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idParam := c.Param("id")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
			return
		}

		var req models.UpdateTourRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userIDInterface, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
			return
		}

		var authorID int
		switch v := userIDInterface.(type) {
		case float64:
			authorID = int(v)
		case string:
			var err error
			authorID, err = strconv.Atoi(v)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
				return
			}
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID type"})
			return
		}

		tour, err := models.UpdateTour(db, id, req, authorID)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "Tour not found or not authorized"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tour"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"tour": tour})
	}
}

func deleteTour(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idParam := c.Param("id")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
			return
		}

		userIDInterface, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
			return
		}

		var authorID int
		switch v := userIDInterface.(type) {
		case float64:
			authorID = int(v)
		case string:
			var err error
			authorID, err = strconv.Atoi(v)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
				return
			}
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID type"})
			return
		}

		err = models.DeleteTour(db, id, authorID)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "Tour not found or not authorized"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete tour"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Tour deleted successfully"})
	}
}
