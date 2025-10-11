"""
Automatska inicijalizacija Neo4j baze za Followers Service
Skripta čita init_neo4j.cypher fajl i izvršava Cypher upite
"""

from neo4j import GraphDatabase
import sys
import os


class Neo4jInitializer:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
    
    def close(self):
        self.driver.close()
    
    def execute_cypher_file(self, filepath):
        """Izvršava Cypher upite iz fajla"""
        
        if not os.path.exists(filepath):
            print(f"❌ Fajl {filepath} ne postoji!")
            return False
        
        print(f"📖 Čitanje fajla: {filepath}")
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Podeli na upite (split po ; ali ignorisanje komentara)
        lines = content.split('\n')
        queries = []
        current_query = []
        
        for line in lines:
            # Preskoči prazne linije i komentare
            line_stripped = line.strip()
            if not line_stripped or line_stripped.startswith('//'):
                continue
            
            current_query.append(line)
            
            # Ako linija završava sa ;, to je kraj upita
            if line_stripped.endswith(';'):
                query = '\n'.join(current_query).strip()
                if query:
                    queries.append(query)
                current_query = []
        
        # Ako ima ostataka bez ;
        if current_query:
            query = '\n'.join(current_query).strip()
            if query:
                queries.append(query)
        
        print(f"📊 Pronađeno {len(queries)} upita\n")
        
        # Izvršavanje upita
        success_count = 0
        error_count = 0
        
        with self.driver.session() as session:
            for i, query in enumerate(queries, 1):
                # Prikaži skraćenu verziju upita
                query_preview = query.split('\n')[0][:70]
                
                try:
                    result = session.run(query)
                    
                    # Prikaz rezultata ako postoje
                    records = list(result)
                    if records:
                        print(f"✅ [{i}/{len(queries)}] {query_preview}...")
                        # Prikaži rezultate u tabeli
                        if len(records) > 0 and len(records) <= 20:
                            for record in records:
                                print(f"   → {dict(record)}")
                        elif len(records) > 20:
                            print(f"   → {len(records)} rezultata")
                    else:
                        print(f"✅ [{i}/{len(queries)}] {query_preview}...")
                    
                    success_count += 1
                    
                except Exception as e:
                    print(f"❌ [{i}/{len(queries)}] Greška: {str(e)}")
                    print(f"   Upit: {query_preview}...")
                    error_count += 1
        
        print(f"\n{'='*70}")
        print(f"📊 SUMMARY:")
        print(f"   ✅ Uspešno izvršenih: {success_count}")
        print(f"   ❌ Greške: {error_count}")
        print(f"   📝 Ukupno upita: {len(queries)}")
        print(f"{'='*70}\n")
        
        return error_count == 0
    
    def verify_data(self):
        """Verifikacija da li su podaci uspešno uneti"""
        print("🔍 VERIFIKACIJA PODATAKA:\n")
        
        with self.driver.session() as session:
            # Broj korisnika
            result = session.run("MATCH (u:User) RETURN count(u) as count")
            user_count = result.single()['count']
            print(f"   👥 Korisnika u bazi: {user_count}")
            
            # Broj FOLLOWS relacija
            result = session.run("MATCH ()-[f:FOLLOWS]->() RETURN count(f) as count")
            follows_count = result.single()['count']
            print(f"   🔗 FOLLOWS relacija: {follows_count}")
            
            # Constraints
            result = session.run("SHOW CONSTRAINTS")
            constraints = list(result)
            print(f"   🔒 Constraints: {len(constraints)}")
            
            # Indexes
            result = session.run("SHOW INDEXES")
            indexes = list(result)
            print(f"   📇 Indexes: {len(indexes)}")
            
        print()


def main():
    # Konfiguracija (可以 se menja)
    NEO4J_URI = "bolt://localhost:7687"
    NEO4J_USER = "neo4j"
    NEO4J_PASSWORD = "testpassword"
    CYPHER_FILE = "init_neo4j.cypher"
    
    print("="*70)
    print("🚀 NEO4J INICIJALIZACIJA - FOLLOWERS SERVICE")
    print("="*70)
    print(f"📍 URI: {NEO4J_URI}")
    print(f"👤 User: {NEO4J_USER}")
    print(f"📄 Fajl: {CYPHER_FILE}")
    print("="*70 + "\n")
    
    initializer = None
    
    try:
        # Konekcija
        print("🔌 Povezivanje sa Neo4j...")
        initializer = Neo4jInitializer(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
        print("✅ Povezano!\n")
        
        # Izvršavanje skripta
        print("⚙️ Izvršavanje Cypher upita...\n")
        success = initializer.execute_cypher_file(CYPHER_FILE)
        
        # Verifikacija
        initializer.verify_data()
        
        if success:
            print("✅ Inicijalizacija uspešno završena!")
            return 0
        else:
            print("⚠️ Inicijalizacija završena sa greškama!")
            return 1
            
    except Exception as e:
        print(f"\n❌ FATALNA GREŠKA: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
        
    finally:
        if initializer:
            initializer.close()
            print("\n🔌 Veza sa bazom zatvorena.")


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
