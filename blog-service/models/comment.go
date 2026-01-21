package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Comment struct {
	ID              uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primary_key" json:"id"`
	Content         string     `gorm:"type:text;not null" json:"content" binding:"required"`
	BlogID          uuid.UUID  `gorm:"type:uuid;not null;index:idx_comment_blog" json:"blogId"`
	UserID          uuid.UUID  `gorm:"type:uuid;not null;index:idx_comment_user" json:"userId"`
	UserName        string     `gorm:"type:varchar(255)" json:"userName"`
	ParentCommentID *uuid.UUID `gorm:"type:uuid;index:idx_comment_parent" json:"parentCommentId,omitempty"`
	CreatedAt       time.Time  `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt       time.Time  `gorm:"autoUpdateTime" json:"updatedAt"`

	Blog            Blog       `gorm:"foreignKey:BlogID" json:"-"`
	Replies         []Comment  `gorm:"foreignKey:ParentCommentID" json:"replies,omitempty"`
	UserInfo        UserInfo   `gorm:"-" json:"userInfo"`
}

type UserInfo struct {
	ID        uuid.UUID `json:"id"`
	Username  string    `json:"username"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	Avatar    string    `json:"avatar"`
}

type CreateCommentRequest struct {
	Content         string     `json:"content" binding:"required"`
	ParentCommentID *uuid.UUID `json:"parentCommentId,omitempty"`
}

type UpdateCommentRequest struct {
	Content string `json:"content" binding:"required"`
}