package main

import (
	"blog-service/handlers"
	"blog-service/storage"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Učitaj .env fajl ako postoji
	_ = godotenv.Load()

	// Inicijalizuj storage
	storage.InitStorage()

	// Kreiraj router
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// API rute
	api := router.Group("/api/v1")
	{
		// Blog rute
		api.GET("/blogs", handlers.GetAllBlogs)
		api.GET("/blogs/:id", handlers.GetBlogByID)
		api.POST("/blogs", handlers.CreateBlog)
		api.PUT("/blogs/:id", handlers.UpdateBlog)
		api.DELETE("/blogs/:id", handlers.DeleteBlog)
		api.GET("/users/:userId/blogs", handlers.GetBlogsByUserID)

		// Komentar rute
		api.GET("/blogs/:blogId/comments", handlers.GetCommentsByBlogID)
		api.POST("/blogs/:blogId/comments", handlers.CreateComment)
		api.PUT("/comments/:id", handlers.UpdateComment)
		api.DELETE("/comments/:id", handlers.DeleteComment)

		// Like rute
		api.POST("/blogs/:blogId/like", handlers.LikeBlog)
		api.DELETE("/blogs/:blogId/like", handlers.UnlikeBlog)
		api.GET("/blogs/:blogId/likes", handlers.GetLikesByBlogID)
		api.GET("/blogs/:blogId/likes/count", handlers.GetLikeCount)

		// Demo user rute za testiranje
		api.POST("/demo/login", handlers.DemoLogin)
		api.GET("/demo/users", handlers.GetAllUsers)
		api.POST("/demo/users", handlers.CreateDemoUser)
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "OK",
			"service": "blog-service",
			"version": "1.0.0",
		})
	})

	// Pokreni server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("🚀 Blog Service starting on port %s", port)
	log.Printf("📝 API Documentation:")
	log.Printf("   GET    http://localhost:%s/api/v1/blogs", port)
	log.Printf("   POST   http://localhost:%s/api/v1/blogs", port)
	log.Printf("   POST   http://localhost:%s/api/v1/demo/login", port)

	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
