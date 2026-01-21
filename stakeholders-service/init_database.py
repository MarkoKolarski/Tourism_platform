"""
Inicijalizacija PostgreSQL baze za Stakeholders Service

Ova skripta:
1. Proverava da li postoji baza 'tourism_stakeholders'
2. Ako ne postoji, kreira je
3. Kreira tabele i Enum tipove
4. Popunjava bazu sa inicijalnim test podacima
"""

import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys
from datetime import datetime


# PostgreSQL connection parametri
#DB_HOST = "localhost"
DB_HOST = "postgres"
DB_PORT = "5432"
DB_USER = "postgres"
DB_PASSWORD = "ftn"
DB_NAME = "tourism_stakeholders"


def print_section(title: str):
    """Formatiran ispis sekcije"""
    print(f"\n{'=' * 70}")
    print(f"  {title}")
    print(f"{'=' * 70}\n")


def check_and_create_database():
    """Proverava i kreira bazu ako ne postoji"""
    print_section("PROVERA I KREIRANJE BAZE PODATAKA")
    
    conn = None
    cursor = None
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
        exists = cursor.fetchone()
        
        if exists:
            print(f"✅ Baza '{DB_NAME}' već postoji")
            return True
        else:
            print(f"📋 Baza '{DB_NAME}' ne postoji. Kreiram...")
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(DB_NAME)))
            print(f"✅ Baza '{DB_NAME}' uspešno kreirana!")
            return True
            
    except psycopg2.Error as e:
        print(f"❌ Greška pri radu sa bazom: {e}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def create_tables_and_populate():
    """Kreira tabele i popunjava ih sa inicijalnim podacima"""
    print_section("KREIRANJE TABELA I POPUNJAVANJE PODATAKA")
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()
        
        # 1. Kreiranje ENUM tipa za role
        print("📋 Kreiranje ENUM tipa 'userrole'...")
        cursor.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
                    CREATE TYPE userrole AS ENUM ('ADMIN', 'VODIC', 'TURISTA');
                END IF;
            END $$;
        """)
        print("✅ ENUM tip kreiran/već postoji")
        
        # 2. Kreiranje tabele users
        print("\n📋 Kreiranje tabele 'users'...")
        cursor.execute("""
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
        """)
        print("✅ Tabela 'users' kreirana/već postoji")
        
        # 3. Kreiranje indexa
        print("\n📋 Kreiranje indexa...")
        cursor.execute("""CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);""")
        cursor.execute("""CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);""")
        cursor.execute("""CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);""")
        print("✅ Indexi kreirani/već postoje")
        
        # 4. Popunjavanje sa test podacima
        print("\n📋 Popunjavanje sa test podacima...")
        
        # Admin korisnik (lozinka: admin123)
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_blocked) 
            VALUES (
                'admin', 
                'admin@tourism.com', 
                '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewLkyQNnpTQYSwDS',
                'ADMIN'::userrole,
                'System',
                'Administrator',
                FALSE
            ) ON CONFLICT (username) DO NOTHING
            RETURNING id;
        """)
        result = cursor.fetchone()
        if result:
            print(f"  ✅ Admin korisnik kreiran (ID: {result[0]})")
        else:
            print(f"  ℹ️  Admin korisnik već postoji")
        
        # Test turista korisnik (lozinka: test123)
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_blocked) 
            VALUES (
                'testuser', 
                'testuser@tourism.com', 
                '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
                'TURISTA'::userrole,
                'Test',
                'User',
                FALSE
            ) ON CONFLICT (username) DO NOTHING
            RETURNING id;
        """)
        result = cursor.fetchone()
        if result:
            print(f"  ✅ Test turista korisnik kreiran (ID: {result[0]})")
        else:
            print(f"  ℹ️  Test turista korisnik već postoji")
        
        # Test vodič korisnik (lozinka: vodic123)
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role, first_name, last_name, biography, is_blocked) 
            VALUES (
                'vodic1', 
                'vodic@tourism.com', 
                '$2b$12$vI8aWBnW3fID.ZQ4/zo1G.q1lRwq5/DgL6MzqQn5dMY6EiA9L0eMi',
                'VODIC'::userrole,
                'Marko',
                'Petrović',
                'Iskusni vodič sa više od 10 godina iskustva u turizmu.',
                FALSE
            ) ON CONFLICT (username) DO NOTHING
            RETURNING id;
        """)
        result = cursor.fetchone()
        if result:
            print(f"  ✅ Test vodič korisnik kreiran (ID: {result[0]})")
        else:
            print(f"  ℹ️  Test vodič korisnik već postoji")

        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role, first_name, last_name, biography, is_blocked) 
            VALUES ('marko2', 'marko2@tourism.com', '$2b$12$vrvL18pCBzt.yuqis5Loj.GkNRrfAmjkxfqLTav8zLPdh2hdS8gDW',
                    'VODIC'::userrole, 'Marko', 'Marković', 'Turista, voli da putuje.', FALSE)
            ON CONFLICT (username) DO NOTHING;
        """)
        result = cursor.fetchone()
        if result:
            print(f"  ✅ Test turista korisnik kreiran (ID: {result[0]})")
        else:
            print(f"  ℹ️  Test turista korisnik već postoji")

        # 5️⃣ Novi deo — tabela current_locations
        print("\n📍 Kreiranje tabele 'current_locations'...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS current_locations (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                latitude DOUBLE PRECISION NOT NULL,
                longitude DOUBLE PRECISION NOT NULL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("✅ Tabela 'current_locations' kreirana/već postoji")

        # Ubacivanje test lokacije za korisnika 'testuser'
        print("📋 Unos test lokacije za korisnika 'testuser'...")
        cursor.execute("""
            INSERT INTO current_locations (user_id, latitude, longitude)
            SELECT id, 45.2671, 19.8335 FROM users WHERE username = 'testuser'
            ON CONFLICT DO NOTHING;
        """)
        print("✅ Test lokacija dodata (ako već nije postojala)")

        # Commit promena
        conn.commit()
        
        # 6. Statistika baze
        print("\n📊 Statistika baze:")
        cursor.execute("SELECT COUNT(*) FROM users;")
        user_count = cursor.fetchone()[0]
        print(f"  👥 Ukupno korisnika: {user_count}")
        
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'ADMIN'::userrole;")
        print(f"  👑 Admin korisnika: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'VODIC'::userrole;")
        print(f"  🗺️  Vodič korisnika: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'TURISTA'::userrole;")
        print(f"  🎒 Turista korisnika: {cursor.fetchone()[0]}")
        
        print("\n✅ Sve tabele i podaci su uspešno kreirani!")
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Greška pri kreiranju tabela: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def verify_database():
    """Verifikuje da je baza pravilno kreirana"""
    print_section("VERIFIKACIJA BAZE PODATAKA")
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, username, email, role, first_name, last_name, is_blocked
            FROM users
            ORDER BY id;
        """)
        users = cursor.fetchall()
        
        if users:
            print("👥 Lista korisnika u bazi:\n")
            for user in users:
                user_id, username, email, role, fname, lname, blocked = user
                status = "🚫 BLOKIRAN" if blocked else "✅ AKTIVAN"
                full_name = f"{fname or ''} {lname or ''}".strip() or "N/A"
                print(f"  ID {user_id}: @{username:<15} ({role:<10}) - {full_name:<20} {status}")
                print(f"         Email: {email}\n")
        else:
            print("⚠️  Nema korisnika u bazi")
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Greška pri verifikaciji: {e}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def main():
    """Glavna funkcija"""
    print("\n" + "=" * 70)
    print("  STAKEHOLDERS SERVICE - INICIJALIZACIJA BAZE PODATAKA")
    print("=" * 70)
    print(f"  Vreme: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Host: {DB_HOST}:{DB_PORT}")
    print(f"  Baza: {DB_NAME}")
    print(f"  Korisnik: {DB_USER}")
    print("=" * 70)
    
    try:
        if not check_and_create_database():
            print("\n❌ Neuspešno kreiranje baze. Prekidam...")
            sys.exit(1)
        
        if not create_tables_and_populate():
            print("\n❌ Neuspešno kreiranje tabela. Prekidam...")
            sys.exit(1)
        
        if not verify_database():
            print("\n⚠️  Verifikacija nije uspela, ali baza je kreirana")
        
        print_section("✅ INICIJALIZACIJA USPEŠNO ZAVRŠENA!")
        print("\n🎉 Baza je spremna za korišćenje!")
        print("\n📝 Test kredencijali:")
        print("   Admin:    username='admin',    password='admin123'")
        print("   Turista:  username='testuser', password='test123'")
        print("   Vodič:    username='vodic1',   password='vodic123'")
        print("\n" + "=" * 70 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Prekinuto od strane korisnika")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Neočekivana greška: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
