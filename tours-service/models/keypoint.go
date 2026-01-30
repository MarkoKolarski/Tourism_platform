package models

import (
	"database/sql"
	"math"
	"time"
)

type KeyPoint struct {
	ID          int       `json:"id"`
	TourID      int       `json:"tour_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	ImageURL    string    `json:"image_url"`
	Order       int       `json:"order"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateKeyPointRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description" binding:"required"`
	Latitude    float64 `json:"latitude" binding:"required"`
	Longitude   float64 `json:"longitude" binding:"required"`
	ImageURL    string  `json:"image_url"`
	Order       int     `json:"order" binding:"required"`
}

type UpdateKeyPointRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	ImageURL    string  `json:"image_url"`
	Order       int     `json:"order"`
}

func CreateKeyPointsTable(db *sql.DB) error {
	query := `
    CREATE TABLE IF NOT EXISTS key_points (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        image_url TEXT,
        "order" INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`

	_, err := db.Exec(query)
	return err
}

func GetKeyPointsByTourID(db *sql.DB, tourID int) ([]KeyPoint, error) {
	query := `
    SELECT id, tour_id, name, description, latitude, longitude, image_url, "order", created_at, updated_at
    FROM key_points WHERE tour_id = $1 ORDER BY "order" ASC`

	rows, err := db.Query(query, tourID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keyPoints []KeyPoint
	for rows.Next() {
		var kp KeyPoint
		err := rows.Scan(
			&kp.ID, &kp.TourID, &kp.Name, &kp.Description,
			&kp.Latitude, &kp.Longitude, &kp.ImageURL, &kp.Order,
			&kp.CreatedAt, &kp.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		keyPoints = append(keyPoints, kp)
	}

	return keyPoints, nil
}

func CreateKeyPoint(db *sql.DB, tourID int, req CreateKeyPointRequest) (*KeyPoint, error) {
	// Insert key point
	query := `
    INSERT INTO key_points (tour_id, name, description, latitude, longitude, image_url, "order")
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, tour_id, name, description, latitude, longitude, image_url, "order", created_at, updated_at`

	var kp KeyPoint
	err := db.QueryRow(
		query, tourID, req.Name, req.Description, req.Latitude, req.Longitude, req.ImageURL, req.Order,
	).Scan(
		&kp.ID, &kp.TourID, &kp.Name, &kp.Description,
		&kp.Latitude, &kp.Longitude, &kp.ImageURL, &kp.Order,
		&kp.CreatedAt, &kp.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// After adding, recalculate tour length if more than 1 key point
	keyPoints, err := GetKeyPointsByTourID(db, tourID)
	if err == nil && len(keyPoints) > 1 {
		length := calculateTourLengthKm(keyPoints)
		updateTourLength(db, tourID, length)
	}

	return &kp, nil
}

// Helper: Haversine formula for distance in km
func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371 // Earth radius in km
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	lat1R := lat1 * math.Pi / 180
	lat2R := lat2 * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Sin(dLon/2)*math.Sin(dLon/2)*math.Cos(lat1R)*math.Cos(lat2R)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

func calculateTourLengthKm(keyPoints []KeyPoint) float64 {
	var total float64
	for i := 1; i < len(keyPoints); i++ {
		total += haversine(
			keyPoints[i-1].Latitude, keyPoints[i-1].Longitude,
			keyPoints[i].Latitude, keyPoints[i].Longitude,
		)
	}
	return math.Round(total*100) / 100 // round to 2 decimals
}

func updateTourLength(db *sql.DB, tourID int, length float64) {
	_, _ = db.Exec(`UPDATE tours SET total_length_km = $1 WHERE id = $2`, length, tourID)
}

func UpdateKeyPoint(db *sql.DB, id int, tourID int, req UpdateKeyPointRequest) (*KeyPoint, error) {
	query := `
    UPDATE key_points 
    SET name = COALESCE(NULLIF($1, ''), name),
        description = COALESCE(NULLIF($2, ''), description),
        latitude = CASE WHEN $3 != 0 THEN $3 ELSE latitude END,
        longitude = CASE WHEN $4 != 0 THEN $4 ELSE longitude END,
        image_url = COALESCE(NULLIF($5, ''), image_url),
        "order" = CASE WHEN $6 > 0 THEN $6 ELSE "order" END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $7 AND tour_id = $8
    RETURNING id, tour_id, name, description, latitude, longitude, image_url, "order", created_at, updated_at`

	var kp KeyPoint
	err := db.QueryRow(
		query, req.Name, req.Description, req.Latitude, req.Longitude, req.ImageURL, req.Order, id, tourID,
	).Scan(
		&kp.ID, &kp.TourID, &kp.Name, &kp.Description,
		&kp.Latitude, &kp.Longitude, &kp.ImageURL, &kp.Order,
		&kp.CreatedAt, &kp.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &kp, nil
}

func DeleteKeyPoint(db *sql.DB, id int, tourID int) error {
	query := `DELETE FROM key_points WHERE id = $1 AND tour_id = $2`
	result, err := db.Exec(query, id, tourID)
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
