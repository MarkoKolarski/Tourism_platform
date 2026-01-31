package models

import (
	"database/sql"
	"time"
)

type ExecutionStatus string

const (
	ExecutionActive    ExecutionStatus = "active"
	ExecutionCompleted ExecutionStatus = "completed"
	ExecutionAbandoned ExecutionStatus = "abandoned"
)

type TourExecution struct {
	ID             int             `json:"id"`
	TourID         int             `json:"tour_id"`
	TouristID      int             `json:"tourist_id"`
	Status         ExecutionStatus `json:"status"`
	StartLatitude  float64         `json:"start_latitude"`
	StartLongitude float64         `json:"start_longitude"`
	LastActivity   time.Time       `json:"last_activity"`
	CompletedAt    *time.Time      `json:"completed_at"`
	AbandonedAt    *time.Time      `json:"abandoned_at"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type CompletedKeyPoint struct {
	ID          int       `json:"id"`
	ExecutionID int       `json:"execution_id"`
	KeyPointID  int       `json:"key_point_id"`
	CompletedAt time.Time `json:"completed_at"`
	CreatedAt   time.Time `json:"created_at"`
}

type StartTourRequest struct {
	Latitude  float64 `json:"latitude" binding:"required"`
	Longitude float64 `json:"longitude" binding:"required"`
}

type UpdateLocationRequest struct {
	Latitude  float64 `json:"latitude" binding:"required"`
	Longitude float64 `json:"longitude" binding:"required"`
}

func CreateTourExecutionsTable(db *sql.DB) error {
	query := `
    CREATE TABLE IF NOT EXISTS tour_executions (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
        tourist_id INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
        start_latitude DECIMAL(10, 8) NOT NULL,
        start_longitude DECIMAL(11, 8) NOT NULL,
        last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        abandoned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`

	_, err := db.Exec(query)
	return err
}

func CreateCompletedKeyPointsTable(db *sql.DB) error {
	query := `
    CREATE TABLE IF NOT EXISTS completed_key_points (
        id SERIAL PRIMARY KEY,
        execution_id INTEGER NOT NULL REFERENCES tour_executions(id) ON DELETE CASCADE,
        key_point_id INTEGER NOT NULL REFERENCES key_points(id) ON DELETE CASCADE,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(execution_id, key_point_id)
    )`

	_, err := db.Exec(query)
	return err
}

func StartTourExecution(db *sql.DB, tourID int, touristID int, req StartTourRequest) (*TourExecution, error) {
	// Check if user already has an active tour execution
	var existingCount int
	checkQuery := `SELECT COUNT(*) FROM tour_executions WHERE tourist_id = $1 AND status = 'active'`
	err := db.QueryRow(checkQuery, touristID).Scan(&existingCount)
	if err != nil {
		return nil, err
	}

	if existingCount > 0 {
		return nil, sql.ErrNoRows // User already has active tour
	}

	query := `
    INSERT INTO tour_executions (tour_id, tourist_id, start_latitude, start_longitude, status, last_activity)
    VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP)
    RETURNING id, tour_id, tourist_id, status, start_latitude, start_longitude, 
              last_activity, completed_at, abandoned_at, created_at, updated_at`

	var exec TourExecution
	err = db.QueryRow(query, tourID, touristID, req.Latitude, req.Longitude).Scan(
		&exec.ID, &exec.TourID, &exec.TouristID, &exec.Status,
		&exec.StartLatitude, &exec.StartLongitude, &exec.LastActivity,
		&exec.CompletedAt, &exec.AbandonedAt, &exec.CreatedAt, &exec.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &exec, nil
}

func GetActiveTourExecution(db *sql.DB, touristID int) (*TourExecution, error) {
	query := `
    SELECT id, tour_id, tourist_id, status, start_latitude, start_longitude,
           last_activity, completed_at, abandoned_at, created_at, updated_at
    FROM tour_executions 
    WHERE tourist_id = $1 AND status = 'active'
    ORDER BY created_at DESC LIMIT 1`

	var exec TourExecution
	err := db.QueryRow(query, touristID).Scan(
		&exec.ID, &exec.TourID, &exec.TouristID, &exec.Status,
		&exec.StartLatitude, &exec.StartLongitude, &exec.LastActivity,
		&exec.CompletedAt, &exec.AbandonedAt, &exec.CreatedAt, &exec.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &exec, nil
}

func UpdateLastActivity(db *sql.DB, executionID int) error {
	query := `UPDATE tour_executions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := db.Exec(query, executionID)
	return err
}

func CompleteTourExecution(db *sql.DB, executionID int) error {
	query := `
    UPDATE tour_executions 
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND status = 'active'`

	result, err := db.Exec(query, executionID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func AbandonTourExecution(db *sql.DB, executionID int) error {
	query := `
    UPDATE tour_executions 
    SET status = 'abandoned', abandoned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND status = 'active'`

	result, err := db.Exec(query, executionID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func MarkKeyPointCompleted(db *sql.DB, executionID int, keyPointID int) error {
	query := `
    INSERT INTO completed_key_points (execution_id, key_point_id)
    VALUES ($1, $2)
    ON CONFLICT (execution_id, key_point_id) DO NOTHING`

	_, err := db.Exec(query, executionID, keyPointID)
	return err
}

func GetCompletedKeyPoints(db *sql.DB, executionID int) ([]CompletedKeyPoint, error) {
	query := `
    SELECT id, execution_id, key_point_id, completed_at, created_at
    FROM completed_key_points WHERE execution_id = $1
    ORDER BY completed_at ASC`

	rows, err := db.Query(query, executionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var completed []CompletedKeyPoint
	for rows.Next() {
		var ckp CompletedKeyPoint
		err := rows.Scan(&ckp.ID, &ckp.ExecutionID, &ckp.KeyPointID, &ckp.CompletedAt, &ckp.CreatedAt)
		if err != nil {
			return nil, err
		}
		completed = append(completed, ckp)
	}

	return completed, nil
}
