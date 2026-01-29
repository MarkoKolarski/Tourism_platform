package models

import (
	"database/sql"
	"time"

	"github.com/lib/pq"
)

type Review struct {
	ID        int       `json:"id"`
	TourID    int       `json:"tour_id"`
	TouristID int       `json:"tourist_id"`
	Rating    int       `json:"rating"` // 1-5
	Comment   string    `json:"comment"`
	VisitDate time.Time `json:"visit_date"`
	Images    []string  `json:"images"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateReviewRequest struct {
	Rating    int      `json:"rating" binding:"required,min=1,max=5"`
	Comment   string   `json:"comment" binding:"required"`
	VisitDate string   `json:"visit_date" binding:"required"`
	Images    []string `json:"images"`
}

func CreateReviewsTable(db *sql.DB) error {
	query := `
    CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
        tourist_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT NOT NULL,
        visit_date DATE NOT NULL,
        images TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`

	_, err := db.Exec(query)
	return err
}

func GetReviewsByTourID(db *sql.DB, tourID int) ([]Review, error) {
	query := `
    SELECT id, tour_id, tourist_id, rating, comment, visit_date, images, created_at, updated_at
    FROM reviews WHERE tour_id = $1 ORDER BY created_at DESC`

	rows, err := db.Query(query, tourID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []Review
	for rows.Next() {
		var review Review
		err := rows.Scan(
			&review.ID, &review.TourID, &review.TouristID, &review.Rating,
			&review.Comment, &review.VisitDate, pq.Array(&review.Images),
			&review.CreatedAt, &review.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		reviews = append(reviews, review)
	}

	return reviews, nil
}

func CreateReview(db *sql.DB, tourID int, touristID int, req CreateReviewRequest) (*Review, error) {
	query := `
    INSERT INTO reviews (tour_id, tourist_id, rating, comment, visit_date, images)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, tour_id, tourist_id, rating, comment, visit_date, images, created_at, updated_at`

	var review Review
	err := db.QueryRow(
		query, tourID, touristID, req.Rating, req.Comment, req.VisitDate, pq.Array(req.Images),
	).Scan(
		&review.ID, &review.TourID, &review.TouristID, &review.Rating,
		&review.Comment, &review.VisitDate, pq.Array(&review.Images),
		&review.CreatedAt, &review.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &review, nil
}
