package repository

import (
    "time"
    "strings"
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

// CreateBlog kreira novi blog
func (r *BlogRepository) CreateBlog(blog *models.Blog) error {
    return r.db.Create(blog).Error
}

// GetBlogByID vraća blog po ID-u sa komentarima i lajkovima
func (r *BlogRepository) GetBlogByID(id uuid.UUID) (*models.Blog, error) {
    var blog models.Blog
    err := r.db.
        Preload("Comments", func(db *gorm.DB) *gorm.DB {
            return db.Order("created_at DESC")
        }).
        Preload("Likes").
        First(&blog, "id = ?", id).Error
    
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrNotFound
        }
        return nil, err
    }
    return &blog, nil
}

// GetAllBlogs vraća sve blogove sa paginacijom i filterima
func (r *BlogRepository) GetAllBlogs(page, limit int, search, userID string) ([]models.Blog, int64, error) {
    var blogs []models.Blog
    var total int64
    
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
    offset := (page - 1) * limit
    err := query.
        Preload("Comments", func(db *gorm.DB) *gorm.DB {
            return db.Limit(5).Order("created_at DESC")
        }).
        Order("created_at DESC").
        Limit(limit).Offset(offset).
        Find(&blogs).Error
    
    return blogs, total, err
}

// GetBlogsByUserID vraća blogove određenog korisnika
func (r *BlogRepository) GetBlogsByUserID(userID uuid.UUID) ([]models.Blog, error) {
    var blogs []models.Blog
    err := r.db.Where("user_id = ?", userID).
        Order("created_at DESC").
        Find(&blogs).Error
    return blogs, err
}

// UpdateBlog ažurira blog
func (r *BlogRepository) UpdateBlog(blog *models.Blog) error {
    blog.UpdatedAt = time.Now()
    return r.db.Save(blog).Error
}

// DeleteBlog briše blog i sve povezane podatke
func (r *BlogRepository) DeleteBlog(id uuid.UUID) error {
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
        // Proveri da li već postoji like
        var count int64
        if err := tx.Model(&models.BlogLike{}).
            Where("blog_id = ? AND user_id = ?", like.BlogID, like.UserID).
            Count(&count).Error; err != nil {
            return err
        }
        
        if count > 0 {
            return ErrAlreadyExists
        }
        
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

// HasLiked proverava da li je korisnik lajkovao blog
func (r *BlogRepository) HasLiked(blogID, userID uuid.UUID) (bool, error) {
    var count int64
    err := r.db.Model(&models.BlogLike{}).
        Where("blog_id = ? AND user_id = ?", blogID, userID).
        Count(&count).Error
    return count > 0, err
}

// GetLikesByBlog vraća sve lajkove za blog
func (r *BlogRepository) GetLikesByBlog(blogID uuid.UUID) ([]models.BlogLike, error) {
    var likes []models.BlogLike
    err := r.db.Where("blog_id = ?", blogID).
        Order("created_at DESC").
        Find(&likes).Error
    return likes, err
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