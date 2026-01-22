package routes

import (
	"blog-service/handlers"
	"blog-service/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(router *gin.Engine, db *gorm.DB) {
	blogHandler := handlers.NewBlogHandler(db)
	commentHandler := handlers.NewCommentHandler(db)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	api := router.Group("/api")
	{
		blogs := api.Group("/blogs")
		{
			// Public routes
			blogs.GET("", middleware.OptionalAuthMiddleware(), blogHandler.GetAllBlogs)
			blogs.GET("/:id", middleware.OptionalAuthMiddleware(), blogHandler.GetBlogByID)
			blogs.GET("/user/:userId", blogHandler.GetBlogsByUserID)
			blogs.GET("/:blogId/likes/count", blogHandler.GetLikeCount)

			// Protected routes
			blogs.POST("", middleware.AuthMiddleware(), blogHandler.CreateBlog)
			blogs.PUT("/:id", middleware.AuthMiddleware(), blogHandler.UpdateBlog)
			blogs.DELETE("/:id", middleware.AuthMiddleware(), blogHandler.DeleteBlog)
			blogs.POST("/:id/publish", middleware.AuthMiddleware(), blogHandler.PublishBlog)
			blogs.POST("/:id/close", middleware.AuthMiddleware(), blogHandler.CloseBlog)

			// Like routes
			blogs.POST("/:blogId/like", middleware.AuthMiddleware(), blogHandler.LikeBlog)
			blogs.DELETE("/:blogId/like", middleware.AuthMiddleware(), blogHandler.UnlikeBlog)

			// Comment routes
			blogs.GET("/:blogId/comments", commentHandler.GetCommentsByBlogID)
			blogs.POST("/:blogId/comments", middleware.AuthMiddleware(), commentHandler.CreateComment)
		}

		comments := api.Group("/comments")
		{
			comments.PUT("/:id", middleware.AuthMiddleware(), commentHandler.UpdateComment)
			comments.DELETE("/:id", middleware.AuthMiddleware(), commentHandler.DeleteComment)
		}
	}
}
