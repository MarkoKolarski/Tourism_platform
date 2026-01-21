package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BlogLike struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key" json:"id"`
	BlogID    uuid.UUID `gorm:"type:uuid;not null;index:idx_like_blog" json:"blogId"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index:idx_like_user" json:"userId"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
	
	Blog Blog `gorm:"foreignKey:BlogID" json:"-"`
}