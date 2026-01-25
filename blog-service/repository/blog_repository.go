package repository

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"blog-service/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BlogRepository struct {
	db *gorm.DB
}

func NewBlogRepository(db *gorm.DB) *BlogRepository {
	return &BlogRepository{db: db}
}

// Create kreira novi blog
func (r *BlogRepository) Create(blog *models.Blog) error {
	return r.db.Create(blog).Error
}

// GetByID vraća blog po ID-u sa komentarima i lajkovima
func (r *BlogRepository) GetByID(id uuid.UUID) (*models.Blog, error) {
	var blog models.Blog
	err := r.db.
		Preload("Comments", func(db *gorm.DB) *gorm.DB {
			return db.Where("parent_comment_id IS NULL").Order("created_at DESC")
		}).
		Preload("Comments.Replies").
		Preload("Likes").
		First(&blog, "id = ?", id).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, err
	}
	return &blog, nil
}

// GetAll vraća sve blogove sa paginacijom i filterima
func (r *BlogRepository) GetAll(page, limit, search, userID string) ([]models.Blog, int64, error) {
	var blogs []models.Blog
	var total int64

	pageInt, _ := strconv.Atoi(page)
	limitInt, _ := strconv.Atoi(limit)

	if pageInt < 1 {
		pageInt = 1
	}
	if limitInt < 1 {
		limitInt = 10
	}

	query := r.db.Model(&models.Blog{})

	// Apliciraj filtere
	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(content) LIKE ?", searchTerm, searchTerm)
	}

	if userID != "" {
		uuidUserID, err := uuid.Parse(userID)
		if err == nil {
			query = query.Where("user_id = ?", uuidUserID)
		}
	}

	// Prebroj ukupno
	query.Count(&total)

	// Dohvati sa paginacijom
	offset := (pageInt - 1) * limitInt
	err := query.
		Preload("Comments", func(db *gorm.DB) *gorm.DB {
			return db.Where("parent_comment_id IS NULL").Limit(5).Order("created_at DESC")
		}).
		Order("created_at DESC").
		Limit(limitInt).Offset(offset).
		Find(&blogs).Error

	return blogs, total, err
}

// GetByUserID vraća blogove određenog korisnika
func (r *BlogRepository) GetByUserID(userID uuid.UUID) ([]models.Blog, error) {
	var blogs []models.Blog
	err := r.db.Where("userId = ?", userID).  //err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&blogs).Error
	return blogs, err
}

// Update ažurira blog
func (r *BlogRepository) Update(blog *models.Blog) error {
	blog.UpdatedAt = time.Now()
	return r.db.Save(blog).Error
}

// Delete briše blog i sve povezane podatke
func (r *BlogRepository) Delete(id uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Obriši komentare
		if err := tx.Where("blog_id = ?", id).Delete(&models.Comment{}).Error; err != nil {
			return err
		}

		// Obriši lajkove
		if err := tx.Where("blog_id = ?", id).Delete(&models.BlogLike{}).Error; err != nil {
			return err
		}

		// Obriši blog
		if err := tx.Delete(&models.Blog{}, "id = ?", id).Error; err != nil {
			return err
		}

		return nil
	})
}

// AddLike dodaje lajk blogu
func (r *BlogRepository) AddLike(like *models.BlogLike) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Dodaj like
		if err := tx.Create(like).Error; err != nil {
			return err
		}

		// Povećaj broj lajkova na blogu
		if err := tx.Model(&models.Blog{}).
			Where("id = ?", like.BlogID).
			Update("like_count", gorm.Expr("like_count + 1")).Error; err != nil {
			return err
		}

		return nil
	})
}

// RemoveLike uklanja lajk sa bloga
func (r *BlogRepository) RemoveLike(blogID, userID uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Ukloni like
		result := tx.Where("blog_id = ? AND user_id = ?", blogID, userID).
			Delete(&models.BlogLike{})

		if result.Error != nil {
			return result.Error
		}

		if result.RowsAffected == 0 {
			return ErrNotFound
		}

		// Smanji broj lajkova na blogu
		if err := tx.Model(&models.Blog{}).
			Where("id = ?", blogID).
			Update("like_count", gorm.Expr("GREATEST(like_count - 1, 0)")).Error; err != nil {
			return err
		}

		return nil
	})
}

// HasUserLiked proverava da li je korisnik lajkovao blog
func (r *BlogRepository) HasUserLiked(blogID, userID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.BlogLike{}).
		Where("blog_id = ? AND user_id = ?", blogID, userID).
		Count(&count).Error
	return count > 0, err
}

// GetLikeCount vraća broj lajkova za blog
func (r *BlogRepository) GetLikeCount(blogID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&models.BlogLike{}).
		Where("blog_id = ?", blogID).
		Count(&count).Error
	return count, err
}

// IncrementCommentCount povećava broj komentara na blogu
func (r *BlogRepository) IncrementCommentCount(blogID uuid.UUID) error {
	return r.db.Model(&models.Blog{}).
		Where("id = ?", blogID).
		Update("comment_count", gorm.Expr("comment_count + 1")).Error
}

// DecrementCommentCount smanjuje broj komentara na blogu
func (r *BlogRepository) DecrementCommentCount(blogID uuid.UUID) error {
	return r.db.Model(&models.Blog{}).
		Where("id = ?", blogID).
		Update("comment_count", gorm.Expr("GREATEST(comment_count - 1, 0)")).Error
}

// SearchBlogs pretražuje blogove po naslovu i sadržaju
func (r *BlogRepository) SearchBlogs(query string, limit int) ([]models.Blog, error) {
	var blogs []models.Blog
	searchTerm := "%" + strings.ToLower(query) + "%"

	err := r.db.Where("LOWER(title) LIKE ? OR LOWER(content) LIKE ?", searchTerm, searchTerm).
		Order("created_at DESC").
		Limit(limit).
		Find(&blogs).Error

	return blogs, err
}

// UpdateStatus ažurira status bloga
func (r *BlogRepository) UpdateStatus(blogID uuid.UUID, status string) error {
	return r.db.Model(&models.Blog{}).
		Where("id = ?", blogID).
		Update("status", status).Error
}