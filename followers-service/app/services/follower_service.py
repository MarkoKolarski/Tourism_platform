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
    
    def can_read_blog(self, reader_id: int, blog_author_id: int) -> tuple[bool, str]:
        """
        Proverava da li korisnik može da čita blog drugog korisnika.
        Korisnik može čitati blog samo ako prati autora bloga.
        
        Returns:
            tuple: (can_read: bool, reason: str)
        """
        # Korisnik može uvek čitati svoje blogove
        if reader_id == blog_author_id:
            return True, "Možete čitati sopstvene blogove"
        
        # Provera da li korisnik prati autora
        is_following = self.is_following(reader_id, blog_author_id)
        
        if is_following:
            return True, "Pratite ovog korisnika i možete čitati njegove blogove"
        else:
            return False, "Morate zapratiti korisnika da biste mogli čitati njegove blogove"
    
    def can_comment_blog(self, commenter_id: int, blog_author_id: int) -> tuple[bool, str]:
        """
        Proverava da li korisnik može da komentariše blog drugog korisnika.
        Korisnik može komentarisati blog samo ako prati autora bloga.
        
        Returns:
            tuple: (can_comment: bool, reason: str)
        """
        # Korisnik može komentarisati svoje blogove
        if commenter_id == blog_author_id:
            return True, "Možete komentarisati sopstvene blogove"
        
        # Provera da li korisnik prati autora
        is_following = self.is_following(commenter_id, blog_author_id)
        
        if is_following:
            return True, "Pratite ovog korisnika i možete komentarisati njegove blogove"
        else:
            return False, "Morate zapratiti korisnika da biste mogli komentarisati njegove blogove"
    
    def get_accessible_blogs(self, user_id: int) -> List[int]:
        """
        Vraća listu ID-jeva korisnika čije blogove korisnik može da čita.
        To uključuje:
        1. Korisnika samog (može čitati svoje blogove)
        2. Sve korisnike koje korisnik prati
        
        Returns:
            List[int]: Lista user_id-jeva čiji blogovi su dostupni
        """
        with self.driver.session() as session:
            query = """
            MATCH (user:User {user_id: $user_id})
            OPTIONAL MATCH (user)-[:FOLLOWS]->(following:User)
            WITH user, COLLECT(DISTINCT following.user_id) AS following_ids
            RETURN [user.user_id] + following_ids AS accessible_authors
            """
            result = session.run(query, user_id=user_id)
            record = result.single()
            
            if record and record["accessible_authors"]:
                # Filtriranje None vrednosti i vraćanje liste
                return [uid for uid in record["accessible_authors"] if uid is not None]
            else:
                # Ako nema rezultata, korisnik može čitati samo svoje blogove
                return [user_id]
    
    def get_users_who_can_comment_on_blog(self, blog_author_id: int) -> List[int]:
        """
        Vraća listu ID-jeva korisnika koji mogu komentarisati blogove određenog autora.
        To uključuje:
        1. Samog autora
        2. Sve korisnike koji prate autora
        
        Returns:
            List[int]: Lista user_id-jeva koji mogu komentarisati
        """
        with self.driver.session() as session:
            query = """
            MATCH (author:User {user_id: $blog_author_id})
            OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(author)
            WITH author, COLLECT(DISTINCT follower.user_id) AS follower_ids
            RETURN [author.user_id] + follower_ids AS can_comment_users
            """
            result = session.run(query, blog_author_id=blog_author_id)
            record = result.single()
            
            if record and record["can_comment_users"]:
                return [uid for uid in record["can_comment_users"] if uid is not None]
            else:
                return [blog_author_id]
