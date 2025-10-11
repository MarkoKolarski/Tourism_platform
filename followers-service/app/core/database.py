from neo4j import GraphDatabase
from app.core.config import settings


class Neo4jDatabase:
    def __init__(self):
        self._driver = None
        
    def connect(self):
        """Povezivanje sa Neo4j bazom"""
        self._driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )
        return self._driver
    
    def close(self):
        """Zatvaranje konekcije"""
        if self._driver:
            self._driver.close()
    
    def get_driver(self):
        """Vraćanje driver instance"""
        if not self._driver:
            self.connect()
        return self._driver
    
    def verify_connectivity(self):
        """Provera konekcije sa bazom"""
        try:
            self._driver.verify_connectivity()
            return True
        except Exception as e:
            print(f"Neo4j connection error: {e}")
            return False


# Globalna instanca baze
neo4j_db = Neo4jDatabase()


def get_neo4j_driver():
    """Dependency injection za Neo4j driver"""
    return neo4j_db.get_driver()
