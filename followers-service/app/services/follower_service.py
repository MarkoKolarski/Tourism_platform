from typing import List, Optional
from datetime import datetime
from neo4j import Driver
from app.core.database import get_neo4j_driver


class FollowerService:
    """Servis za upravljanje praćenjem korisnika"""
    
    def __init__(self, driver: Driver = None):
        self.driver = driver or get_neo4j_driver()
    
    def create_user_node(self, user_id: int, username: str) -> bool:
        """Kreiranje User node-a u Neo4j ako ne postoji"""
        with self.driver.session() as session:
            query = """
            MERGE (u:User {user_id: $user_id})
            ON CREATE SET u.username = $username, u.created_at = datetime()
            ON MATCH SET u.username = $username
            RETURN u
            """
            result = session.run(query, user_id=user_id, username=username)
            return result.single() is not None
    
    def follow_user(self, follower_id: int, following_id: int, 
                    follower_username: str = None, following_username: str = None) -> bool:
        """Kreiranje FOLLOWS relacije između korisnika"""
        if follower_id == following_id:
            return False
        
        with self.driver.session() as session:
            # Prvo kreiramo node-ove ako ne postoje
            if follower_username:
                self.create_user_node(follower_id, follower_username)
            if following_username:
                self.create_user_node(following_id, following_username)
            
            query = """
            MATCH (follower:User {user_id: $follower_id})
            MATCH (following:User {user_id: $following_id})
            MERGE (follower)-[r:FOLLOWS]->(following)
            ON CREATE SET r.followed_at = datetime()
            RETURN r
            """
            result = session.run(
                query, 
                follower_id=follower_id, 
                following_id=following_id
            )
            return result.single() is not None
    
    def unfollow_user(self, follower_id: int, following_id: int) -> bool:
        """Brisanje FOLLOWS relacije između korisnika"""
        with self.driver.session() as session:
            query = """
            MATCH (follower:User {user_id: $follower_id})-[r:FOLLOWS]->(following:User {user_id: $following_id})
            DELETE r
            RETURN COUNT(r) as deleted
            """
            result = session.run(
                query, 
                follower_id=follower_id, 
                following_id=following_id
            )
            record = result.single()
            return record and record["deleted"] > 0
    
    def get_followers(self, user_id: int) -> List[dict]:
        """Dobavljanje svih pratilaca korisnika"""
        with self.driver.session() as session:
            query = """
            MATCH (follower:User)-[r:FOLLOWS]->(user:User {user_id: $user_id})
            RETURN follower.user_id as user_id, 
                   follower.username as username, 
                   r.followed_at as followed_at
            ORDER BY r.followed_at DESC
            """
            result = session.run(query, user_id=user_id)
            return [
                {
                    "user_id": record["user_id"],
                    "username": record["username"],
                    "followed_at": str(record["followed_at"]) if record["followed_at"] else None
                }
                for record in result
            ]
    
    def get_following(self, user_id: int) -> List[dict]:
        """Dobavljanje svih korisnika koje korisnik prati"""
        with self.driver.session() as session:
            query = """
            MATCH (user:User {user_id: $user_id})-[r:FOLLOWS]->(following:User)
            RETURN following.user_id as user_id, 
                   following.username as username, 
                   r.followed_at as followed_at
            ORDER BY r.followed_at DESC
            """
            result = session.run(query, user_id=user_id)
            return [
                {
                    "user_id": record["user_id"],
                    "username": record["username"],
                    "followed_at": str(record["followed_at"]) if record["followed_at"] else None
                }
                for record in result
            ]
    
    def get_followers_count(self, user_id: int) -> int:
        """Brojanje pratilaca korisnika"""
        with self.driver.session() as session:
            query = """
            MATCH (follower:User)-[:FOLLOWS]->(user:User {user_id: $user_id})
            RETURN COUNT(follower) as count
            """
            result = session.run(query, user_id=user_id)
            record = result.single()
            return record["count"] if record else 0
    
    def get_following_count(self, user_id: int) -> int:
        """Brojanje korisnika koje korisnik prati"""
        with self.driver.session() as session:
            query = """
            MATCH (user:User {user_id: $user_id})-[:FOLLOWS]->(following:User)
            RETURN COUNT(following) as count
            """
            result = session.run(query, user_id=user_id)
            record = result.single()
            return record["count"] if record else 0
    
    def is_following(self, follower_id: int, following_id: int) -> bool:
        """Provera da li korisnik prati drugog korisnika"""
        with self.driver.session() as session:
            query = """
            MATCH (follower:User {user_id: $follower_id})-[:FOLLOWS]->(following:User {user_id: $following_id})
            RETURN COUNT(*) as count
            """
            result = session.run(
                query, 
                follower_id=follower_id, 
                following_id=following_id
            )
            record = result.single()
            return record and record["count"] > 0
    
    def get_mutual_followers(self, user_id: int) -> List[dict]:
        """Dobavljanje uzajamnih pratilaca (korisnici koji se međusobno prate)"""
        with self.driver.session() as session:
            query = """
            MATCH (user:User {user_id: $user_id})-[:FOLLOWS]->(other:User)
            MATCH (other)-[:FOLLOWS]->(user)
            RETURN other.user_id as user_id, 
                   other.username as username
            ORDER BY other.username
            """
            result = session.run(query, user_id=user_id)
            return [
                {
                    "user_id": record["user_id"],
                    "username": record["username"],
                    "followed_at": None
                }
                for record in result
            ]
    
    def get_follow_recommendations(self, user_id: int, limit: int = 10) -> List[dict]:
        """
        Preporuke korisnika za praćenje baziranih na praćenju prijatelja
        (Korisnici koje prate korisnici koje vi pratite, a koje vi ne pratite)
        """
        with self.driver.session() as session:
            query = """
            MATCH (user:User {user_id: $user_id})-[:FOLLOWS]->(:User)-[:FOLLOWS]->(recommended:User)
            WHERE NOT (user)-[:FOLLOWS]->(recommended) AND recommended.user_id <> $user_id
            RETURN recommended.user_id as user_id, 
                   recommended.username as username,
                   COUNT(*) as mutual_connections
            ORDER BY mutual_connections DESC
            LIMIT $limit
            """
            result = session.run(query, user_id=user_id, limit=limit)
            return [
                {
                    "user_id": record["user_id"],
                    "username": record["username"],
                    "followed_at": None
                }
                for record in result
            ]
    
    def delete_user(self, user_id: int) -> bool:
        """Brisanje korisnika i svih njegovih relacija"""
        with self.driver.session() as session:
            query = """
            MATCH (user:User {user_id: $user_id})
            DETACH DELETE user
            RETURN COUNT(user) as deleted
            """
            result = session.run(query, user_id=user_id)
            record = result.single()
            return record and record["deleted"] > 0
