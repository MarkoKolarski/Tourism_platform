package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"tours-service/grpc"
	"tours-service/models"

	"github.com/gin-gonic/gin"
)

type TourExecutionHandler struct {
	db              *sql.DB
	purchasesClient *grpc.PurchasesGRPCClient
}

func NewTourExecutionHandler(db *sql.DB, purchasesClient *grpc.PurchasesGRPCClient) *TourExecutionHandler {
	return &TourExecutionHandler{
		db:              db,
		purchasesClient: purchasesClient,
	}
}

func (h *TourExecutionHandler) StartTour(c *gin.Context) {
	tourIDStr := c.Param("id")
	tourID, err := strconv.Atoi(tourIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	// Convert userID to int
	var touristID int
	switch v := userID.(type) {
	case float64:
		touristID = int(v)
	case int:
		touristID = v
	case string:
		touristID, err = strconv.Atoi(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Check if user has purchased this tour
	log.Printf("[TourExecution] Verifying purchase for user %d, tour %d", touristID, tourID)
	hasPurchased, tokenID, err := h.purchasesClient.VerifyPurchase(touristID, tourID)
	if err != nil {
		log.Printf("[TourExecution] Purchase verification failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to verify purchase",
			"details": "Unable to connect to purchase service",
		})
		return
	}

	if !hasPurchased {
		log.Printf("[TourExecution] User %d has not purchased tour %d", touristID, tourID)
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Tour not purchased",
			"message": "You must purchase this tour before starting it",
		})
		return
	}

	log.Printf("[TourExecution] Purchase verified: user %d, tour %d, token %s", touristID, tourID, tokenID)

	// Check if tour exists and is published
	tour, err := models.GetTourByID(h.db, tourID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Tour not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if tour.Status != models.StatusPublished {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Tour not available",
			"message": "This tour is not currently available for execution",
		})
		return
	}

	// Check if user already has an active tour execution
	activeExecution, err := models.GetActiveTourExecution(h.db, touristID)
	if err != nil && err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if activeExecution != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":            "Active tour already exists",
			"message":          "You must complete or abandon your current tour before starting a new one",
			"active_execution": activeExecution,
		})
		return
	}

	var req models.StartTourRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	execution, err := models.StartTourExecution(h.db, tourID, touristID, req)
	if err != nil {
		log.Printf("Error starting tour execution: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start tour execution"})
		return
	}

	log.Printf("[TourExecution] Tour started: execution_id=%d, user_id=%d, tour_id=%d", execution.ID, touristID, tourID)

	c.JSON(http.StatusCreated, gin.H{
		"message":        "Tour started successfully",
		"execution":      execution,
		"purchase_token": tokenID,
	})
}

func (h *TourExecutionHandler) GetActiveExecution(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	var touristID int
	switch v := userID.(type) {
	case float64:
		touristID = int(v)
	case int:
		touristID = v
	case string:
		var err error
		touristID, err = strconv.Atoi(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	execution, err := models.GetActiveTourExecution(h.db, touristID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"message":   "No active tour execution",
				"execution": nil,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get completed key points
	completedKeyPoints, _ := models.GetCompletedKeyPoints(h.db, execution.ID)

	c.JSON(http.StatusOK, gin.H{
		"execution":            execution,
		"completed_key_points": completedKeyPoints,
	})
}

func (h *TourExecutionHandler) CompleteKeyPoint(c *gin.Context) {
	executionIDStr := c.Param("execution_id")
	executionID, err := strconv.Atoi(executionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid execution ID"})
		return
	}

	keyPointIDStr := c.Param("keypoint_id")
	keyPointID, err := strconv.Atoi(keyPointIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key point ID"})
		return
	}

	err = models.MarkKeyPointCompleted(h.db, executionID, keyPointID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark key point as completed"})
		return
	}

	// Update last activity
	models.UpdateLastActivity(h.db, executionID)

	c.JSON(http.StatusOK, gin.H{
		"message":      "Key point completed successfully",
		"key_point_id": keyPointID,
	})
}

func (h *TourExecutionHandler) CompleteTour(c *gin.Context) {
	executionIDStr := c.Param("execution_id")
	executionID, err := strconv.Atoi(executionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid execution ID"})
		return
	}

	err = models.CompleteTourExecution(h.db, executionID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Active execution not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete tour"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Tour completed successfully",
	})
}

func (h *TourExecutionHandler) AbandonTour(c *gin.Context) {
	executionIDStr := c.Param("execution_id")
	executionID, err := strconv.Atoi(executionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid execution ID"})
		return
	}

	err = models.AbandonTourExecution(h.db, executionID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Active execution not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to abandon tour"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Tour abandoned successfully",
	})
}
