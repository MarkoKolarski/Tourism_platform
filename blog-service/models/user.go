package models

import (
	"time"
	"github.com/google/uuid"
)

type User struct {
	ID           int `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	FirstName    string    `json:"firstName"`
	LastName     string    `json:"lastName"`
	Role         string    `json:"role"` // "tourist", "guide", "admin"
	ProfileImage string    `json:"profileImage"`
	Bio          string    `json:"bio"`
	Motto        string    `json:"motto"`
	CreatedAt    time.Time `json:"createdAt"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}

type CreateUserRequest struct {
	Username  string `json:"username" binding:"required"`
	Email     string `json:"email" binding:"required"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Role      string `json:"role" binding:"required"`
	Password  string `json:"password" binding:"required"`
}