-- ====================================================================
-- POPULATE USERS - Tourism Platform
-- Populating PostgreSQL with users from Neo4j Cypher script
-- Creates table schema and populates data
-- ====================================================================

\c tourism_stakeholders;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE userrole AS ENUM ('ADMIN', 'VODIC', 'TURISTA');
    END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);


-- Only insert users if the table is empty (password: 123456 for all, with correct hashes)
INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, is_blocked, created_at, updated_at)
SELECT * FROM (VALUES 
(1, 'admin', 'admin@tourism.com', '$2b$12$issx1Ow7gHZE8SqgKdjeUuHeaytgbxsOdSsPslpIoKRQ.gucslddy', 'ADMIN', 'System', 'Administrator', false, NOW(), NOW()),
(2, 'marko_vodic', 'marko@tourism.com', '$2b$12$DQQ/DyZZk98mHyFK/BSzjuM9lLc2EZiOLkOuipzlAK0HqJGVWUNv.', 'VODIC', 'Marko', 'Petrović', false, NOW(), NOW()),
(3, 'ana_guide', 'ana@tourism.com', '$2b$12$7xdqwksQMd9qJ0PFm7.uG.mZjaLUcGrMtRQzaLyCaBGyY4FmOO8g6', 'VODIC', 'Ana', 'Jovanović', false, NOW(), NOW()),
(4, 'stefan_tours', 'stefan@tourism.com', '$2b$12$70pcV4eggenNyzx6JHVzzOzLVcNeIDaWTbvnc76DeEg0Aon0pRAjC', 'VODIC', 'Stefan', 'Nikolić', false, NOW(), NOW()),
(5, 'jovana_travel', 'jovana@gmail.com', '$2b$12$TjRredWi4/wMRWOUeV0OYO2GzGK9rCTrr/2L4rNaM6ynwBGnoQ/8.', 'TURISTA', 'Jovana', 'Marković', false, NOW(), NOW()),
(6, 'milan_explorer', 'milan@gmail.com', '$2b$12$VvTFxy3712jFzD.pBp4iGup5idx62WkBjzWewPjJ1qq5VwMSFQah6', 'TURISTA', 'Milan', 'Đorđević', false, NOW(), NOW()),
(7, 'sara_tourist', 'sara@gmail.com', '$2b$12$c4hq9VK.9LQvX.p0VWdlJOUE6Z2yoip8cdZlSoumzftvbXAaqoiMe', 'TURISTA', 'Sara', 'Ilić', false, NOW(), NOW()),
(8, 'luka_adventure', 'luka@gmail.com', '$2b$12$KT3.VgHgjseIVL/JrAz/suEEKmMiLI3Tz/mQJSJ5w1rdeYi.LC2cu', 'TURISTA', 'Luka', 'Stanković', false, NOW(), NOW()),
(9, 'nina_world', 'nina@gmail.com', '$2b$12$2sRfc.UcTQRpPjHlcU3Pjervo6iMiueJc6L37n4lJ64KVKHEIRIou', 'TURISTA', 'Nina', 'Pavlović', false, NOW(), NOW()),
(10, 'petar_trip', 'petar@gmail.com', '$2b$12$eO2ONCp./IyPsl4ezsZz9OBd/BvZ5XH1vEQ/htC/.TG61mFPtcv0e', 'TURISTA', 'Petar', 'Kostić', false, NOW(), NOW())
) AS new_users(id, username, email, password_hash, role, first_name, last_name, is_blocked, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

-- Reset sequence to continue from correct value
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) FROM users), true);

-- Log success
DO $$ BEGIN
    RAISE NOTICE 'Users table created and populated with % records', (SELECT COUNT(*) FROM users);
END $$;
