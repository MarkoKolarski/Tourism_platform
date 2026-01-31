package routes

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"tours-service/config"
	"tours-service/grpc"
	"tours-service/handlers"
	"tours-service/middleware"
	"tours-service/models"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine, db *sql.DB, cfg *config.Config) {
	root := r.Group("/")

	// Public routes
	root.GET("/health", healthCheck)
	root.GET("/tours", getTours(db))
	root.GET("/tours/:id", getTour(db))
	root.GET("/tours/:id/keypoints", getKeyPoints(db))
	root.GET("/tours/:id/keypoints/first", getFirstKeyPoint(db))
	root.GET("/tours/:id/reviews", getReviews(db))
	root.GET("/tours/:id/travel-times", getTravelTimes(db))
	root.GET("/tours/for-tourists", getToursForTourists(db))
	root.GET("/tours/status/:status", getToursByStatus(db))

	// Initialize gRPC client for purchases service
	purchasesClient := grpc.NewPurchasesGRPCClient(cfg.PurchasesGRPCAddr)

	// Initialize tour execution handler
	executionHandler := handlers.NewTourExecutionHandler(db, purchasesClient)

	// Protected routes - require authentication
	protected := root.Use(middleware.NewAuthMiddleware(cfg, db))

	// Tourist routes with purchase verification - secure endpoints
	protected.POST("/tours/:id/start", executionHandler.StartTour)
	protected.GET("/executions/active", executionHandler.GetActiveExecution)
	protected.PUT("/executions/:execution_id/location", executionHandler.UpdateLocation)
	protected.POST("/executions/:execution_id/keypoints/:keypoint_id/complete", executionHandler.CompleteKeyPoint)
	protected.POST("/executions/:execution_id/complete", executionHandler.CompleteTour)
	protected.POST("/executions/:execution_id/abandon", executionHandler.AbandonTour)
	protected.POST("/tours/:id/reviews", createReview(db))

	// VODIC routes
	vodic := protected.Use(middleware.RequireRole("VODIC"))
	vodic.GET("/tours/my", getMyTours(db))
	vodic.POST("/tours", createTour(db))
	vodic.PUT("/tours/:id", updateTour(db))
	vodic.DELETE("/tours/:id", deleteTour(db))
	vodic.POST("/tours/:id/keypoints", createKeyPoint(db))
	vodic.PUT("/tours/:id/keypoints/:kpid", updateKeyPoint(db))
	vodic.DELETE("/tours/:id/keypoints/:kpid", deleteKeyPoint(db))
	vodic.POST("/tours/:id/travel-times", createTravelTime(db))
	vodic.DELETE("/tours/:id/travel-times/:ttid", deleteTravelTime(db))
	vodic.POST("/tours/:id/publish", publishTour(db))
	vodic.POST("/tours/:id/archive", archiveTour(db))
}

func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "tours-service"})
}

func getTours(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Println("[getTours] Fetching all tours...")
		tours, err := models.GetAllTours(db)
		if err != nil {
			log.Printf("[getTours] Error fetching tours: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tours", "details": err.Error()})
			return
		}

		log.Printf("[getTours] Successfully fetched %d tours", len(tours))
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
		log.Println("[createTour] Called")
		var req models.CreateTourRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("[createTour] Invalid request body: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userIDInterface, exists := c.Get("user_id")
		log.Printf("[createTour] user_id from context: %v (exists: %v)", userIDInterface, exists)
		if !exists {
			log.Println("[createTour] User ID not found in token")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
			return
		}

		roleInterface, roleExists := c.Get("role")
		log.Printf("[createTour] role from context: %v (exists: %v)", roleInterface, roleExists)
		if !roleExists {
			log.Println("[createTour] Role not found in token")
			c.JSON(http.StatusForbidden, gin.H{"error": "Role not found in token"})
			return
		}

		if roleInterface != "VODIC" {
			log.Printf("[createTour] Insufficient permissions: required VODIC, got %v", roleInterface)
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
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
				log.Printf("[createTour] Invalid user ID format: %v", v)
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
				return
			}
		default:
			log.Printf("[createTour] Invalid user ID type: %T", userIDInterface)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID type"})
			return
		}

		log.Printf("[createTour] Creating tour for authorID: %d, request: %+v", authorID, req)
		tour, err := models.CreateTour(db, req, authorID)
		if err != nil {
			log.Printf("[createTour] Failed to create tour: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tour"})
			return
		}

		log.Printf("[createTour] Tour created successfully: %+v", tour)
		c.JSON(http.StatusCreated, gin.H{"tour": tour})
	}
}

func updateTour(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Println("[updateTour] Called")
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
		log.Println("[deleteTour] Called")
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

func getMyTours(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
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

		tours, err := models.GetToursByAuthor(db, authorID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tours"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"tours": tours})
	}
}

func getKeyPoints(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idParam := c.Param("id")
		tourID, err := strconv.Atoi(idParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
			return
		}

		keyPoints, err := models.GetKeyPointsByTourID(db, tourID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch key points"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"keypoints": keyPoints})
	}
}

func getFirstKeyPoint(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tourID, _ := strconv.Atoi(c.Param("id"))

		keyPoints, err := models.GetKeyPointsByTourID(db, tourID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch key points"})
			return
		}

		if len(keyPoints) == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "No key points found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"keypoint": keyPoints[0]})
	}
}

func getReviews(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tourID, _ := strconv.Atoi(c.Param("id"))

		reviews, err := models.GetReviewsByTourID(db, tourID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
			return
		}

		// Enrich reviews with tourist information
		enrichedReviews := make([]gin.H, len(reviews))
		for i, review := range reviews {
			// Fetch tourist info from stakeholders service (simplified - in production use proper HTTP client)
			enrichedReviews[i] = gin.H{
				"id":         review.ID,
				"tour_id":    review.TourID,
				"tourist_id": review.TouristID,
				"rating":     review.Rating,
				"comment":    review.Comment,
				"visit_date": review.VisitDate,
				"images":     review.Images,
				"created_at": review.CreatedAt,
				"updated_at": review.UpdatedAt,
			}
		}

		c.JSON(http.StatusOK, gin.H{"reviews": enrichedReviews})
	}
}

func getTravelTimes(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tourID, _ := strconv.Atoi(c.Param("id"))

		travelTimes, err := models.GetTravelTimesByTourID(db, tourID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch travel times"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"travel_times": travelTimes})
	}
}

func createKeyPoint(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idParam := c.Param("id")
		tourID, err := strconv.Atoi(idParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
			return
		}

		var req models.CreateKeyPointRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Verify tour ownership
		userIDInterface, _ := c.Get("user_id")
		var authorID int
		switch v := userIDInterface.(type) {
		case float64:
			authorID = int(v)
		case string:
			authorID, _ = strconv.Atoi(v)
		}

		tour, err := models.GetTourByID(db, tourID)
		if err != nil || tour.AuthorID != authorID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
			return
		}

		keyPoint, err := models.CreateKeyPoint(db, tourID, req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create key point"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"keypoint": keyPoint})
	}
}

func deleteKeyPoint(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tourID, _ := strconv.Atoi(c.Param("id"))
		kpID, _ := strconv.Atoi(c.Param("kpid"))

		// Verify tour ownership
		userIDInterface, _ := c.Get("user_id")
		var authorID int
		switch v := userIDInterface.(type) {
		case float64:
			authorID = int(v)
		case string:
			authorID, _ = strconv.Atoi(v)
		}

		tour, err := models.GetTourByID(db, tourID)
		if err != nil || tour.AuthorID != authorID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
			return
		}

		err = models.DeleteKeyPoint(db, kpID, tourID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete key point"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Key point deleted successfully"})
	}
}

func createTravelTime(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tourID, _ := strconv.Atoi(c.Param("id"))

		var req models.CreateTravelTimeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Verify tour ownership
		userIDInterface, _ := c.Get("user_id")
		var authorID int
		switch v := userIDInterface.(type) {
		case float64:
			authorID = int(v)
		case string:
			authorID, _ = strconv.Atoi(v)
		}

		tour, err := models.GetTourByID(db, tourID)
		if err != nil || tour.AuthorID != authorID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
			return
		}

		travelTime, err := models.CreateTravelTime(db, tourID, req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create travel time"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"travel_time": travelTime})
	}
}

func deleteTravelTime(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tourID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
			return
		}
		ttID, err := strconv.Atoi(c.Param("ttid"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid travel time ID"})
			return
		}

		// Verify tour ownership
		userIDInterface, _ := c.Get("user_id")
		var authorID int
		switch v := userIDInterface.(type) {
		case float64:
			authorID = int(v)
		case string:
			authorID, _ = strconv.Atoi(v)
		}

		tour, err := models.GetTourByID(db, tourID)
		if err != nil || tour.AuthorID != authorID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
			return
		}

		err = models.DeleteTravelTime(db, ttID, tourID)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "Travel time not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete travel time"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Travel time deleted successfully"})
	}
}

func updateKeyPoint(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tourID, _ := strconv.Atoi(c.Param("id"))
		kpID, _ := strconv.Atoi(c.Param("kpid"))

		var req models.UpdateKeyPointRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Verify tour ownership
		userIDInterface, _ := c.Get("user_id")
		var authorID int
		switch v := userIDInterface.(type) {
		case float64:
			authorID = int(v)
		case string:
			authorID, _ = strconv.Atoi(v)
		}

		tour, err := models.GetTourByID(db, tourID)
		if err != nil || tour.AuthorID != authorID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
			return
		}

		keyPoint, err := models.UpdateKeyPoint(db, kpID, tourID, req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update key point"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"keypoint": keyPoint})
	}
}

func publishTour(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tourID, _ := strconv.Atoi(c.Param("id"))

		userIDInterface, _ := c.Get("user_id")
		var authorID int
		switch v := userIDInterface.(type) {
		case float64:
			authorID = int(v)
		case string:
			authorID, _ = strconv.Atoi(v)
		}

		// Validate first
		canPublish, reason, err := models.CanPublishTour(db, tourID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate tour"})
			return
		}

		if !canPublish {
			c.JSON(http.StatusBadRequest, gin.H{"error": reason})
			return
		}

		tour, err := models.PublishTour(db, tourID, authorID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to publish tour"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"tour": tour})
	}
}

func archiveTour(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tourID, _ := strconv.Atoi(c.Param("id"))

		userIDInterface, _ := c.Get("user_id")
		var authorID int
		switch v := userIDInterface.(type) {
		case float64:
			authorID = int(v)
		case string:
			authorID, _ = strconv.Atoi(v)
		}

		tour, err := models.ArchiveTour(db, tourID, authorID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to archive tour"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"tour": tour})
	}
}

func startTour(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tourID, _ := strconv.Atoi(c.Param("id"))

		var req models.StartTourRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userIDInterface, _ := c.Get("user_id")
		var touristID int
		switch v := userIDInterface.(type) {
		case float64:
			touristID = int(v)
		case string:
			touristID, _ = strconv.Atoi(v)
		}

		// Check if tour is published or archived
		tour, err := models.GetTourByID(db, tourID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Tour not found"})
			return
		}

		if tour.Status != models.StatusPublished && tour.Status != models.StatusArchived {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tour is not available for execution"})
			return
		}

		execution, err := models.StartTourExecution(db, tourID, touristID, req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start tour"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"execution": execution})
	}
}

func getActiveTourExecution(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDInterface, _ := c.Get("user_id")
		var touristID int
		switch v := userIDInterface.(type) {
		case float64:
			touristID = int(v)
		case string:
			touristID, _ = strconv.Atoi(v)
		}

		execution, err := models.GetActiveTourExecution(db, touristID)
		if err != nil {
			if err == sql.ErrNoRows {
				// Return 404 with JSON instead of 204
				c.JSON(http.StatusNotFound, gin.H{"error": "No active tour execution"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch execution"})
			return
		}

		// Get tour details
		tour, err := models.GetTourByID(db, execution.TourID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tour details"})
			return
		}

		// Get key points for the tour
		keyPoints, err := models.GetKeyPointsByTourID(db, execution.TourID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch key points"})
			return
		}

		// Get completed key points
		completed, _ := models.GetCompletedKeyPoints(db, execution.ID)

		c.JSON(http.StatusOK, gin.H{
			"execution":           execution,
			"tour":                tour,
			"keypoints":           keyPoints,
			"completed_keypoints": completed,
		})
	}
}

func updateTourLocation(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		executionID, _ := strconv.Atoi(c.Param("id"))

		var req models.UpdateLocationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Update last activity
		if err := models.UpdateLastActivity(db, executionID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update activity"})
			return
		}

		// Get execution to find tour
		userIDInterface, _ := c.Get("user_id")
		var touristID int
		switch v := userIDInterface.(type) {
		case float64:
			touristID = int(v)
		case string:
			touristID, _ = strconv.Atoi(v)
		}

		execution, err := models.GetActiveTourExecution(db, touristID)
		if err != nil || execution.ID != executionID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
			return
		}

		// Get all key points for the tour
		keyPoints, _ := models.GetKeyPointsByTourID(db, execution.TourID)
		completed, _ := models.GetCompletedKeyPoints(db, executionID)

		// Check if near any uncompleted key point (within ~50 meters)
		const proximityThreshold = 0.0005 // approximately 50 meters

		completedIDs := make(map[int]bool)
		for _, ckp := range completed {
			completedIDs[ckp.KeyPointID] = true
		}

		var nearbyKeyPoint *models.KeyPoint
		for i := range keyPoints {
			kp := &keyPoints[i]
			if completedIDs[kp.ID] {
				continue
			}

			latDiff := req.Latitude - kp.Latitude
			lonDiff := req.Longitude - kp.Longitude
			distance := latDiff*latDiff + lonDiff*lonDiff

			if distance < proximityThreshold*proximityThreshold {
				nearbyKeyPoint = kp
				break
			}
		}

		if nearbyKeyPoint != nil {
			models.MarkKeyPointCompleted(db, executionID, nearbyKeyPoint.ID)
			c.JSON(http.StatusOK, gin.H{
				"nearby_keypoint": nearbyKeyPoint,
				"completed":       true,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"nearby_keypoint": nil,
			"completed":       false,
		})
	}
}

func completeTourExecution(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		executionID, _ := strconv.Atoi(c.Param("id"))

		if err := models.CompleteTourExecution(db, executionID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete tour"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Tour completed successfully"})
	}
}

func abandonTourExecution(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		executionID, _ := strconv.Atoi(c.Param("id"))

		if err := models.AbandonTourExecution(db, executionID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to abandon tour"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Tour abandoned"})
	}
}

func createReview(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tourID, _ := strconv.Atoi(c.Param("id"))

		var req models.CreateReviewRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userIDInterface, _ := c.Get("user_id")
		var touristID int
		switch v := userIDInterface.(type) {
		case float64:
			touristID = int(v)
		case string:
			touristID, _ = strconv.Atoi(v)
		}

		review, err := models.CreateReview(db, tourID, touristID, req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create review"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"review": review})
	}
}

func getToursForTourists(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Println("[getToursForTourists] Fetching tours for tourists...")

		toursData, err := models.GetToursForTourists(db)
		if err != nil {
			log.Printf("[getToursForTourists] Error fetching tours: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tours", "details": err.Error()})
			return
		}

		log.Printf("[getToursForTourists] Successfully fetched %d tours for tourists", len(toursData))
		c.JSON(http.StatusOK, gin.H{"tours": toursData})
	}
}

// Nova funkcija za dobijanje tura po statusu
func getToursByStatus(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		status := c.Param("status")
		log.Printf("[getToursByStatus] Fetching tours with status: %s", status)

		// Validacija statusa
		validStatuses := map[string]bool{
			"draft":     true,
			"published": true,
			"archived":  true,
		}

		if !validStatuses[status] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status value"})
			return
		}

		tours, err := models.GetToursByStatus(db, status)
		if err != nil {
			log.Printf("[getToursByStatus] Error fetching tours: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tours", "details": err.Error()})
			return
		}

		log.Printf("[getToursByStatus] Successfully fetched %d tours with status %s", len(tours), status)

		// Konvertuj u odgovor koji odgovara Python verziji
		toursData := make([]gin.H, len(tours))
		for i, t := range tours {
			toursData[i] = gin.H{
				"id":          t.ID,
				"name":        t.Name,
				"description": t.Description,
				"difficulty":  t.Difficulty,
				"tags":        t.Tags,
				"status":      t.Status,
				"price":       t.Price,
				"created_at":  t.CreatedAt.Format("2006-01-02T15:04:05Z07:00"), // ISO format
			}
		}

		c.JSON(http.StatusOK, gin.H{"tours": toursData})
	}
}
