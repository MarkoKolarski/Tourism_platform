package models

import (
	"database/sql"
	"time"
)

type CurrentLocation struct {
	ID         int       `json:"id"`
	UserID     int       `json:"user_id"`
	Latitude   float64   `json:"latitude"`
	Longitude  float64   `json:"longitude"`
	RecordedAt time.Time `json:"recorded_at"`
	CreatedAt  time.Time `json:"created_at"`
}

type LocationUpdateRequest struct {
	Latitude  float64 `json:"latitude" binding:"required,min=-90,max=90"`
	Longitude float64 `json:"longitude" binding:"required,min=-180,max=180"`
}

type LocationSimulatorResponse struct {
	UserID          int              `json:"user_id"`
	Username        string           `json:"username"`
	CurrentLocation *CurrentLocation `json:"current_location"`
	HasLocation     bool             `json:"has_location"`
}

func CreateCurrentLocationsTable(db *sql.DB) error {
	query := `
    CREATE TABLE IF NOT EXISTS current_locations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
        longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`

	_, err := db.Exec(query)
	return err
}

func GetCurrentLocationByUserID(db *sql.DB, userID int) (*CurrentLocation, error) {
	query := `
    SELECT id, user_id, latitude, longitude, recorded_at, created_at
    FROM current_locations 
    WHERE user_id = $1`

	var location CurrentLocation
	err := db.QueryRow(query, userID).Scan(
		&location.ID, &location.UserID, &location.Latitude,
		&location.Longitude, &location.RecordedAt, &location.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &location, nil
}

func UpdateCurrentLocation(db *sql.DB, userID int, req LocationUpdateRequest) (*CurrentLocation, error) {
	query := `
    INSERT INTO current_locations (user_id, latitude, longitude, recorded_at)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        latitude = $2,
        longitude = $3,
        recorded_at = CURRENT_TIMESTAMP
    RETURNING id, user_id, latitude, longitude, recorded_at, created_at`

	var location CurrentLocation
	err := db.QueryRow(query, userID, req.Latitude, req.Longitude).Scan(
		&location.ID, &location.UserID, &location.Latitude,
		&location.Longitude, &location.RecordedAt, &location.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &location, nil
}

func DeleteCurrentLocation(db *sql.DB, userID int) (int, error) {
	query := `DELETE FROM current_locations WHERE user_id = $1`
	result, err := db.Exec(query, userID)
	if err != nil {
		return 0, err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}

	return int(rows), nil
}
