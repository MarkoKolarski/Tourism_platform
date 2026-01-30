import grpc
from concurrent import futures
import sys
import os

# Add proto directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import followers_pb2
import followers_pb2_grpc

from app.services.follower_service import FollowerService
from app.core.database import neo4j_db


class FollowersServicer(followers_pb2_grpc.FollowersServiceServicer):
    def __init__(self):
        self.driver = neo4j_db.get_driver()
        self.service = FollowerService(self.driver)
    
    def GetAccessibleBlogs(self, request, context):
        """Returns list of author IDs whose blogs the user can read"""
        try:
            accessible_authors = self.service.get_accessible_blogs(request.user_id)
            
            return followers_pb2.AccessibleBlogsResponse(
                user_id=request.user_id,
                accessible_authors=accessible_authors,
                count=len(accessible_authors)
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return followers_pb2.AccessibleBlogsResponse()
    
    def CanReadBlog(self, request, context):
        """Checks if user can read a specific blog"""
        try:
            can_read, reason = self.service.can_read_blog(
                request.reader_id,
                request.blog_author_id
            )
            
            return followers_pb2.CanReadBlogResponse(
                reader_id=request.reader_id,
                blog_author_id=request.blog_author_id,
                can_read=can_read,
                reason=reason
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return followers_pb2.CanReadBlogResponse()


def serve():
    """Start gRPC server"""
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    followers_pb2_grpc.add_FollowersServiceServicer_to_server(
        FollowersServicer(), server
    )
    server.add_insecure_port('[::]:50051')
    server.start()
    print("gRPC server started on port 50051")
    server.wait_for_termination()
