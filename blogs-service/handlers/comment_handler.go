package handlers

import (
	"crypto/md5"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"blogs-service/models"
	"blogs-service/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CommentHandler struct {
	commentRepo *repository.CommentRepository
}

func NewCommentHandler(db *gorm.DB) *CommentHandler {
	return &CommentHandler{
		commentRepo: repository.NewCommentRepository(db),
	}
}

// Helper function to convert integer user ID to UUID
func commentIntToUUID(userID int) uuid.UUID {
	hash := md5.Sum([]byte(fmt.Sprintf("user_%d", userID)))
	return uuid.UUID(hash)
}

func (h *CommentHandler) CreateComment(c *gin.Context) {
	blogIDStr := c.Param("id")

	blogID, err := uuid.Parse(blogIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
		return
	}

	var req models.CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDStr, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Convert string userID to int, then to UUID
	userIDInt, err := strconv.Atoi(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	userID := commentIntToUUID(userIDInt)

	userName, _ := c.Get("userName")
	userNameStr := ""
	if userName != nil {
		userNameStr = userName.(string)
	}

	comment := &models.Comment{
		Content:         req.Content,
		BlogID:          blogID,
		UserID:          userID,
		UserName:        userNameStr,
		ParentCommentID: req.ParentCommentID,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := h.commentRepo.Create(comment); err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Blog or parent comment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, comment)
}

func (h *CommentHandler) GetCommentsByBlogID(c *gin.Context) {
	blogIDStr := c.Param("id") // Changed from "blogId" to "id"

	blogID, err := uuid.Parse(blogIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
		return
	}

	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	comments, total, err := h.commentRepo.GetByBlogID(blogID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"comments": comments,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

func (h *CommentHandler) UpdateComment(c *gin.Context) {
	commentIDStr := c.Param("id")

	commentID, err := uuid.Parse(commentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	var req models.UpdateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDStr, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Convert string userID to int, then to UUID
	userIDInt, err := strconv.Atoi(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	userID := commentIntToUUID(userIDInt)

	// Check if comment exists and user is the owner
	existingComment, err := h.commentRepo.GetByID(commentID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if existingComment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to update this comment"})
		return
	}

	existingComment.Content = req.Content
	existingComment.UpdatedAt = time.Now()

	if err := h.commentRepo.Update(existingComment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, existingComment)
}

func (h *CommentHandler) DeleteComment(c *gin.Context) {
	commentIDStr := c.Param("id")

	commentID, err := uuid.Parse(commentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	userIDStr, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Convert string userID to int, then to UUID
	userIDInt, err := strconv.Atoi(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	userID := commentIntToUUID(userIDInt)

	// Check if comment exists and user is the owner
	existingComment, err := h.commentRepo.GetByID(commentID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if existingComment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to delete this comment"})
		return
	}

	if err := h.commentRepo.Delete(commentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted successfully"})
}
