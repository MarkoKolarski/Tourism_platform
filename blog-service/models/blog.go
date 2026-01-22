package models

import (
	"time"
	"github.com/google/uuid"
)

type Blog struct {
	ID           uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primary_key" json:"id"`
	Title        string     `gorm:"type:varchar(255);not null" json:"title" binding:"required"`
	Content      string     `gorm:"type:text;not null" json:"content" binding:"required"` // Markdown content
	Description  string     `gorm:"type:text" json:"description"`
	UserID       uuid.UUID  `gorm:"type:uuid;not null;index:idx_blog_user" json:"userId"`
	UserName     string     `gorm:"type:varchar(255)" json:"userName"`
	CreatedAt    time.Time  `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt    time.Time  `gorm:"autoUpdateTime" json:"updatedAt"`
	Images       []string   `gorm:"type:jsonb;serializer:json" json:"images"`
	Tags         []string   `gorm:"type:jsonb;serializer:json" json:"tags"`
	LikeCount    int        `gorm:"default:0" json:"likeCount"`
	CommentCount int        `gorm:"default:0" json:"commentCount"`
	Status       string     `gorm:"type:varchar(50);default:'draft'" json:"status"` // draft, published, closed
	Comments     []Comment  `gorm:"foreignKey:BlogID;constraint:OnDelete:CASCADE;" json:"comments,omitempty"`
	Likes        []BlogLike `gorm:"foreignKey:BlogID;constraint:OnDelete:CASCADE;" json:"likes,omitempty"`
}

type CreateBlogRequest struct {
	Title       string   `json:"title" binding:"required"`
	Content     string   `json:"content" binding:"required"`
	Description string   `json:"description"`
	Images      []string `json:"images"`
	Tags        []string `json:"tags"`
}

type UpdateBlogRequest struct {
	Title       string   `json:"title"`
	Content     string   `json:"content"`
	Description string   `json:"description"`
	Images      []string `json:"images"`
	Tags        []string `json:"tags"`
	Status      string   `json:"status"`
}