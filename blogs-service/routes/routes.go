package routes

import (
	"blogs-service/handlers"
	"blogs-service/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(router *gin.Engine, db *gorm.DB) {
	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Blogs service is running",
			"service": "blogs-service",
		})
	})

	// Initialize handlers
	blogHandler := handlers.NewBlogHandler(db)
	commentHandler := handlers.NewCommentHandler(db)

	// Public routes (no authentication required)
	root := router.Group("/")
	{
		// Blog routes - with optional authentication for filtering
		root.GET("/blogs", middleware.OptionalAuthMiddleware(), blogHandler.GetAllBlogs)
		root.GET("/blogs/:id", blogHandler.GetBlogByID)
		root.GET("/blogs/:id/likes/count", blogHandler.GetLikeCount)
		root.GET("/blogs/:id/comments", commentHandler.GetCommentsByBlogID)
	}

	// Protected routes (authentication required)
	protected := root.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		// User's own blogs
		protected.GET("/blogs/user", blogHandler.GetBlogsByUserID)

		// Check if user liked a blog
		protected.GET("/blogs/:id/like/status", blogHandler.GetUserLikeStatus)

		// Blog management
		protected.POST("/blogs", blogHandler.CreateBlog)
		protected.PUT("/blogs/:id", blogHandler.UpdateBlog)
		protected.DELETE("/blogs/:id", blogHandler.DeleteBlog)

		// Blog actions
		protected.POST("/blogs/:id/like", blogHandler.LikeBlog)
		protected.DELETE("/blogs/:id/like", blogHandler.UnlikeBlog)
		protected.PUT("/blogs/:id/publish", blogHandler.PublishBlog)
		protected.PUT("/blogs/:id/close", blogHandler.CloseBlog)

		// Comment management
		protected.POST("/blogs/:id/comments", commentHandler.CreateComment)
		protected.PUT("/comments/:id", commentHandler.UpdateComment)
		protected.DELETE("/comments/:id", commentHandler.DeleteComment)
	}
}
