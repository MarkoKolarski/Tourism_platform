package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	MaxUploadSize = 10 << 20 // 10 MB
	UploadDir     = "./uploads/reviews"
)

type ImageUploadHandler struct{}

func NewImageUploadHandler() *ImageUploadHandler {
	// Create upload directory if it doesn't exist
	os.MkdirAll(UploadDir, os.ModePerm)
	return &ImageUploadHandler{}
}

func (h *ImageUploadHandler) UploadImage(c *gin.Context) {
	// Verify authentication
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
		return
	}

	// user_id is always string from auth middleware
	userIDStr, ok := userIDInterface.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Validate user_id can be converted to int
	_, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	// Limit upload size
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxUploadSize)

	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read file"})
		return
	}
	defer file.Close()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File must be an image"})
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%s_%s%s", time.Now().Format("20060102_150405"), uuid.New().String()[:8], ext)
	filePath := filepath.Join(UploadDir, filename)

	// Create file on server
	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}
	defer dst.Close()

	// Copy uploaded file to destination
	if _, err := io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Return URL to access the image
	imageURL := fmt.Sprintf("/api/tours-service/images/reviews/%s", filename)
	c.JSON(http.StatusOK, gin.H{
		"url":      imageURL,
		"filename": filename,
	})
}

func (h *ImageUploadHandler) ServeImage(c *gin.Context) {
	filename := c.Param("filename")

	// Prevent directory traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filename"})
		return
	}

	filePath := filepath.Join(UploadDir, filename)

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Image not found"})
		return
	}

	c.File(filePath)
}
