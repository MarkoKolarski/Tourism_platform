package models

import (
	"database/sql"
	"time"
)

type TransportType string

const (
	TransportWalking TransportType = "walking"
	TransportBicycle TransportType = "bicycle"
	TransportCar     TransportType = "car"
)

type TravelTime struct {
	ID            int           `json:"id"`
	TourID        int           `json:"tour_id"`
	TransportType TransportType `json:"transport_type"`
	DurationMin   int           `json:"duration_min"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

type CreateTravelTimeRequest struct {
	TransportType string `json:"transport_type" binding:"required,oneof=walking bicycle car"`
	DurationMin   int    `json:"duration_min" binding:"required,min=1"`
}

func CreateTravelTimesTable(db *sql.DB) error {
	query := `
    CREATE TABLE IF NOT EXISTS travel_times (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
        transport_type VARCHAR(20) NOT NULL CHECK (transport_type IN ('walking', 'bicycle', 'car')),
        duration_min INTEGER NOT NULL CHECK (duration_min > 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tour_id, transport_type)
    )`

	_, err := db.Exec(query)
	return err
}

func GetTravelTimesByTourID(db *sql.DB, tourID int) ([]TravelTime, error) {
	query := `
    SELECT id, tour_id, transport_type, duration_min, created_at, updated_at
    FROM travel_times WHERE tour_id = $1`

	rows, err := db.Query(query, tourID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var travelTimes []TravelTime
	for rows.Next() {
		var tt TravelTime
		err := rows.Scan(
			&tt.ID, &tt.TourID, &tt.TransportType, &tt.DurationMin,
			&tt.CreatedAt, &tt.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		travelTimes = append(travelTimes, tt)
	}

	return travelTimes, nil
}

func CreateTravelTime(db *sql.DB, tourID int, req CreateTravelTimeRequest) (*TravelTime, error) {
	query := `
    INSERT INTO travel_times (tour_id, transport_type, duration_min)
    VALUES ($1, $2, $3)
    ON CONFLICT (tour_id, transport_type) 
    DO UPDATE SET duration_min = $3, updated_at = CURRENT_TIMESTAMP
    RETURNING id, tour_id, transport_type, duration_min, created_at, updated_at`

	var tt TravelTime
	err := db.QueryRow(query, tourID, req.TransportType, req.DurationMin).Scan(
		&tt.ID, &tt.TourID, &tt.TransportType, &tt.DurationMin,
		&tt.CreatedAt, &tt.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &tt, nil
}

func DeleteTravelTime(db *sql.DB, id int, tourID int) error {
	query := `DELETE FROM travel_times WHERE id = $1 AND tour_id = $2`
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
