package repository

import (
	"errors"
	"strconv"
	"time"

	"blogs-service/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CommentRepository struct {
	db *gorm.DB
}

func NewCommentRepository(db *gorm.DB) *CommentRepository {
	return &CommentRepository{db: db}
}

// Create kreira novi komentar
func (r *CommentRepository) Create(comment *models.Comment) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Proveri da li blog postoji
		var blogCount int64
		if err := tx.Model(&models.Blog{}).
			Where("id = ?", comment.BlogID).
			Count(&blogCount).Error; err != nil {
			return err
		}

		if blogCount == 0 {
			return ErrNotFound
		}

		// Proveri parent komentar ako postoji
		if comment.ParentCommentID != nil {
			var parentCount int64
			if err := tx.Model(&models.Comment{}).
				Where("id = ?", comment.ParentCommentID).
				Count(&parentCount).Error; err != nil {
				return err
			}

			if parentCount == 0 {
				return ErrNotFound
			}
		}

		// Kreiraj komentar
		if err := tx.Create(comment).Error; err != nil {
			return err
		}

		// Povećaj broj komentara na blogu
		if err := tx.Model(&models.Blog{}).
			Where("id = ?", comment.BlogID).
			Update("comment_count", gorm.Expr("comment_count + 1")).Error; err != nil {
			return err
		}

		return nil
	})
}

// GetByID vraća komentar po ID-u
func (r *CommentRepository) GetByID(id uuid.UUID) (*models.Comment, error) {
	var comment models.Comment
	err := r.db.
		Preload("Replies", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		First(&comment, "id = ?", id).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, err
	}
	return &comment, nil
}

// GetByBlogID vraća komentare za blog
func (r *CommentRepository) GetByBlogID(blogID uuid.UUID, page, limit string) ([]models.Comment, int64, error) {
	var comments []models.Comment
	var total int64

	pageInt, _ := strconv.Atoi(page)
	limitInt, _ := strconv.Atoi(limit)

	if pageInt < 1 {
		pageInt = 1
	}
	if limitInt < 1 {
		limitInt = 10
	}

	// Glavni komentari (bez parenta)
	query := r.db.Where("blog_id = ? AND parent_comment_id IS NULL", blogID)

	// Prebroj ukupno
	query.Model(&models.Comment{}).Count(&total)

	// Dohvati sa paginacijom
	offset := (pageInt - 1) * limitInt
	err := query.
		Preload("Replies", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		Order("created_at DESC").
		Limit(limitInt).Offset(offset).
		Find(&comments).Error

	return comments, total, err
}

// Update ažurira komentar
func (r *CommentRepository) Update(comment *models.Comment) error {
	comment.UpdatedAt = time.Now()
	return r.db.Save(comment).Error
}

// Delete briše komentar i sve odgovore
func (r *CommentRepository) Delete(id uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Pronađi komentar da dobijemo blog_id
		var comment models.Comment
		if err := tx.First(&comment, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}

		// Izbroji koliko će se komentara obrisati (ovaj + odgovori)
		var count int64
		if err := tx.Model(&models.Comment{}).
			Where("id = ? OR parent_comment_id = ?", id, id).
			Count(&count).Error; err != nil {
			return err
		}

		// Obriši komentar i odgovore
		if err := tx.Where("id = ? OR parent_comment_id = ?", id, id).
			Delete(&models.Comment{}).Error; err != nil {
			return err
		}

		// Smanji broj komentara na blogu
		if err := tx.Model(&models.Blog{}).
			Where("id = ?", comment.BlogID).
			Update("comment_count", gorm.Expr("GREATEST(comment_count - ?, 0)", count)).Error; err != nil {
			return err
		}

		return nil
	})
}

// GetByUserID vraća komentare određenog korisnika
func (r *CommentRepository) GetByUserID(userID uuid.UUID, page, limit int) ([]models.Comment, int64, error) {
	var comments []models.Comment
	var total int64

	query := r.db.Where("user_id = ?", userID)

	// Prebroj ukupno
	query.Model(&models.Comment{}).Count(&total)

	// Dohvati sa paginacijom
	offset := (page - 1) * limit
	err := query.Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&comments).Error

	return comments, total, err
}
