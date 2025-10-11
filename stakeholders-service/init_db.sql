-- Kreiranje baze podataka za Stakeholders servis
-- CREATE DATABASE tourism_stakeholders; -- Zakomentarisano jer baza već postoji

-- Povezivanje na bazu
\c tourism_stakeholders;

-- Kreiranje enum tipa za role PRVO
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE userrole AS ENUM ('ADMIN', 'VODIC', 'TURISTA');
    END IF;
END $$;

-- Kreiranje tabele users (SQLAlchemy će automatski kreirati, ali ovo je referenca)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role userrole NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    profile_image VARCHAR(255),
    biography TEXT,
    motto VARCHAR(255),
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kreiranje indexa za bolje performanse
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Insertovanje test admin korisnika (lozinka: admin123)
INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_blocked) 
VALUES (
    'admin', 
    'admin@tourism.com', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewLkyQNnpTQYSwDS', -- admin123
    'ADMIN'::userrole,
    'System',
    'Administrator',
    FALSE
) ON CONFLICT (username) DO NOTHING;

-- Insertovanje test turista korisnika (lozinka: test123)
INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_blocked) 
VALUES (
    'testuser', 
    'testuser@tourism.com', 
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', -- test123
    'TURISTA'::userrole,
    'Test',
    'User',
    FALSE
) ON CONFLICT (username) DO NOTHING;

-- Insertovanje test vodič korisnika (lozinka: vodic123)
INSERT INTO users (username, email, password_hash, role, first_name, last_name, biography, is_blocked) 
VALUES (
    'vodic1', 
    'vodic@tourism.com', 
    '$2b$12$vI8aWBnW3fID.ZQ4/zo1G.q1lRwq5/DgL6MzqQn5dMY6EiA9L0eMi', -- vodic123
    'VODIC'::userrole,
    'Marko',
    'Petrović',
    'Iskusni vodič sa više od 10 godina iskustva u turizmu.',
    FALSE
) ON CONFLICT (username) DO NOTHING;
