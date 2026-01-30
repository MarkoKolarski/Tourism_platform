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

type BlogHandler struct {
	blogRepo *repository.BlogRepository
}

func NewBlogHandler(db *gorm.DB) *BlogHandler {
	return &BlogHandler{
		blogRepo: repository.NewBlogRepository(db),
	}
}

// Helper function to convert integer user ID to UUID
func intToUUID(userID int) uuid.UUID {
	// Create a deterministic UUID from integer ID
	hash := md5.Sum([]byte(fmt.Sprintf("user_%d", userID)))
	return uuid.UUID(hash)
}

func (h *BlogHandler) CreateBlog(c *gin.Context) {
	var req models.CreateBlogRequest
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

	userID := intToUUID(userIDInt)

	userName, _ := c.Get("userName")
	userNameStr := ""
	if userName != nil {
		userNameStr = userName.(string)
	}

	blog := &models.Blog{
		Title:       req.Title,
		Content:     req.Content,
		Description: req.Description,
		UserID:      userID,
		UserName:    userNameStr,
		Images:      req.Images,
		Tags:        req.Tags,
		Status:      "draft",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.blogRepo.Create(blog); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, blog)
}

func (h *BlogHandler) GetBlogByID(c *gin.Context) {
	id := c.Param("id")

	blogID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
		return
	}

	blog, err := h.blogRepo.GetByID(blogID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, blog)
}

func (h *BlogHandler) GetAllBlogs(c *gin.Context) {
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")
	search := c.Query("search")
	userID := c.Query("userId")

	blogs, total, err := h.blogRepo.GetAll(page, limit, search, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"blogs": blogs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *BlogHandler) GetBlogsByUserID(c *gin.Context) {
	//userID := c.Param("userId")

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

	uuidUserID := intToUUID(userIDInt)

	blogs, err := h.blogRepo.GetByUserID(uuidUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, blogs)
}

func (h *BlogHandler) UpdateBlog(c *gin.Context) {
	id := c.Param("id")

	blogID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
		return
	}

	var req models.UpdateBlogRequest
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

	userID := intToUUID(userIDInt)

	// Check if blog exists and user is the owner
	existingBlog, err := h.blogRepo.GetByID(blogID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}

	if existingBlog.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to update this blog"})
		return
	}

	if req.Title != "" {
		existingBlog.Title = req.Title
	}
	if req.Content != "" {
		existingBlog.Content = req.Content
	}
	if req.Description != "" {
		existingBlog.Description = req.Description
	}
	if req.Images != nil {
		existingBlog.Images = req.Images
	}
	if req.Tags != nil {
		existingBlog.Tags = req.Tags
	}
	if req.Status != "" {
		existingBlog.Status = req.Status
	}
	existingBlog.UpdatedAt = time.Now()

	if err := h.blogRepo.Update(existingBlog); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, existingBlog)
}

func (h *BlogHandler) DeleteBlog(c *gin.Context) {
	id := c.Param("id")

	blogID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
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

	userID := intToUUID(userIDInt)

	// Check if blog exists and user is the owner
	existingBlog, err := h.blogRepo.GetByID(blogID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}

	if existingBlog.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to delete this blog"})
		return
	}

	if err := h.blogRepo.Delete(blogID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Blog deleted successfully"})
}

func (h *BlogHandler) LikeBlog(c *gin.Context) {
	blogIDStr := c.Param("id")

	blogID, err := uuid.Parse(blogIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
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

	userID := intToUUID(userIDInt)

	// Check if user already liked the blog
	alreadyLiked, err := h.blogRepo.HasUserLiked(blogID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if alreadyLiked {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You already liked this blog"})
		return
	}

	like := &models.BlogLike{
		BlogID:    blogID,
		UserID:    userID,
		CreatedAt: time.Now(),
	}

	if err := h.blogRepo.AddLike(like); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Blog liked successfully"})
}

func (h *BlogHandler) UnlikeBlog(c *gin.Context) {
	blogIDStr := c.Param("id")

	blogID, err := uuid.Parse(blogIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
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

	userID := intToUUID(userIDInt)

	if err := h.blogRepo.RemoveLike(blogID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Blog unliked successfully"})
}

func (h *BlogHandler) GetLikeCount(c *gin.Context) {
	blogIDStr := c.Param("id") // Changed from "blogId" to "id"

	blogID, err := uuid.Parse(blogIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
		return
	}

	count, err := h.blogRepo.GetLikeCount(blogID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"likeCount": count})
}

func (h *BlogHandler) GetUserLikeStatus(c *gin.Context) {
	blogIDStr := c.Param("id")

	blogID, err := uuid.Parse(blogIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
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

	userID := intToUUID(userIDInt)

	liked, err := h.blogRepo.HasUserLiked(blogID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"liked": liked})
}

func (h *BlogHandler) PublishBlog(c *gin.Context) {
	blogIDStr := c.Param("id")

	blogID, err := uuid.Parse(blogIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
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

	userID := intToUUID(userIDInt)

	blog, err := h.blogRepo.GetByID(blogID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}

	if blog.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to publish this blog"})
		return
	}

	if err := h.blogRepo.UpdateStatus(blogID, "published"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Blog published successfully"})
}

func (h *BlogHandler) CloseBlog(c *gin.Context) {
	blogIDStr := c.Param("id")

	blogID, err := uuid.Parse(blogIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
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

	userID := intToUUID(userIDInt)

	blog, err := h.blogRepo.GetByID(blogID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}

	if blog.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to close this blog"})
		return
	}

	if err := h.blogRepo.UpdateStatus(blogID, "closed"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Blog closed successfully"})
}
