// ====================================================================
// INIT SCRIPT ZA NEO4J - FOLLOWERS SERVICE
// Tourism Platform - Inicijalizacija graf baze za praćenje korisnika
// ====================================================================

// Brisanje svih postojećih podataka (OPREZ: samo za development!)
MATCH (n) DETACH DELETE n;

// ====================================================================
// 1. KREIRANJE CONSTRAINTS I INDEXA
// ====================================================================

// Unique constraint na user_id
CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.user_id IS UNIQUE;

// Index za brže pretraživanje po username
CREATE INDEX user_username_index IF NOT EXISTS
FOR (u:User) ON (u.username);

// Index za pretraživanje po role
CREATE INDEX user_role_index IF NOT EXISTS
FOR (u:User) ON (u.role);

// ====================================================================
// 2. KREIRANJE TEST KORISNIKA
// ====================================================================

// Admin korisnik
CREATE (admin:User {
    user_id: 1,
    username: 'admin',
    email: 'admin@tourism.com',
    role: 'admin',
    first_name: 'System',
    last_name: 'Administrator',
    created_at: datetime()
});

// Vodiči (tour guides)
CREATE (vodic1:User {
    user_id: 2,
    username: 'marko_vodic',
    email: 'marko@tourism.com',
    role: 'vodic',
    first_name: 'Marko',
    last_name: 'Petrović',
    created_at: datetime()
});

CREATE (vodic2:User {
    user_id: 3,
    username: 'ana_guide',
    email: 'ana@tourism.com',
    role: 'vodic',
    first_name: 'Ana',
    last_name: 'Jovanović',
    created_at: datetime()
});

CREATE (vodic3:User {
    user_id: 4,
    username: 'stefan_tours',
    email: 'stefan@tourism.com',
    role: 'vodic',
    first_name: 'Stefan',
    last_name: 'Nikolić',
    created_at: datetime()
});

// Turisti
CREATE (turista1:User {
    user_id: 5,
    username: 'jovana_travel',
    email: 'jovana@gmail.com',
    role: 'turista',
    first_name: 'Jovana',
    last_name: 'Marković',
    created_at: datetime()
});

CREATE (turista2:User {
    user_id: 6,
    username: 'milan_explorer',
    email: 'milan@gmail.com',
    role: 'turista',
    first_name: 'Milan',
    last_name: 'Đorđević',
    created_at: datetime()
});

CREATE (turista3:User {
    user_id: 7,
    username: 'sara_tourist',
    email: 'sara@gmail.com',
    role: 'turista',
    first_name: 'Sara',
    last_name: 'Ilić',
    created_at: datetime()
});

CREATE (turista4:User {
    user_id: 8,
    username: 'luka_adventure',
    email: 'luka@gmail.com',
    role: 'turista',
    first_name: 'Luka',
    last_name: 'Stanković',
    created_at: datetime()
});

CREATE (turista5:User {
    user_id: 9,
    username: 'nina_world',
    email: 'nina@gmail.com',
    role: 'turista',
    first_name: 'Nina',
    last_name: 'Pavlović',
    created_at: datetime()
});

CREATE (turista6:User {
    user_id: 10,
    username: 'petar_trip',
    email: 'petar@gmail.com',
    role: 'turista',
    first_name: 'Petar',
    last_name: 'Kostić',
    created_at: datetime()
});

// ====================================================================
// 3. KREIRANJE FOLLOWS RELACIJA
// ====================================================================

// Turisti prate vodiče (logično za turistički sistem)
MATCH (t1:User {username: 'jovana_travel'}), (v1:User {username: 'marko_vodic'})
CREATE (t1)-[:FOLLOWS {created_at: datetime()}]->(v1);

MATCH (t1:User {username: 'jovana_travel'}), (v2:User {username: 'ana_guide'})
CREATE (t1)-[:FOLLOWS {created_at: datetime()}]->(v2);

MATCH (t2:User {username: 'milan_explorer'}), (v1:User {username: 'marko_vodic'})
CREATE (t2)-[:FOLLOWS {created_at: datetime()}]->(v1);

MATCH (t2:User {username: 'milan_explorer'}), (v3:User {username: 'stefan_tours'})
CREATE (t2)-[:FOLLOWS {created_at: datetime()}]->(v3);

MATCH (t3:User {username: 'sara_tourist'}), (v2:User {username: 'ana_guide'})
CREATE (t3)-[:FOLLOWS {created_at: datetime()}]->(v2);

MATCH (t3:User {username: 'sara_tourist'}), (v3:User {username: 'stefan_tours'})
CREATE (t3)-[:FOLLOWS {created_at: datetime()}]->(v3);

MATCH (t4:User {username: 'luka_adventure'}), (v1:User {username: 'marko_vodic'})
CREATE (t4)-[:FOLLOWS {created_at: datetime()}]->(v1);

MATCH (t5:User {username: 'nina_world'}), (v2:User {username: 'ana_guide'})
CREATE (t5)-[:FOLLOWS {created_at: datetime()}]->(v2);

// Turisti međusobno prate jedni druge
MATCH (t1:User {username: 'jovana_travel'}), (t2:User {username: 'milan_explorer'})
CREATE (t1)-[:FOLLOWS {created_at: datetime()}]->(t2);

MATCH (t2:User {username: 'milan_explorer'}), (t1:User {username: 'jovana_travel'})
CREATE (t2)-[:FOLLOWS {created_at: datetime()}]->(t1);

MATCH (t1:User {username: 'jovana_travel'}), (t3:User {username: 'sara_tourist'})
CREATE (t1)-[:FOLLOWS {created_at: datetime()}]->(t3);

MATCH (t3:User {username: 'sara_tourist'}), (t5:User {username: 'nina_world'})
CREATE (t3)-[:FOLLOWS {created_at: datetime()}]->(t5);

MATCH (t4:User {username: 'luka_adventure'}), (t2:User {username: 'milan_explorer'})
CREATE (t4)-[:FOLLOWS {created_at: datetime()}]->(t2);

MATCH (t5:User {username: 'nina_world'}), (t6:User {username: 'petar_trip'})
CREATE (t5)-[:FOLLOWS {created_at: datetime()}]->(t6);

// Vodiči prate jedni druge (kolege)
MATCH (v1:User {username: 'marko_vodic'}), (v2:User {username: 'ana_guide'})
CREATE (v1)-[:FOLLOWS {created_at: datetime()}]->(v2);

MATCH (v2:User {username: 'ana_guide'}), (v3:User {username: 'stefan_tours'})
CREATE (v2)-[:FOLLOWS {created_at: datetime()}]->(v3);

// ====================================================================
// 4. VERIFIKACIJA - PRIKAZ KREIRANIH PODATAKA
// ====================================================================

// Prikaz svih korisnika
MATCH (u:User)
RETURN u.user_id AS id, u.username AS username, u.role AS role, u.first_name AS name
ORDER BY u.user_id;

// Prikaz svih relacija praćenja
MATCH (follower:User)-[f:FOLLOWS]->(following:User)
RETURN follower.username AS follower, following.username AS following, f.created_at AS since
ORDER BY follower.username;

// Statistika - broj pratilaca po korisniku
MATCH (u:User)
OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower)
RETURN u.username AS user, u.role AS role, count(follower) AS followers_count
ORDER BY followers_count DESC;

// Statistika - koga ko prati
MATCH (u:User)
OPTIONAL MATCH (u)-[:FOLLOWS]->(following)
RETURN u.username AS user, u.role AS role, count(following) AS following_count
ORDER BY following_count DESC;
