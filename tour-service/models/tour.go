package models

import (
	"database/sql"
	"time"
)

type Tour struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	Duration    int       `json:"duration"` // in days
	MaxGuests   int       `json:"max_guests"`
	AuthorID    int       `json:"author_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateTourRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description" binding:"required"`
	Price       float64 `json:"price" binding:"required"`
	Duration    int     `json:"duration" binding:"required"`
	MaxGuests   int     `json:"max_guests" binding:"required"`
}

type UpdateTourRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Duration    int     `json:"duration"`
	MaxGuests   int     `json:"max_guests"`
}

func CreateToursTable(db *sql.DB) error {
	query := `
    CREATE TABLE IF NOT EXISTS tours (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        duration INTEGER NOT NULL,
        max_guests INTEGER NOT NULL,
        author_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`

	_, err := db.Exec(query)
	return err
}

func GetAllTours(db *sql.DB) ([]Tour, error) {
	query := `
    SELECT id, name, description, price, duration, max_guests, author_id, created_at, updated_at
    FROM tours ORDER BY created_at DESC`

	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tours []Tour
	for rows.Next() {
		var tour Tour
		err := rows.Scan(
			&tour.ID, &tour.Name, &tour.Description, &tour.Price,
			&tour.Duration, &tour.MaxGuests, &tour.AuthorID,
			&tour.CreatedAt, &tour.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		tours = append(tours, tour)
	}

	return tours, nil
}

func GetTourByID(db *sql.DB, id int) (*Tour, error) {
	query := `
    SELECT id, name, description, price, duration, max_guests, author_id, created_at, updated_at
    FROM tours WHERE id = $1`

	var tour Tour
	err := db.QueryRow(query, id).Scan(
		&tour.ID, &tour.Name, &tour.Description, &tour.Price,
		&tour.Duration, &tour.MaxGuests, &tour.AuthorID,
		&tour.CreatedAt, &tour.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &tour, nil
}

func CreateTour(db *sql.DB, req CreateTourRequest, authorID int) (*Tour, error) {
	query := `
    INSERT INTO tours (name, description, price, duration, max_guests, author_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, description, price, duration, max_guests, author_id, created_at, updated_at`

	var tour Tour
	err := db.QueryRow(
		query, req.Name, req.Description, req.Price, req.Duration, req.MaxGuests, authorID,
	).Scan(
		&tour.ID, &tour.Name, &tour.Description, &tour.Price,
		&tour.Duration, &tour.MaxGuests, &tour.AuthorID,
		&tour.CreatedAt, &tour.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &tour, nil
}

func UpdateTour(db *sql.DB, id int, req UpdateTourRequest, authorID int) (*Tour, error) {
	query := `
    UPDATE tours 
    SET name = $1, description = $2, price = $3, duration = $4, max_guests = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6 AND author_id = $7
    RETURNING id, name, description, price, duration, max_guests, author_id, created_at, updated_at`

	var tour Tour
	err := db.QueryRow(
		query, req.Name, req.Description, req.Price, req.Duration, req.MaxGuests, id, authorID,
	).Scan(
		&tour.ID, &tour.Name, &tour.Description, &tour.Price,
		&tour.Duration, &tour.MaxGuests, &tour.AuthorID,
		&tour.CreatedAt, &tour.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &tour, nil
}

func DeleteTour(db *sql.DB, id int, authorID int) error {
	query := `DELETE FROM tours WHERE id = $1 AND author_id = $2`
	result, err := db.Exec(query, id, authorID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}
