package repository

import (
    "time"
    "blog-service/models"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type CommentRepository struct {
    db *gorm.DB
}

func NewCommentRepository(db *gorm.DB) *CommentRepository {
    return &CommentRepository{db: db}
}

// CreateComment kreira novi komentar
func (r *CommentRepository) CreateComment(comment *models.Comment) error {
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

// GetCommentByID vraća komentar po ID-u
func (r *CommentRepository) GetCommentByID(id uuid.UUID) (*models.Comment, error) {
    var comment models.Comment
    err := r.db.
        Preload("Replies", func(db *gorm.DB) *gorm.DB {
            return db.Order("created_at ASC")
        }).
        First(&comment, "id = ?", id).Error
    
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrNotFound
        }
        return nil, err
    }
    return &comment, nil
}

// GetCommentsByBlogID vraća komentare za blog
func (r *CommentRepository) GetCommentsByBlogID(blogID uuid.UUID, page, limit int) ([]models.Comment, int64, error) {
    var comments []models.Comment
    var total int64
    
    // Glavni komentari (bez parenta)
    query := r.db.Where("blog_id = ? AND parent_comment_id IS NULL", blogID)
    
    // Prebroj ukupno
    query.Model(&models.Comment{}).Count(&total)
    
    // Dohvati sa paginacijom
    offset := (page - 1) * limit
    err := query.
        Preload("Replies", func(db *gorm.DB) *gorm.DB {
            return db.Order("created_at ASC")
        }).
        Order("created_at DESC").
        Limit(limit).Offset(offset).
        Find(&comments).Error
    
    return comments, total, err
}

// GetRepliesByCommentID vraća odgovore na komentar
func (r *CommentRepository) GetRepliesByCommentID(commentID uuid.UUID) ([]models.Comment, error) {
    var replies []models.Comment
    err := r.db.Where("parent_comment_id = ?", commentID).
        Order("created_at ASC").
        Find(&replies).Error
    return replies, err
}

// UpdateComment ažurira komentar
func (r *CommentRepository) UpdateComment(comment *models.Comment) error {
    comment.UpdatedAt = time.Now()
    return r.db.Save(comment).Error
}

// DeleteComment briše komentar i sve odgovore
func (r *CommentRepository) DeleteComment(id uuid.UUID) error {
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

// GetCommentsByUserID vraća komentare određenog korisnika
func (r *CommentRepository) GetCommentsByUserID(userID uuid.UUID, page, limit int) ([]models.Comment, int64, error) {
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

// GetCommentCountByBlog vraća broj komentara za blog
func (r *CommentRepository) GetCommentCountByBlog(blogID uuid.UUID) (int64, error) {
    var count int64
    err := r.db.Model(&models.Comment{}).
        Where("blog_id = ?", blogID).
        Count(&count).Error
    return count, err
}