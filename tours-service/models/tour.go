package models

import (
	"database/sql"
	"log"
	"time"

	"github.com/lib/pq"
)

type TourStatus string

const (
	StatusDraft     TourStatus = "draft"
	StatusPublished TourStatus = "published"
	StatusArchived  TourStatus = "archived"
)

type Tour struct {
	ID            int        `json:"id"`
	Name          string     `json:"name"`
	Description   string     `json:"description"`
	Difficulty    int        `json:"difficulty"` // 1-3 (easy, medium, hard)
	Tags          []string   `json:"tags"`
	Price         float64    `json:"price"`
	Status        TourStatus `json:"status"`
	TotalLengthKm float64    `json:"total_length_km"`
	AuthorID      int        `json:"author_id"`
	PublishedAt   *time.Time `json:"published_at"`
	ArchivedAt    *time.Time `json:"archived_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type CreateTourRequest struct {
	Name        string   `json:"name" binding:"required"`
	Description string   `json:"description" binding:"required"`
	Difficulty  int      `json:"difficulty" binding:"required,min=1,max=3"`
	Tags        []string `json:"tags" binding:"required"`
}

type UpdateTourRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Difficulty  int      `json:"difficulty"`
	Tags        []string `json:"tags"`
	Price       float64  `json:"price"`
	Status      string   `json:"status"`
}

func CreateToursTable(db *sql.DB) error {
	// Drop and recreate to ensure schema is correct
	dropQuery := `DROP TABLE IF EXISTS tours CASCADE`
	_, err := db.Exec(dropQuery)
	if err != nil {
		return err
	}

	query := `
    CREATE TABLE tours (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
        tags TEXT[] NOT NULL DEFAULT '{}',
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        total_length_km DECIMAL(10,2) NOT NULL DEFAULT 0,
        author_id INTEGER NOT NULL,
        published_at TIMESTAMP,
        archived_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`

	_, err = db.Exec(query)
	return err
}

func MigrateToursTable(db *sql.DB) error {
	// Add updated_at column if it doesn't exist
	query := `
	DO $$ 
	BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'tours' AND column_name = 'updated_at'
		) THEN
			ALTER TABLE tours ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
		END IF;
	END $$;
	`
	_, err := db.Exec(query)
	return err
}

func GetAllTours(db *sql.DB) ([]Tour, error) {
	query := `
    SELECT id, name, description, difficulty, tags, price, status, total_length_km, 
           author_id, published_at, archived_at, created_at, updated_at
    FROM tours 
    WHERE status = 'published'
    ORDER BY created_at DESC`

	log.Println("GetAllTours: Executing query")
	rows, err := db.Query(query)
	if err != nil {
		log.Printf("GetAllTours: Query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	tours := []Tour{} // Initialize as empty slice instead of nil
	for rows.Next() {
		var tour Tour
		err := rows.Scan(
			&tour.ID, &tour.Name, &tour.Description, &tour.Difficulty,
			pq.Array(&tour.Tags), &tour.Price, &tour.Status, &tour.TotalLengthKm,
			&tour.AuthorID, &tour.PublishedAt, &tour.ArchivedAt,
			&tour.CreatedAt, &tour.UpdatedAt,
		)
		if err != nil {
			log.Printf("GetAllTours: Row scan error: %v", err)
			return nil, err
		}
		tours = append(tours, tour)
	}

	if err = rows.Err(); err != nil {
		log.Printf("GetAllTours: Rows iteration error: %v", err)
		return nil, err
	}

	log.Printf("GetAllTours: Successfully fetched %d tours", len(tours))
	return tours, nil
}

func GetTourByID(db *sql.DB, id int) (*Tour, error) {
	query := `
    SELECT id, name, description, difficulty, tags, price, status, total_length_km,
           author_id, published_at, archived_at, created_at, updated_at
    FROM tours WHERE id = $1`

	var tour Tour
	err := db.QueryRow(query, id).Scan(
		&tour.ID, &tour.Name, &tour.Description, &tour.Difficulty,
		pq.Array(&tour.Tags), &tour.Price, &tour.Status, &tour.TotalLengthKm,
		&tour.AuthorID, &tour.PublishedAt, &tour.ArchivedAt,
		&tour.CreatedAt, &tour.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &tour, nil
}

func CreateTour(db *sql.DB, req CreateTourRequest, authorID int) (*Tour, error) {
	query := `
    INSERT INTO tours (name, description, difficulty, tags, author_id, price, status)
    VALUES ($1, $2, $3, $4, $5, 0, 'draft')
    RETURNING id, name, description, difficulty, tags, price, status, total_length_km,
              author_id, published_at, archived_at, created_at, updated_at`

	var tour Tour
	err := db.QueryRow(
		query, req.Name, req.Description, req.Difficulty, pq.Array(req.Tags), authorID,
	).Scan(
		&tour.ID, &tour.Name, &tour.Description, &tour.Difficulty,
		pq.Array(&tour.Tags), &tour.Price, &tour.Status, &tour.TotalLengthKm,
		&tour.AuthorID, &tour.PublishedAt, &tour.ArchivedAt,
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
    SET name = COALESCE(NULLIF($1, ''), name),
        description = COALESCE(NULLIF($2, ''), description),
        difficulty = CASE WHEN $3 > 0 THEN $3 ELSE difficulty END,
        tags = CASE WHEN $4::text[] IS NOT NULL THEN $4 ELSE tags END,
        price = CASE WHEN $5 >= 0 THEN $5 ELSE price END,
        status = CASE WHEN $6 != '' THEN $6::VARCHAR ELSE status END,
        published_at = CASE WHEN $6 = 'published' AND published_at IS NULL THEN CURRENT_TIMESTAMP ELSE published_at END,
        archived_at = CASE WHEN $6 = 'archived' AND archived_at IS NULL THEN CURRENT_TIMESTAMP ELSE archived_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $7 AND author_id = $8
    RETURNING id, name, description, difficulty, tags, price, status, total_length_km,
              author_id, published_at, archived_at, created_at, updated_at`

	var tour Tour
	err := db.QueryRow(
		query, req.Name, req.Description, req.Difficulty, pq.Array(req.Tags),
		req.Price, req.Status, id, authorID,
	).Scan(
		&tour.ID, &tour.Name, &tour.Description, &tour.Difficulty,
		pq.Array(&tour.Tags), &tour.Price, &tour.Status, &tour.TotalLengthKm,
		&tour.AuthorID, &tour.PublishedAt, &tour.ArchivedAt,
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

func GetToursByAuthor(db *sql.DB, authorID int) ([]Tour, error) {
	query := `
    SELECT id, name, description, difficulty, tags, price, status, total_length_km,
           author_id, published_at, archived_at, created_at, updated_at
    FROM tours WHERE author_id = $1 ORDER BY created_at DESC`

	rows, err := db.Query(query, authorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tours := []Tour{} // Initialize as empty slice instead of nil
	for rows.Next() {
		var tour Tour
		err := rows.Scan(
			&tour.ID, &tour.Name, &tour.Description, &tour.Difficulty,
			pq.Array(&tour.Tags), &tour.Price, &tour.Status, &tour.TotalLengthKm,
			&tour.AuthorID, &tour.PublishedAt, &tour.ArchivedAt,
			&tour.CreatedAt, &tour.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		tours = append(tours, tour)
	}

	return tours, nil
}

func CanPublishTour(db *sql.DB, tourID int) (bool, string, error) {
	// Check if tour has at least 2 key points
	keyPoints, err := GetKeyPointsByTourID(db, tourID)
	if err != nil {
		return false, "", err
	}

	if len(keyPoints) < 2 {
		return false, "Tour must have at least 2 key points", nil
	}

	// Check if tour has at least one travel time
	travelTimes, err := GetTravelTimesByTourID(db, tourID)
	if err != nil {
		return false, "", err
	}

	if len(travelTimes) == 0 {
		return false, "Tour must have at least one travel time defined", nil
	}

	return true, "", nil
}

func PublishTour(db *sql.DB, tourID int, authorID int) (*Tour, error) {
	// First validate
	canPublish, _, err := CanPublishTour(db, tourID)
	if err != nil {
		return nil, err
	}

	if !canPublish {
		return nil, sql.ErrNoRows // Will be handled with custom error message
	}

	query := `
    UPDATE tours 
    SET status = 'published', 
        published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
        archived_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND author_id = $2
    RETURNING id, name, description, difficulty, tags, price, status, total_length_km,
              author_id, published_at, archived_at, created_at, updated_at`

	var tour Tour
	err = db.QueryRow(query, tourID, authorID).Scan(
		&tour.ID, &tour.Name, &tour.Description, &tour.Difficulty,
		pq.Array(&tour.Tags), &tour.Price, &tour.Status, &tour.TotalLengthKm,
		&tour.AuthorID, &tour.PublishedAt, &tour.ArchivedAt,
		&tour.CreatedAt, &tour.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &tour, nil
}

func ArchiveTour(db *sql.DB, tourID int, authorID int) (*Tour, error) {
	query := `
    UPDATE tours 
    SET status = 'archived',
        archived_at = COALESCE(archived_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND author_id = $2 AND status = 'published'
    RETURNING id, name, description, difficulty, tags, price, status, total_length_km,
              author_id, published_at, archived_at, created_at, updated_at`

	var tour Tour
	err := db.QueryRow(query, tourID, authorID).Scan(
		&tour.ID, &tour.Name, &tour.Description, &tour.Difficulty,
		pq.Array(&tour.Tags), &tour.Price, &tour.Status, &tour.TotalLengthKm,
		&tour.AuthorID, &tour.PublishedAt, &tour.ArchivedAt,
		&tour.CreatedAt, &tour.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &tour, nil
}

func GetToursForTourists(db *sql.DB) ([]map[string]interface{}, error) {
	query := `
    SELECT id, name, description, difficulty, tags, price, status, created_at
    FROM tours WHERE status = $1`

	rows, err := db.Query(query, StatusPublished)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var toursData []map[string]interface{}
	for rows.Next() {
		var tour Tour
		err := rows.Scan(
			&tour.ID, &tour.Name, &tour.Description, &tour.Difficulty,
			pq.Array(&tour.Tags), &tour.Price, &tour.Status, &tour.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		var firstKeypoint *map[string]interface{}
		keypoints, err := GetKeyPointsByTourID(db, tour.ID)
		if err == nil && len(keypoints) > 0 {
			for _, kp := range keypoints {
				if kp.Order == 1 {
					firstKeypoint = &map[string]interface{}{
						"name":      kp.Name,
						"latitude":  kp.Latitude,
						"longitude": kp.Longitude,
						"image_url": kp.ImageURL,
					}
					break
				}
			}
		}

		tourData := map[string]interface{}{
			"id":          tour.ID,
			"name":        tour.Name,
			"description": tour.Description,
			"difficulty":  tour.Difficulty,
			"tags":        tour.Tags,
			"status":      tour.Status,
			"price":       tour.Price,
			"total_length_km": tour.TotalLengthKm,
			"created_at":  tour.CreatedAt.Format(time.RFC3339),
			"first_keypoint": firstKeypoint,
		}

		toursData = append(toursData, tourData)
	}

	return toursData, nil
}

func GetToursByStatus(db *sql.DB, status string) ([]Tour, error) {
	query := `
    SELECT id, name, description, difficulty, tags, price, status, total_length_km,
           author_id, published_at, archived_at, created_at, updated_at
    FROM tours WHERE status = $1`

	rows, err := db.Query(query, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tours []Tour
	for rows.Next() {
		var tour Tour
		err := rows.Scan(
			&tour.ID, &tour.Name, &tour.Description, &tour.Difficulty,
			pq.Array(&tour.Tags), &tour.Price, &tour.Status, &tour.TotalLengthKm,
			&tour.AuthorID, &tour.PublishedAt, &tour.ArchivedAt,
			&tour.CreatedAt, &tour.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		tours = append(tours, tour)
	}

	return tours, nil
}