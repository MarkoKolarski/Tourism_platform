"""
gRPC server for Purchases service
"""
import grpc
import logging
from concurrent import futures
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.purchase import TourPurchaseToken, OrderStatus
from sqlalchemy import and_

# Try to import generated proto files
try:
    from proto import purchases_pb2
    from proto import purchases_pb2_grpc
    GRPC_AVAILABLE = True
except ImportError:
    purchases_pb2 = None
    purchases_pb2_grpc = None
    GRPC_AVAILABLE = False
    logging.warning("Purchases proto files not found. gRPC server will not start.")


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
                    purchased_at=token.purchased_at.isoformat(),
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
        return
    
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    purchases_pb2_grpc.add_PurchasesServiceServicer_to_server(PurchasesServicer(), server)
    
    listen_addr = f'[::]:{port}'
    server.add_insecure_port(listen_addr)
    
    logging.info(f"[gRPC] Starting Purchases gRPC server on port {port}")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    start_grpc_server()
