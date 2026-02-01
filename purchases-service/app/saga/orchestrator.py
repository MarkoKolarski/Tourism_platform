"""
SAGA Orchestrator - Koordinacija distribuirane transakcije za kupovinu tura

SAGA Pattern implementacija sa kompenzacionim transakcijama.
Koraci:
1. Validate User (provera korisnika u Stakeholders servisu)
2. Reserve Tours (rezervacija tura - simulirano sa Tours servisom)
3. Process Payment (procesiranje plaćanja - simulirano)
4. Generate Tokens (kreiranje purchase tokena)
5. Update User Stats (ažuriranje statistike u drugim servisima)

Ako bilo koji korak ne uspe, pokreće se kompenzacija (rollback).
"""

import httpx
import uuid
import json
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.purchase import (
    ShoppingCart, OrderItem, TourPurchaseToken, 
    SagaTransaction, OrderStatus
)
from app.core.config import settings
from app.grpc.tours_client import ToursGRPCClient


class SagaStep:
    """Pojedinačan korak u SAGA transakciji"""
    
    def __init__(self, name: str, action, compensation):
        self.name = name
        self.action = action  # Forward action
        self.compensation = compensation  # Rollback action


class SagaOrchestrator:
    """
    Orchestrator za SAGA pattern
    Koordinira sve korake kupovine i kompenzacione akcije
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.saga_transaction: Optional[SagaTransaction] = None
        self.completed_steps: List[str] = []
        self.compensation_log: List[str] = []
        self.tours_grpc_client = ToursGRPCClient()
    
    def create_saga_transaction(self, cart_id: int, user_id: int) -> str:
        """Kreiranje nove SAGA transakcije"""
        transaction_id = f"SAGA-{uuid.uuid4().hex[:12].upper()}"
        
        saga = SagaTransaction(
            transaction_id=transaction_id,
            cart_id=cart_id,
            user_id=user_id,
            status=OrderStatus.PROCESSING,
            current_step="initialized",
            steps_completed="[]",
            compensation_log="[]"
        )
        
        self.db.add(saga)
        self.db.commit()
        self.db.refresh(saga)
        
        self.saga_transaction = saga
        return transaction_id
    
    def update_saga_step(self, step_name: str, success: bool = True, error: str = None):
        """Ažuriranje trenutnog koraka SAGA transakcije"""
        if not self.saga_transaction:
            return
        
        self.saga_transaction.current_step = step_name
        
        if success:
            self.completed_steps.append(step_name)
            self.saga_transaction.steps_completed = json.dumps(self.completed_steps)
        else:
            self.saga_transaction.status = OrderStatus.FAILED
            self.saga_transaction.error_message = error
        
        self.saga_transaction.updated_at = datetime.now(timezone.utc)
        self.db.commit()
    
    def log_compensation(self, step_name: str, action: str):
        """Logovanje kompenzacione akcije"""
        log_entry = f"{step_name}: {action}"
        self.compensation_log.append(log_entry)
        
        if self.saga_transaction:
            self.saga_transaction.compensation_log = json.dumps(self.compensation_log)
            self.db.commit()
    
    async def execute_checkout_saga(
        self, 
        cart: ShoppingCart, 
        user_id: int
    ) -> Tuple[bool, Optional[List[TourPurchaseToken]], Optional[str]]:
        """
        Glavna SAGA transakcija za checkout
        
        Returns:
            (success, tokens, error_message)
        """
        
        # Kreiranje SAGA transakcije
        transaction_id = self.create_saga_transaction(cart.id, user_id)
        print(f"🚀 SAGA Transaction started: {transaction_id}")
        
        try:
            # === KORAK 1: Validacija korisnika ===
            print(f"📋 Step 1: Validating user {user_id}...")
            self.update_saga_step("validate_user")
            
            user_valid = await self._validate_user(user_id)
            if not user_valid:
                raise Exception("User validation failed - user not found or inactive")
            
            print(f"✅ Step 1: User validated")
            
            # === KORAK 2: Rezervacija tura ===
            print(f"📋 Step 2: Reserving tours...")
            self.update_saga_step("reserve_tours")
            
            tour_ids = [item.tour_id for item in cart.items]
            reservation_success = await self._reserve_tours(tour_ids, user_id)
            
            if not reservation_success:
                raise Exception("Tour reservation failed - tours not available")
            
            print(f"✅ Step 2: Tours reserved")
            
            # === KORAK 3: Procesiranje plaćanja ===
            print(f"📋 Step 3: Processing payment...")
            self.update_saga_step("process_payment")
            
            payment_success = await self._process_payment(
                user_id, 
                cart.total_price, 
                transaction_id
            )
            
            if not payment_success:
                raise Exception("Payment processing failed")
            
            print(f"✅ Step 3: Payment processed")
            
            # === KORAK 4: Generisanje tokena ===
            print(f"📋 Step 4: Generating purchase tokens...")
            self.update_saga_step("generate_tokens")
            
            tokens = self._generate_purchase_tokens(cart, user_id)
            
            print(f"✅ Step 4: Generated {len(tokens)} tokens")
            
            # === KORAK 5: Ažuriranje statistike ===
            print(f"📋 Step 5: Updating user stats...")
            self.update_saga_step("update_stats")
            
            await self._update_user_purchase_stats(user_id, len(tokens))
            
            print(f"✅ Step 5: Stats updated")
            
            # === Uspešno završena SAGA ===
            cart.status = OrderStatus.COMPLETED
            self.saga_transaction.status = OrderStatus.COMPLETED
            self.saga_transaction.completed_at = datetime.now(timezone.utc)
            self.saga_transaction.current_step = "completed"
            self.db.commit()
            
            print(f"🎉 SAGA Transaction completed: {transaction_id}")
            
            return True, tokens, None
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ SAGA Transaction failed: {error_msg}")
            
            # Pokretanje kompenzacije
            await self._compensate(cart)
            
            # Ažuriranje statusa
            cart.status = OrderStatus.FAILED
            self.saga_transaction.status = OrderStatus.FAILED
            self.saga_transaction.error_message = error_msg
            self.saga_transaction.completed_at = datetime.now(timezone.utc)
            self.db.commit()
            
            return False, None, error_msg
    
    async def _validate_user(self, user_id: int) -> bool:
        """
        KORAK 1: Validacija korisnika u Stakeholders servisu
        Proverava da li korisnik postoji i da li je aktivan
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{settings.stakeholders_service_url}/users/{user_id}"
                )
                
                if response.status_code == 200:
                    user_data = response.json()
                    # Proveri da li je korisnik aktivan
                    return user_data.get("is_active", True)
                
                return False
                
        except Exception as e:
            print(f"Error validating user: {e}")
            # U development-u, dozvoli nastavak
            return True
    
    async def _reserve_tours(self, tour_ids: List[int], user_id: int) -> bool:
        """
        KORAK 2: Rezervacija tura u Tours servisu
        Verifikacija preko gRPC ili HTTP da ture postoje i da su published
        """
        try:
            # Try gRPC first
            all_verified = True
            for tour_id in tour_ids:
                exists, tour_data, error = self.tours_grpc_client.verify_tour_exists(tour_id)
                
                if exists and tour_data:
                    if not tour_data.get("is_published"):
                        print(f"Tour {tour_id} is not published")
                        all_verified = False
                        break
                    print(f"✓ Tour {tour_id} verified via gRPC: {tour_data.get('name')}")
                else:
                    # Fallback to HTTP verification
                    print(f"gRPC verification failed for tour {tour_id}, trying HTTP: {error}")
                    verified_http = await self._verify_tour_via_http(tour_id)
                    if not verified_http:
                        all_verified = False
                        break
            
            return all_verified
            
        except Exception as e:
            print(f"Error verifying tours: {e}")
            # Try HTTP fallback for all tours
            return await self._verify_all_tours_via_http(tour_ids)
    
    async def _verify_tour_via_http(self, tour_id: int) -> bool:
        """Verify single tour via HTTP"""
        try:
            import httpx
            from app.core.config import settings
            
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{settings.tours_service_url}/tours/{tour_id}"
                )
                
                if response.status_code == 200:
                    tour_json = response.json()
                    tour = tour_json.get("tour", {})
                    status = tour.get("status", "")
                    
                    if status in ["published", "archived"]:
                        print(f"✓ Tour {tour_id} verified via HTTP: {tour.get('name')}")
                        return True
                    else:
                        print(f"Tour {tour_id} status is '{status}', not available")
                        return False
                else:
                    print(f"HTTP verification failed for tour {tour_id}: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"Error verifying tour {tour_id} via HTTP: {e}")
            return False
    
    async def _verify_all_tours_via_http(self, tour_ids: List[int]) -> bool:
        """Verify all tours via HTTP as fallback"""
        for tour_id in tour_ids:
            if not await self._verify_tour_via_http(tour_id):
                return False
        return True
    
    async def _process_payment(
        self, 
        user_id: int, 
        amount: float, 
        transaction_id: str
    ) -> bool:
        """
        KORAK 3: Procesiranje plaćanja
        Simulacija payment gateway-a
        """
        # Simulacija payment processing-a
        # U produkciji bi ovo bio poziv payment servisu (Stripe, PayPal, etc.)
        
        if amount <= 0:
            return False
        
        # Simuliraj uspešno plaćanje
        print(f"💳 Payment processed: ${amount} for user {user_id}")
        return True
    
    def _generate_purchase_tokens(
        self, 
        cart: ShoppingCart, 
        user_id: int
    ) -> List[TourPurchaseToken]:
        """
        KORAK 4: Generisanje purchase tokena
        Kreira token za svaku stavku u korpi
        """
        tokens = []
        
        for item in cart.items:
            token_string = f"TPT-{uuid.uuid4().hex[:16].upper()}"
            
            token = TourPurchaseToken(
                token=token_string,
                user_id=user_id,
                cart_id=cart.id,
                tour_id=item.tour_id,
                tour_name=item.tour_name,
                purchase_price=item.price,
                is_active=OrderStatus.COMPLETED
            )
            
            self.db.add(token)
            tokens.append(token)
        
        self.db.commit()
        
        for token in tokens:
            self.db.refresh(token)
        
        return tokens
    
    async def _update_user_purchase_stats(self, user_id: int, tour_count: int) -> bool:
        """
        KORAK 5: Ažuriranje statistike korisnika
        Može uključivati Followers servis, Stakeholders servis, itd.
        """
        try:
            # Primer: ažuriranje u Stakeholders servisu
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{settings.stakeholders_service_url}/api/users/{user_id}/stats",
                    json={
                        "tours_purchased": tour_count
                    }
                )
            
            # Primer: notifikacija u Followers servisu (followers vide aktivnost)
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{settings.followers_service_url}/api/followers/activity",
                    json={
                        "user_id": user_id,
                        "activity_type": "tour_purchase",
                        "count": tour_count
                    }
                )
            
            return True
            
        except Exception as e:
            print(f"Stats update info: {e}")
            # Ne blokiraj transakciju zbog statistike
            return True
    
    async def _compensate(self, cart: ShoppingCart):
        """
        Kompenzacione transakcije (rollback)
        Izvršava se u obrnutom redosledu od completed_steps
        """
        print(f"🔄 Starting compensation for SAGA transaction...")
        
        # Obrni redosled koraka za kompenzaciju
        for step in reversed(self.completed_steps):
            print(f"⏪ Compensating step: {step}")
            
            if step == "generate_tokens":
                await self._compensate_tokens(cart)
            
            elif step == "process_payment":
                await self._compensate_payment(cart)
            
            elif step == "reserve_tours":
                await self._compensate_reservations(cart)
            
            elif step == "update_stats":
                await self._compensate_stats(cart)
        
        print(f"✅ Compensation completed")
    
    async def _compensate_tokens(self, cart: ShoppingCart):
        """Kompenzacija: Brisanje generisanih tokena"""
        tokens = self.db.query(TourPurchaseToken).filter(
            TourPurchaseToken.cart_id == cart.id
        ).all()
        
        for token in tokens:
            self.db.delete(token)
        
        self.db.commit()
        self.log_compensation("generate_tokens", f"Deleted {len(tokens)} tokens")
    
    async def _compensate_payment(self, cart: ShoppingCart):
        """Kompenzacija: Refund plaćanja"""
        # Simulacija refund-a
        print(f"💸 Refunding payment: ${cart.total_price}")
        self.log_compensation("process_payment", f"Refunded ${cart.total_price}")
    
    async def _compensate_reservations(self, cart: ShoppingCart):
        """Kompenzacija: Oslobađanje rezervisanih tura"""
        tour_ids = [item.tour_id for item in cart.items]
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{settings.tours_service_url}/api/tours/release",
                    json={"tour_ids": tour_ids}
                )
        except Exception as e:
            print(f"Compensation error (tours): {e}")
        
        self.log_compensation("reserve_tours", f"Released {len(tour_ids)} tour reservations")
    
    async def _compensate_stats(self, cart: ShoppingCart):
        """Kompenzacija: Rollback statistike"""
        self.log_compensation("update_stats", "Stats rollback (if needed)")
