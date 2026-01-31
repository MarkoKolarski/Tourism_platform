"""
gRPC client for communicating with Tours service
"""
import grpc
import logging
from typing import Tuple, Optional
import os

from app.core.config import settings

# Try to import generated proto files
try:
    from proto import tours_pb2
    from proto import tours_pb2_grpc
    GRPC_AVAILABLE = True
except ImportError:
    tours_pb2 = None
    tours_pb2_grpc = None
    GRPC_AVAILABLE = False
    logging.warning("Tours proto files not found. gRPC features will use fallback.")


class ToursGRPCClient:
    """Client for Tours service gRPC communication"""
    
    def __init__(self, grpc_addr: str = None):
        self.grpc_addr = grpc_addr or settings.tours_grpc_addr
        self.channel = None
        self.stub = None
        
    def connect(self) -> bool:
        """Establish gRPC connection"""
        if not GRPC_AVAILABLE:
            logging.warning("gRPC proto not available, using fallback")
            return False
            
        try:
            self.channel = grpc.insecure_channel(self.grpc_addr)
            self.stub = tours_pb2_grpc.ToursServiceStub(self.channel)
            logging.info(f"Connected to Tours gRPC service at {self.grpc_addr}")
            return True
        except Exception as e:
            logging.error(f"Failed to connect to Tours gRPC: {e}")
            return False
    
    def verify_tour_exists(self, tour_id: int) -> Tuple[bool, Optional[dict], Optional[str]]:
        """
        Verify if a tour exists and get its details
        
        Returns:
            (exists, tour_data, error_message)
        """
        if not GRPC_AVAILABLE:
            # Fallback: assume tour exists in development
            logging.warning(f"gRPC not available, using fallback for tour {tour_id}")
            return True, {
                "name": f"Tour #{tour_id}",
                "price": 100.0,
                "is_published": True
            }, None
        
        if not self.stub:
            if not self.connect():
                # Fallback when connection fails
                logging.warning(f"gRPC connection failed, using fallback for tour {tour_id}")
                return True, {
                    "name": f"Tour #{tour_id}",
                    "price": 100.0,
                    "is_published": True
                }, None
        
        try:
            request = tours_pb2.VerifyTourRequest(tour_id=tour_id)
            response = self.stub.VerifyTourExists(request, timeout=5.0)
            
            if response.error and response.error != "":
                return False, None, response.error
            
            if not response.exists:
                return False, None, "Tour not found"
            
            tour_data = {
                "name": response.name,
                "price": response.price,
                "is_published": response.is_published
            }
            
            return True, tour_data, None
            
        except grpc.RpcError as e:
            logging.error(f"gRPC error verifying tour: {e}")
            # Fallback on gRPC error
            return True, {
                "name": f"Tour #{tour_id}",
                "price": 100.0,
                "is_published": True
            }, None
        except Exception as e:
            logging.error(f"Error verifying tour: {e}")
            return True, {
                "name": f"Tour #{tour_id}",
                "price": 100.0,
                "is_published": True
            }, None
    
    def close(self):
        """Close gRPC connection"""
        if self.channel:
            self.channel.close()
            logging.info("Tours gRPC connection closed")
