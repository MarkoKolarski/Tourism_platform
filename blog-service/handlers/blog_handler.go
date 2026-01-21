package handlers

import (
    "net/http"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "blog-service/models"
    "blog-service/repository"
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

type CreateBlogRequest struct {
    Title       string   `json:"title" binding:"required"`
    Content     string   `json:"content" binding:"required"`
    //Description string   `json:"description"`
    Images      []string `json:"images"`
}

func (h *BlogHandler) CreateBlog(c *gin.Context) {
    var req CreateBlogRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    userIDStr, exists := c.Get("userID")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }
    
    userID, err := uuid.Parse(userIDStr.(string))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }
    
    blog := &models.Blog{
        Title:       req.Title,
        Content:     req.Content,
        UserID:      userID,
        Images:      req.Images,
        CreatedAt:   time.Now(),
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
    userID := c.Param("userId")
    
    uuidUserID, err := uuid.Parse(userID)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }
    
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
    
    var req CreateBlogRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    userIDStr, exists := c.Get("userID")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }
    
    userID, err := uuid.Parse(userIDStr.(string))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }
    
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
    
    existingBlog.Title = req.Title
    existingBlog.Content = req.Content
    existingBlog.Description = req.Description
    existingBlog.Images = req.Images
    existingBlog.Tags = req.Tags
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
    
    userID, err := uuid.Parse(userIDStr.(string))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }
    
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
    blogIDStr := c.Param("blogId")
    
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
    
    userID, err := uuid.Parse(userIDStr.(string))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }
    
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
    blogIDStr := c.Param("blogId")
    
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
    
    userID, err := uuid.Parse(userIDStr.(string))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }
    
    if err := h.blogRepo.RemoveLike(blogID, userID); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{"message": "Blog unliked successfully"})
}

func (h *BlogHandler) GetLikeCount(c *gin.Context) {
    blogIDStr := c.Param("blogId")
    
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