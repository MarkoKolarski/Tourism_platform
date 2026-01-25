package routes

import (
	"blog-service/handlers"
	"blog-service/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(router *gin.Engine, db *gorm.DB) {
	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Blog service is running",
			"service": "blog-service",
		})
	})

	// Initialize handlers
	blogHandler := handlers.NewBlogHandler(db)
	commentHandler := handlers.NewCommentHandler(db)

	// Public routes (no authentication required)
	api := router.Group("/api")
	{
		// Blog routes - public read access
		api.GET("/blogs", blogHandler.GetAllBlogs)
		api.GET("/blogs/:id", blogHandler.GetBlogByID)
		//api.GET("/blogs/user/:userId", blogHandler.GetBlogsByUserID)
		api.GET("/blogs/user", blogHandler.GetBlogsByUserID)
		api.GET("/blogs/:id/likes/count", blogHandler.GetLikeCount)
		api.GET("/blogs/:id/comments", commentHandler.GetCommentsByBlogID)
	}

	// Protected routes (authentication required)
	protected := api.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
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
