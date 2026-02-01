"""
gRPC server for Purchases service
"""
import grpc
import logging
from concurrent import futures
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import SessionLocal
from app.models.purchase import TourPurchaseToken, OrderStatus

# Try to import generated proto files
try:
    from proto import purchases_pb2
    from proto import purchases_pb2_grpc
    GRPC_AVAILABLE = True
    logging.info("Purchases proto files loaded successfully")
except ImportError as e:
    try:
        # Try direct import (fallback)
        import purchases_pb2
        import purchases_pb2_grpc
        GRPC_AVAILABLE = True
        logging.info("Purchases proto files loaded successfully (direct import)")
    except ImportError as e2:
        purchases_pb2 = None
        purchases_pb2_grpc = None
        GRPC_AVAILABLE = False
        logging.warning(f"Purchases proto files not found: {e}. Direct import also failed: {e2}. gRPC server will not start.")


class PurchasesServicer(purchases_pb2_grpc.PurchasesServiceServicer):
    """gRPC servicer for purchases verification"""
    
    def VerifyPurchase(self, request, context):
        """Verify if user has purchased a specific tour"""
        logging.info(f"[gRPC] VerifyPurchase called for user_id: {request.user_id}, tour_id: {request.tour_id}")
        
        db: Session = SessionLocal()
        try:
            # Query for active purchase token
            token = db.query(TourPurchaseToken).filter(
                and_(
                    TourPurchaseToken.user_id == request.user_id,
                    TourPurchaseToken.tour_id == request.tour_id,
                    TourPurchaseToken.is_active == OrderStatus.COMPLETED
                )
            ).first()
            
            if token:
                logging.info(f"[gRPC] Purchase verified: user {request.user_id} has token for tour {request.tour_id}")
                return purchases_pb2.VerifyPurchaseResponse(
                    has_purchased=True,
                    token_id=str(token.id),
                    purchased_at=token.purchased_at.isoformat() if token.purchased_at else "",
                    error=""
                )
            else:
                logging.info(f"[gRPC] Purchase not found: user {request.user_id} has not purchased tour {request.tour_id}")
                return purchases_pb2.VerifyPurchaseResponse(
                    has_purchased=False,
                    token_id="",
                    purchased_at="",
                    error=""
                )
                
        except Exception as e:
            logging.error(f"[gRPC] Error verifying purchase: {e}")
            return purchases_pb2.VerifyPurchaseResponse(
                has_purchased=False,
                token_id="",
                purchased_at="",
                error=str(e)
            )
        finally:
            db.close()


def start_grpc_server(port: str = "50053"):
    """Start the gRPC server"""
    if not GRPC_AVAILABLE:
        logging.error("gRPC proto files not available. Cannot start gRPC server.")
        return None
    
    if purchases_pb2_grpc is None:
        logging.error("purchases_pb2_grpc is None. Cannot start gRPC server.")
        return None
    
    try:
        # Add server options for better connection handling
        options = [
            ('grpc.keepalive_time_ms', 30000),
            ('grpc.keepalive_timeout_ms', 5000),
            ('grpc.keepalive_permit_without_calls', True),
            ('grpc.http2.max_pings_without_data', 0),
            ('grpc.http2.min_time_between_pings_ms', 10000),
            ('grpc.http2.min_ping_interval_without_data_ms', 300000),
            ('grpc.max_connection_idle_ms', 60000),
            ('grpc.max_connection_age_ms', 120000),
        ]
        
        server = grpc.server(futures.ThreadPoolExecutor(max_workers=10), options=options)
        purchases_pb2_grpc.add_PurchasesServiceServicer_to_server(PurchasesServicer(), server)
        
        listen_addr = f'[::]:{port}'
        server.add_insecure_port(listen_addr)
        
        logging.info(f"[gRPC] Starting Purchases gRPC server on port {port}")
        server.start()
        
        try:
            server.wait_for_termination()
        except KeyboardInterrupt:
            logging.info("[gRPC] Shutting down Purchases gRPC server...")
            server.stop(grace=5)
            
        return server
        
    except Exception as e:
        logging.error(f"Error starting gRPC server: {e}")
        return None


if __name__ == "__main__":
    start_grpc_server()
