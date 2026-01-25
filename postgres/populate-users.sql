-- ====================================================================
-- POPULATE USERS - Tourism Platform
-- Populating PostgreSQL with users from Neo4j Cypher script
-- Creates table schema and populates data
-- ====================================================================

\c tourism_stakeholders;

-- Create the users table with the same schema as SQLAlchemy model
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'VODIC', 'TURISTA')),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    profile_image VARCHAR(255),
    biography TEXT,
    motto VARCHAR(255),
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create current_location table for the relationship
CREATE TABLE IF NOT EXISTS current_location (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only insert users if the table is empty (password: test123 for all)
INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, is_blocked, created_at, updated_at)
SELECT * FROM (VALUES 
(1, 'admin', 'admin@tourism.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'ADMIN', 'System', 'Administrator', false, NOW(), NOW()),
(2, 'marko_vodic', 'marko@tourism.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'VODIC', 'Marko', 'Petrović', false, NOW(), NOW()),
(3, 'ana_guide', 'ana@tourism.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'VODIC', 'Ana', 'Jovanović', false, NOW(), NOW()),
(4, 'stefan_tours', 'stefan@tourism.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'VODIC', 'Stefan', 'Nikolić', false, NOW(), NOW()),
(5, 'jovana_travel', 'jovana@gmail.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'TURISTA', 'Jovana', 'Marković', false, NOW(), NOW()),
(6, 'milan_explorer', 'milan@gmail.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'TURISTA', 'Milan', 'Đorđević', false, NOW(), NOW()),
(7, 'sara_tourist', 'sara@gmail.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'TURISTA', 'Sara', 'Ilić', false, NOW(), NOW()),
(8, 'luka_adventure', 'luka@gmail.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'TURISTA', 'Luka', 'Stanković', false, NOW(), NOW()),
(9, 'nina_world', 'nina@gmail.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'TURISTA', 'Nina', 'Pavlović', false, NOW(), NOW()),
(10, 'petar_trip', 'petar@gmail.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'TURISTA', 'Petar', 'Kostić', false, NOW(), NOW())
) AS new_users(id, username, email, password_hash, role, first_name, last_name, is_blocked, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

-- Reset sequence to continue from correct value
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) FROM users), true);

-- Log success
DO $$ BEGIN
    RAISE NOTICE 'Users table created and populated with % records', (SELECT COUNT(*) FROM users);
END $$;
