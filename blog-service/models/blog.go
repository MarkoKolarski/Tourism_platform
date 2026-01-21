package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Blog struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key" json:"id"`
	Title       string    `gorm:"type:varchar(255);not null" json:"title" binding:"required"`
	Content     string    `gorm:"type:text;not null" json:"content" binding:"required"` // Markdown content
	UserID      uuid.UUID `gorm:"type:uuid;not null;index:idx_blog_user" json:"userId"`
	UserName    string    `gorm:"type:varchar(255)" json:"userName"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
	Images      []string  `gorm:"type:jsonb" json:"images"`
	LikeCount   int       `gorm:"default:0" json:"likeCount"`
	CommentCount int      `gorm:"default:0" json:"commentCount"`
	Comments []Comment `gorm:"foreignKey:BlogID;constraint:OnDelete:CASCADE;" json:"comments,omitempty"`
	Likes    []BlogLike `gorm:"foreignKey:BlogID;constraint:OnDelete:CASCADE;" json:"likes,omitempty"`
}

type CreateBlogRequest struct {
	Title       string   `json:"title" binding:"required"`
	Content     string   `json:"content" binding:"required"`
	Images      []string `json:"images"`
}

type UpdateBlogRequest struct {
	Title       string   `json:"title"`
	Content     string   `json:"content"`
	Images      []string `json:"images"`
}