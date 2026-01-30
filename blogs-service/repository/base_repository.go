package repository

import (
    "errors"
    "gorm.io/gorm"
)

var (
    ErrNotFound      = errors.New("record not found")
    ErrAlreadyExists = errors.New("record already exists")
)

type BaseRepository[T any] struct {
    db *gorm.DB
}

func NewBaseRepository[T any](db *gorm.DB) *BaseRepository[T] {
    return &BaseRepository[T]{db: db}
}

func (r *BaseRepository[T]) Create(model *T) error {
    return r.db.Create(model).Error
}

func (r *BaseRepository[T]) FindByID(id interface{}) (*T, error) {
    var model T
    result := r.db.First(&model, id)
    if result.Error != nil {
        if errors.Is(result.Error, gorm.ErrRecordNotFound) {
            return nil, ErrNotFound
        }
        return nil, result.Error
    }
    return &model, nil
}

func (r *BaseRepository[T]) Update(model *T) error {
    return r.db.Save(model).Error
}

func (r *BaseRepository[T]) Delete(id interface{}) error {
    var model T
    result := r.db.Delete(&model, id)
    if result.Error != nil {
        return result.Error
    }
    if result.RowsAffected == 0 {
        return ErrNotFound
    }
    return nil
}

func (r *BaseRepository[T]) Exists(id interface{}) (bool, error) {
    var count int64
    var model T
    result := r.db.Model(&model).Where("id = ?", id).Count(&count)
    if result.Error != nil {
        return false, result.Error
    }
    return count > 0, nil
}

func (r *BaseRepository[T]) GetAll(page, limit int) ([]T, int64, error) {
    var models []T
    var total int64
    
    //ukupno
    r.db.Model(&models).Count(&total)
    
    //sa paginacijom
    offset := (page - 1) * limit
    err := r.db.Limit(limit).Offset(offset).Find(&models).Error
    
    return models, total, err
}