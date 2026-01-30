from typing import List, Tuple
from neo4j import Driver


class FollowerService:
    def __init__(self, driver: Driver):
        self.driver = driver
    
    def get_accessible_blogs(self, user_id: int) -> List[int]:
        """
        Returns list of user IDs whose blogs the user can read.
        Includes: own blogs + blogs from followed users
        """
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {user_id: $user_id})
                OPTIONAL MATCH (u)-[:FOLLOWS]->(following:User)
                WITH u, COLLECT(DISTINCT following.user_id) as following_ids
                RETURN [u.user_id] + following_ids as accessible_authors
            """, user_id=user_id)
            
            record = result.single()
            if record:
                accessible = record["accessible_authors"]
                # Filter out None values
                return [uid for uid in accessible if uid is not None]
            return [user_id]  # At minimum, user can read their own blogs
    
    def can_read_blog(self, reader_id: int, blog_author_id: int) -> Tuple[bool, str]:
        """
        Checks if reader can read blog from author.
        Returns (can_read: bool, reason: str)
        """
        # User can always read their own blogs
        if reader_id == blog_author_id:
            return True, "Own blog"
        
        with self.driver.session() as session:
            result = session.run("""
                MATCH (reader:User {user_id: $reader_id})
                MATCH (author:User {user_id: $author_id})
                RETURN EXISTS((reader)-[:FOLLOWS]->(author)) as is_following
            """, reader_id=reader_id, author_id=blog_author_id)
            
            record = result.single()
            if record and record["is_following"]:
                return True, "Following author"
            
            return False, "Not following author"
    
    def can_comment_blog(self, commenter_id: int, blog_author_id: int) -> Tuple[bool, str]:
        """
        Checks if user can comment on blog.
        Same rules as reading: must follow author or own blog
        """
        return self.can_read_blog(commenter_id, blog_author_id)
    
    def get_users_who_can_comment_on_blog(self, blog_author_id: int) -> List[int]:
        """
        Returns list of user IDs who can comment on blogs from this author.
        Includes: author + all followers
        """
        with self.driver.session() as session:
            result = session.run("""
                MATCH (author:User {user_id: $author_id})
                OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(author)
                WITH author, COLLECT(DISTINCT follower.user_id) as follower_ids
                RETURN [author.user_id] + follower_ids as can_comment_users
            """, author_id=blog_author_id)
            
            record = result.single()
            if record:
                users = record["can_comment_users"]
                return [uid for uid in users if uid is not None]
            return [blog_author_id]
    
    def follow_user(self, follower_id: int, following_id: int) -> bool:
        """Creates FOLLOWS relationship between users"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (follower:User {user_id: $follower_id})
                MATCH (following:User {user_id: $following_id})
                MERGE (follower)-[r:FOLLOWS]->(following)
                ON CREATE SET r.created_at = timestamp()
                RETURN r
            """, follower_id=follower_id, following_id=following_id)
            
            return result.single() is not None
    
    def unfollow_user(self, follower_id: int, following_id: int) -> bool:
        """Removes FOLLOWS relationship"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (follower:User {user_id: $follower_id})-[r:FOLLOWS]->(following:User {user_id: $following_id})
                DELETE r
                RETURN count(r) as deleted
            """, follower_id=follower_id, following_id=following_id)
            
            record = result.single()
            return record and record["deleted"] > 0
    
    def get_followers(self, user_id: int) -> List[dict]:
        """Returns list of followers"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (follower:User)-[:FOLLOWS]->(user:User {user_id: $user_id})
                RETURN follower.user_id as user_id, follower.username as username
                ORDER BY follower.username
            """, user_id=user_id)
            
            return [{"user_id": record["user_id"], "username": record["username"]} for record in result]
    
    def get_following(self, user_id: int) -> List[dict]:
        """Returns list of users being followed"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (user:User {user_id: $user_id})-[:FOLLOWS]->(following:User)
                RETURN following.user_id as user_id, following.username as username
                ORDER BY following.username
            """, user_id=user_id)
            
            return [{"user_id": record["user_id"], "username": record["username"]} for record in result]
    
    def get_followers_count(self, user_id: int) -> int:
        """Returns number of followers"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (:User)-[:FOLLOWS]->(user:User {user_id: $user_id})
                RETURN count(*) as count
            """, user_id=user_id)
            
            record = result.single()
            return record["count"] if record else 0
    
    def get_following_count(self, user_id: int) -> int:
        """Returns number of users being followed"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (user:User {user_id: $user_id})-[:FOLLOWS]->(:User)
                RETURN count(*) as count
            """, user_id=user_id)
            
            record = result.single()
            return record["count"] if record else 0
    
    def is_following(self, follower_id: int, following_id: int) -> bool:
        """Checks if user follows another user"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (follower:User {user_id: $follower_id})-[:FOLLOWS]->(following:User {user_id: $following_id})
                RETURN count(*) as count
            """, follower_id=follower_id, following_id=following_id)
            
            record = result.single()
            return record and record["count"] > 0
    
    def get_mutual_followers(self, user_id: int) -> List[dict]:
        """Returns users who mutually follow each other"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (user:User {user_id: $user_id})-[:FOLLOWS]->(other:User)
                WHERE (other)-[:FOLLOWS]->(user)
                RETURN other.user_id as user_id, other.username as username
                ORDER BY other.username
            """, user_id=user_id)
            
            return [{"user_id": record["user_id"], "username": record["username"]} for record in result]
    
    def get_follow_recommendations(self, user_id: int, limit: int = 10) -> List[dict]:
        """Returns recommended users to follow based on mutual connections"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (user:User {user_id: $user_id})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(recommendation:User)
                WHERE NOT (user)-[:FOLLOWS]->(recommendation)
                AND user <> recommendation
                WITH recommendation, count(DISTINCT friend) as mutual_connections
                RETURN recommendation.user_id as user_id, 
                       recommendation.username as username,
                       mutual_connections
                ORDER BY mutual_connections DESC, recommendation.username
                LIMIT $limit
            """, user_id=user_id, limit=limit)
            
            return [{
                "user_id": record["user_id"],
                "username": record["username"],
                "mutual_connections": record["mutual_connections"]
            } for record in result]
    
    def create_user_node(self, user_id: int, username: str) -> bool:
        """Creates a User node in Neo4j"""
        with self.driver.session() as session:
            result = session.run("""
                MERGE (u:User {user_id: $user_id})
                ON CREATE SET u.username = $username, u.created_at = timestamp()
                ON MATCH SET u.username = $username
                RETURN u
            """, user_id=user_id, username=username)
            
            return result.single() is not None
    
    def delete_user(self, user_id: int) -> bool:
        """Deletes user node and all relationships"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {user_id: $user_id})
                DETACH DELETE u
                RETURN count(u) as deleted
            """, user_id=user_id)
            
            record = result.single()
            return record and record["deleted"] > 0
