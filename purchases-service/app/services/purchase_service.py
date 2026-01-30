"""
Purchase Service - Biznis logika za kupovinu tura
"""

from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.purchase import (
    ShoppingCart, OrderItem, TourPurchaseToken, 
    SagaTransaction, OrderStatus
)
from app.schemas.purchase import (
    OrderItemCreate, AddToCartRequest, 
    UpdateCartItemRequest
)
from app.saga.orchestrator import SagaOrchestrator


class PurchaseService:
    """Servis za upravljanje kupovinama"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_or_create_cart(self, user_id: int) -> ShoppingCart:
        """
        Dobij aktivnu korpu korisnika ili kreiraj novu
        Korisnik može imati samo jednu aktivnu korpu
        """
        cart = self.db.query(ShoppingCart).filter(
            and_(
                ShoppingCart.user_id == user_id,
                ShoppingCart.status == OrderStatus.PENDING
            )
        ).first()
        
        if not cart:
            cart = ShoppingCart(user_id=user_id, status=OrderStatus.PENDING)
            self.db.add(cart)
            self.db.commit()
            self.db.refresh(cart)
        
        return cart
    
    def add_to_cart(
        self, 
        user_id: int, 
        tour_id: int, 
        tour_name: str, 
        tour_price: float, 
        quantity: int = 1
    ) -> Tuple[ShoppingCart, OrderItem]:
        """
        Dodaj turu u korpu
        Ako tura već postoji, ažuriraj količinu
        """
        cart = self.get_or_create_cart(user_id)
        
        # Proveri da li tura već postoji u korpi
        existing_item = self.db.query(OrderItem).filter(
            and_(
                OrderItem.cart_id == cart.id,
                OrderItem.tour_id == tour_id
            )
        ).first()
        
        if existing_item:
            # Ažuriraj količinu
            existing_item.quantity += quantity
            existing_item.calculate_price()
            item = existing_item
        else:
            # Kreiraj novu stavku
            item = OrderItem(
                cart_id=cart.id,
                tour_id=tour_id,
                tour_name=tour_name,
                tour_price=tour_price,
                quantity=quantity
            )
            item.calculate_price()
            self.db.add(item)
        
        # Ažuriraj ukupnu cenu korpe
        self.db.commit()
        self.db.refresh(cart)
        cart.calculate_total()
        self.db.commit()
        self.db.refresh(cart)
        
        return cart, item
    
    def remove_from_cart(self, user_id: int, item_id: int) -> Optional[ShoppingCart]:
        """Ukloni stavku iz korpe"""
        cart = self.get_or_create_cart(user_id)
        
        item = self.db.query(OrderItem).filter(
            and_(
                OrderItem.id == item_id,
                OrderItem.cart_id == cart.id
            )
        ).first()
        
        if not item:
            return None
        
        self.db.delete(item)
        self.db.commit()
        
        # Ažuriraj ukupnu cenu
        self.db.refresh(cart)
        cart.calculate_total()
        self.db.commit()
        self.db.refresh(cart)
        
        return cart
    
    def update_cart_item(
        self, 
        user_id: int, 
        item_id: int, 
        quantity: int
    ) -> Optional[OrderItem]:
        """Ažuriraj količinu stavke u korpi"""
        cart = self.get_or_create_cart(user_id)
        
        item = self.db.query(OrderItem).filter(
            and_(
                OrderItem.id == item_id,
                OrderItem.cart_id == cart.id
            )
        ).first()
        
        if not item:
            return None
        
        item.quantity = quantity
        item.calculate_price()
        
        self.db.commit()
        
        # Ažuriraj ukupnu cenu korpe
        cart.calculate_total()
        self.db.commit()
        
        self.db.refresh(item)
        return item
    
    def get_cart(self, user_id: int) -> ShoppingCart:
        """Dobij korpu korisnika"""
        return self.get_or_create_cart(user_id)
    
    def clear_cart(self, user_id: int) -> ShoppingCart:
        """Isprazni korpu"""
        cart = self.get_or_create_cart(user_id)
        
        # Obriši sve stavke
        self.db.query(OrderItem).filter(OrderItem.cart_id == cart.id).delete()
        
        cart.total_price = 0.0
        self.db.commit()
        self.db.refresh(cart)
        
        return cart
    
    async def checkout(
        self, 
        user_id: int, 
        cart_id: int
    ) -> Tuple[bool, Optional[List[TourPurchaseToken]], Optional[str], Optional[str]]:
        """
        Checkout proces sa SAGA pattern-om
        
        Returns:
            (success, tokens, transaction_id, error_message)
        """
        
        # Dobij korpu
        cart = self.db.query(ShoppingCart).filter(
            and_(
                ShoppingCart.id == cart_id,
                ShoppingCart.user_id == user_id
            )
        ).first()
        
        if not cart:
            return False, None, None, "Cart not found"
        
        if cart.status != OrderStatus.PENDING:
            return False, None, None, f"Cart already processed (status: {cart.status})"
        
        if not cart.items:
            return False, None, None, "Cart is empty"
        
        # Pokreni SAGA transakciju
        cart.status = OrderStatus.PROCESSING
        self.db.commit()
        
        orchestrator = SagaOrchestrator(self.db)
        success, tokens, error = await orchestrator.execute_checkout_saga(cart, user_id)
        
        transaction_id = orchestrator.saga_transaction.transaction_id if orchestrator.saga_transaction else None
        
        return success, tokens, transaction_id, error
    
    def get_user_tokens(self, user_id: int) -> List[TourPurchaseToken]:
        """Dobij sve tokene korisnika (kupljene ture)"""
        return self.db.query(TourPurchaseToken).filter(
            TourPurchaseToken.user_id == user_id
        ).order_by(TourPurchaseToken.purchased_at.desc()).all()
    
    def get_token_by_id(self, token_id: int, user_id: int) -> Optional[TourPurchaseToken]:
        """Dobij specifičan token"""
        return self.db.query(TourPurchaseToken).filter(
            and_(
                TourPurchaseToken.id == token_id,
                TourPurchaseToken.user_id == user_id
            )
        ).first()
    
    def get_saga_transaction(self, transaction_id: str) -> Optional[SagaTransaction]:
        """Dobij SAGA transakciju po ID-u"""
        return self.db.query(SagaTransaction).filter(
            SagaTransaction.transaction_id == transaction_id
        ).first()
    
    def get_user_saga_transactions(self, user_id: int) -> List[SagaTransaction]:
        """Dobij sve SAGA transakcije korisnika"""
        return self.db.query(SagaTransaction).filter(
            SagaTransaction.user_id == user_id
        ).order_by(SagaTransaction.created_at.desc()).all()
