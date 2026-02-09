-- Create databases for all services
CREATE DATABASE tourism_stakeholders;
CREATE DATABASE tourism_purchase;
CREATE DATABASE tourism_blogs;
CREATE DATABASE tourism_tours;

-- ====================================================================
-- POPULATE USERS - Tourism Platform
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

-- Insert users (password: 123456 for all, with correct hashes)
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

-- ====================================================================
-- POPULATE TOURS - Ana's Tours in Belgrade and Novi Sad
-- ====================================================================

\c tourism_tours;

-- Create tours table
CREATE TABLE IF NOT EXISTS tours (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    tags TEXT[] NOT NULL DEFAULT '{}',
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    total_length_km DECIMAL(10,2) NOT NULL DEFAULT 0,
    author_id INTEGER NOT NULL,
    published_at TIMESTAMP,
    archived_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create key_points table
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
);

-- Create travel_times table
CREATE TABLE IF NOT EXISTS travel_times (
    id SERIAL PRIMARY KEY,
    tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    transport_type VARCHAR(20) NOT NULL CHECK (transport_type IN ('walking', 'bicycle', 'car')),
    duration_min INTEGER NOT NULL CHECK (duration_min > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tour_id, transport_type)
);

-- Insert Ana's Tours (author_id = 3)
INSERT INTO tours (id, name, description, difficulty, tags, price, status, total_length_km, author_id, published_at, created_at, updated_at)
VALUES 
(1, 'Belgrade Historic Walk', 'Discover the rich history of Belgrade through its most iconic landmarks and hidden gems.', 2, '{"history", "culture", "architecture"}', 25.00, 'published', 3.2, 3, NOW(), NOW(), NOW()),
(2, 'Novi Sad City Center Tour', 'Explore the charming streets and cultural sites of Novi Sad, the cultural capital of Serbia.', 1, '{"culture", "walking", "sightseeing"}', 20.00, 'published', 2.1, 3, NOW(), NOW(), NOW()),
(3, 'Belgrade Fortress Adventure', 'An exciting tour through Kalemegdan Park and Belgrade Fortress with stunning Danube views.', 3, '{"adventure", "history", "nature"}', 30.00, 'published', 4.5, 3, NOW(), NOW(), NOW());

-- Belgrade Historic Walk Key Points
INSERT INTO key_points (tour_id, name, description, latitude, longitude, image_url, "order", created_at, updated_at)
VALUES 
(1, 'Republic Square', 'The main square of Belgrade with the National Theatre and National Museum.', 44.8175000, 20.4606000, '', 1, NOW(), NOW()),
(1, 'Knez Mihailova Street', 'Main pedestrian zone and shopping street in Belgrade.', 44.8166000, 20.4573000, '', 2, NOW(), NOW()),
(1, 'Belgrade Fortress', 'Historic fortress overlooking the confluence of Sava and Danube rivers.', 44.8225000, 20.4508000, '', 3, NOW(), NOW()),
(1, 'Skadarlija', 'Traditional bohemian quarter with cobblestone streets and authentic restaurants.', 44.8180000, 20.4655000, '', 4, NOW(), NOW());

-- Novi Sad City Center Tour Key Points  
INSERT INTO key_points (tour_id, name, description, latitude, longitude, image_url, "order", created_at, updated_at)
VALUES 
(2, 'Liberty Square', 'The central square of Novi Sad with beautiful 18th century architecture.', 45.2671000, 19.8335000, '', 1, NOW(), NOW()),
(2, 'Name of Mary Church', 'Beautiful Catholic church in the heart of the city.', 45.2678000, 19.8342000, '', 2, NOW(), NOW()),
(2, 'Danube Street', 'Historic pedestrian street with shops and cafes.', 45.2665000, 19.8365000, '', 3, NOW(), NOW());

-- Belgrade Fortress Adventure Key Points
INSERT INTO key_points (tour_id, name, description, latitude, longitude, image_url, "order", created_at, updated_at)
VALUES 
(3, 'Kalemegdan Park Entrance', 'Start your adventure at the main entrance to Kalemegdan Park.', 44.8213000, 20.4487000, '', 1, NOW(), NOW()),
(3, 'Clock Tower', 'Historic clock tower with panoramic views of the city.', 44.8230000, 20.4495000, '', 2, NOW(), NOW()),
(3, 'Victor Monument', 'Iconic bronze sculpture overlooking the confluence of rivers.', 44.8240000, 20.4505000, '', 3, NOW(), NOW()),
(3, 'Military Museum', 'Extensive collection of military artifacts and history.', 44.8220000, 20.4520000, '', 4, NOW(), NOW()),
(3, 'Zindan Gate', 'Ancient fortress gate with historical significance.', 44.8225000, 20.4490000, '', 5, NOW(), NOW());

-- Travel Times for all tours
INSERT INTO travel_times (tour_id, transport_type, duration_min, created_at, updated_at)
VALUES 
-- Belgrade Historic Walk
(1, 'walking', 180, NOW(), NOW()),
(1, 'bicycle', 90, NOW(), NOW()),

-- Novi Sad City Center Tour  
(2, 'walking', 120, NOW(), NOW()),
(2, 'bicycle', 60, NOW(), NOW()),

-- Belgrade Fortress Adventure
(3, 'walking', 240, NOW(), NOW()),
(3, 'bicycle', 120, NOW(), NOW()),
(3, 'car', 45, NOW(), NOW());

-- Reset sequences
SELECT setval('tours_id_seq', (SELECT COALESCE(MAX(id), 0) FROM tours), true);
SELECT setval('key_points_id_seq', (SELECT COALESCE(MAX(id), 0) FROM key_points), true);
SELECT setval('travel_times_id_seq', (SELECT COALESCE(MAX(id), 0) FROM travel_times), true);

-- Log success
DO $$ BEGIN
    RAISE NOTICE 'Tours database populated with % tours and % key points', 
        (SELECT COUNT(*) FROM tours), 
        (SELECT COUNT(*) FROM key_points);
END $$;



-- Republic Square
UPDATE key_points
SET image_url = 'https://www.eyesonbelgrade.com/images/Architecture/KnezMihailo_NationalTheater.jpg'
WHERE tour_id = 1
AND name = 'Republic Square';

-- Knez Mihailova Street
UPDATE key_points
SET image_url = 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1a/d3/45/10/caption.jpg?w=800&h=800&s=1'
WHERE tour_id = 1
AND name = 'Knez Mihailova Street';

-- Belgrade Fortress
UPDATE key_points
SET image_url = 'https://private-tours.rs/travel-serbia/wp-content/uploads/2019/06/apartmani-kod-kalemegdana.jpg'
WHERE tour_id = 1
AND name = 'Belgrade Fortress';

-- Skadarlija
UPDATE key_points
SET image_url = 'https://www.tob.rs/images/tekstovi/Skadarlija-621979624.JPG'
WHERE tour_id = 1
AND name = 'Skadarlija';

-- Liberty Square
UPDATE key_points
SET image_url = 'https://media.gettyimages.com/id/543484732/photo/liberty-square-novi-sad-serbia.jpg?s=1024x1024&w=gi&k=20&c=_AG1UAzQ35udO6xt5WlzPhg-vStmRg83rQ8lQBle_cc='
WHERE tour_id = 2
AND name = 'Liberty Square';

-- Name of Mary Church
UPDATE key_points
SET image_url = 'https://ilovenovisad.com/wp-content/uploads/2017/04/Prole%C4%87e-u-Novom-Sadu-8.jpg'
WHERE tour_id = 2
AND name = 'Name of Mary Church';

-- Danube Street
UPDATE key_points
SET image_url = 'https://images.pexels.com/photos/17789392/pexels-photo-17789392/free-photo-of-danube-street-in-novi-sad.jpeg'
WHERE tour_id = 2
AND name = 'Danube Street';

-- Kalemegdan Park Entrance
UPDATE key_points
SET image_url = 'https://c8.alamy.com/comp/WJ5PHP/entrance-to-kalemegdan-fortress-in-belgrade-capital-of-serbia-kalemegdan-park-is-the-largest-park-and-the-most-important-historical-monument-in-bel-WJ5PHP.jpg'
WHERE tour_id = 3
AND name = 'Kalemegdan Park Entrance';

-- Clock Tower
UPDATE key_points
SET image_url = 'https://www.beogradskatvrdjava.co.rs/wp-content/uploads/2014/07/slika_900_Sahat_Tower_001.jpg'
WHERE tour_id = 3
AND name = 'Clock Tower';

-- Victor Monument
UPDATE key_points
SET image_url = 'https://www.beogradskatvrdjava.co.rs/wp-content/uploads/2020/12/Spomenik-Pobednik-scaled.jpg'
WHERE tour_id = 3
AND name = 'Victor Monument';

-- Military Museum
UPDATE key_points
SET image_url = 'https://www.balkanhistory.org/uploads/3/9/5/5/39556225/kalemegdan-afvs_orig.jpg'
WHERE tour_id = 3
AND name = 'Military Museum';

-- Zindan Gate
UPDATE key_points
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/d/d5/K01_066_Beogradska_Tvr%C4%91ava%3B_Zindan-Tor.jpg'
WHERE tour_id = 3
AND name = 'Zindan Gate';


--blogovi
-- Insert blogova o gradovima i znamenitostima u Srbiji
-- marko_vodic (Marko), ana_guide (Ana), stefan_tours (Stefan)
\c tourism_blogs;

CREATE TABLE IF NOT EXISTS blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL,
    user_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    images JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft'
);
-- Blog 1: Beograd
INSERT INTO blogs (id, title, content, description, user_id, user_name, created_at, updated_at, images, tags, like_count, comment_count, status) VALUES
(
    gen_random_uuid(),
    'Beograd - Grad koji nikad ne spava',
    '## Glavni grad Srbije
    
Beograd je prestonica Srbije sa bogatom istorijom koja seže preko 7000 godina unazad.

### Znamenitosti:

1. **Kalemegdan** - Tvrđava sa prelepim pogledom na ušće Save u Dunav
2. **Skadarlija** - Boemska četvrt poznata po tradicionalnim restoranima
3. **Hram Svetog Save** - Jedan od najvećih pravoslavnih hramova na svetu
4. **Ada Ciganlija** - Ostrvo-poluostrvo koje je omiljeno izletište građana

### Saveti za posetioce:
- Posetite Kalemegdan u sumrak radi neverovatnog pogleda
- Probajte tradicionalnu srpsku kuhinju u Skadarliji
- Koristite gradski prevoz koji je dobro povezan

Beograd je živahan grad koji nudi bogat noćni život, kulturu i istoriju.',
    'Upoznajte glavni grad Srbije kroz njegove znamenitosti i kulturu',
    2,
    'marko_vodic',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '2 days',
    '["kalemegdan.jpg", "skadarlija.jpg", "hram_svetog_save.jpg"]',
    '["Beograd", "Kalemegdan", "Skadarlija", "Hram Svetog Save", "istorija", "kultura"]',
    15,
    3,
    'published'
);

-- Blog 2: Novi Sad
INSERT INTO blogs (id, title, content, description, user_id, user_name, created_at, updated_at, images, tags, like_count, comment_count, status) VALUES
(
    gen_random_uuid(),
    'Novi Sad - Srpska Atina',
    '## Kulturna prestonica Vojvodine
    
Novi Sad je drugi po veličini grad u Srbiji, poznat po svojoj kulturi, obrazovanju i lepim parkovima.

### Petrovaradinska tvrđava
Najpoznatija znamenitost Novog Sada koja domaći **EXIT festival**. Tvrđava je izgrađena u 18. veku i pruža panoramski pogled na grad.

### Dunavski park i Štrand
- **Dunavski park** - Jedan od najlepših parkova u Srbiji
- **Štrand** - Gradska plaža na Dunavu, popularna leti

### Centar grada
- **Zmaj Jovina ulica** - Glavna pešačka zona
- **Katolička katedrala** - U središtu Trga Slobode
- **Srpsko narodno pozorište** - Jedno od najstarijih pozorišta u zemlji

### Godišnji događaji:
- **EXIT festival** (juli)
- **Novosadski sajam** (septembar)
- **Dan grada** (1. februara)',
    'Istražite lepote Novog Sada i njegove kulturno-istorijske znamenitosti',
    3,
    'ana_guide',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '1 day',
    '["petrovaradin.jpg", "dunavski_park.jpg", "trg_slobode.jpg"]',
    '["Novi Sad", "Petrovaradin", "EXIT festival", "Vojvodina", "kultura", "festival"]',
    22,
    5,
    'published'
);

-- Blog 3: Niš
INSERT INTO blogs (id, title, content, description, user_id, user_name, created_at, updated_at, images, tags, like_count, comment_count, status) VALUES
(
    gen_random_uuid(),
    'Niš - Grad imperatora',
    '## Istorijski značaj Niša
    
Niš je treći po veličini grad u Srbiji, poznat kao rodno mesto rimskog cara Konstantina Velikog.

### Glavne znamenitosti:

#### 1. **Niška tvrđava**
Jedna od najbolje očuvanih turskih tvrđava na Balkanu, smeštena na obali reke Nišave.

#### 2. **Ćele kula**
Spomenik iz vreme Prvog srpskog ustanka, sagrađen od lobanja srpskih ustanika.

#### 3. **Koncentracioni logor Crveni krst**
Podignut od strane nacista tokom Drugog svetskog rata, danas je memorijalni kompleks.

#### 4. **Medijana**
Antička carska villa sa mozaicima iz rimskog perioda.

### Kulinarski specijaliteti:
- **Niški ćevap** - Poseban način pripreme ćevapa
- **Burek sa sirom** - Tradicionalno jelo
- **Kompot od dunja** - Lokalni desert

### Saveti:
- Posetite tvrđavu uveče kada je osvetljena
- Kombinujte posetu Ćele kuli i logoru Crveni krst
- Probajte lokalnu kuhinju u kafanama oko tvrđave',
    'Otkrijte bogatu istoriju Niša kroz njegove spomenike i kulturu',
    4,
    'stefan_tours',
    NOW() - INTERVAL '5 days',
    NOW(),
    '["niska_tvrdjava.jpg", "cele_kula.jpg", "medijana.jpg"]',
    '["Niš", "istorija", "Ćele kula", "Konstantin Veliki", "kultura", "spomenici"]',
    18,
    4,
    'published'
);

-- Blog 4: Zlatibor
INSERT INTO blogs (id, title, content, description, user_id, user_name, created_at, updated_at, images, tags, like_count, comment_count, status) VALUES
(
    gen_random_uuid(),
    'Zlatibor - Planinski raj',
    '## Turističko središte zapadne Srbije
    
Zlatibor je planinska oblast poznata po čistom vazduhu, prelepim pejzažima i razvijenoj turističkoj infrastrukturi.

### Šta posetiti:

#### **Turistički centar**
Ski staze, žičara, šetališta i brojni hoteli i restorani.

#### **Sirogojno**
Etno selo sa tradicionalnim drvenim kućama iz 19. veka.

#### **Stopića pećina**
Jedna od najlepših pećina u Srbiji sa podzemnim jezerima i stalagmitima.

#### **Gostilje**
Mesto gde se nalazi najduži ski lift na Zlatiboru.

### Aktivnosti:
- **Skiing** (decembar-mart)
- **Šetanje i planinarenje**
- **Jahanje**
- **Vožnja žičarom**

### Specifičnosti:
- **Zlatiborski pršut** - Suvomesnati proizvod
- **Zlatiborska čajanka** - Biljni čaj
- **Kačamak** - Tradicionalno jelo od krompira',
    'Planinski odmor na Zlatiboru - savršeno za opuštanje i aktivnosti u prirodi',
    2,
    'marko_vodic',
    NOW() - INTERVAL '3 days',
    NOW(),
    '["zlatibor_planina.jpg", "sirogojno.jpg", "stopica_pecina.jpg"]',
    '["Zlatibor", "planine", "ski", "turizam", "priroda", "Sirogojno"]',
    25,
    7,
    'published'
);

-- Blog 5: Subotica (u draft statusu)
INSERT INTO blogs (id, title, content, description, user_id, user_name, created_at, updated_at, images, tags, like_count, comment_count, status) VALUES
(
    gen_random_uuid(),
    'Subotica - Secesijski biser',
    '## Grad sa najlepšom secesijskom arhitekturom
    
Subotica, grad na severu Srbije, poznat je po jedinstvenoj mešavini mađarske i srpske kulture.

### Znamenitosti u pripremi...',
    'Arhitektonske lepote Subotice kroz secesijske zgrade i kulturu',
    3,
    'ana_guide',
    NOW() - INTERVAL '2 days',
    NOW(),
    '[]',
    '["Subotica", "secesija", "arhitektura", "Vojvodina", "kultura"]',
    0,
    0,
    'draft'
);