from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class OrderStatus(str, enum.Enum):
    """Statusi narudžbine"""
    PENDING = "pending"  # Korpa, nije završena kupovina
    PROCESSING = "processing"  # U procesu SAGA transakcije
    COMPLETED = "completed"  # Uspešno završena
    FAILED = "failed"  # Neuspešna transakcija
    CANCELLED = "cancelled"  # Otkazana


class ShoppingCart(Base):
    """
    Shopping Cart - Korpa za kupovinu
    Svaki korisnik može imati aktivnu korpu
    """
    __tablename__ = "shopping_carts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    total_price = Column(Float, default=0.0)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacije
    items = relationship("OrderItem", back_populates="cart", cascade="all, delete-orphan")
    purchase_tokens = relationship("TourPurchaseToken", back_populates="cart")
    
    def calculate_total(self):
        """Kalkulacija ukupne cene"""
        self.total_price = sum(item.price for item in self.items)
        return self.total_price


class OrderItem(Base):
    """
    Order Item - Stavka u korpi
    Sadrži informacije o turi koja se kupuje
    """
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("shopping_carts.id"), nullable=False)
    
    # Informacije o turi (snimljeno u momentu dodavanja u korpu)
    tour_id = Column(Integer, nullable=False)
    tour_name = Column(String(255), nullable=False)
    tour_price = Column(Float, nullable=False)
    
    # Dodatne informacije
    quantity = Column(Integer, default=1)
    price = Column(Float, nullable=False)  # tour_price * quantity
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relacije
    cart = relationship("ShoppingCart", back_populates="items")
    
    def calculate_price(self):
        """Kalkulacija cene stavke"""
        self.price = self.tour_price * self.quantity
        return self.price


class TourPurchaseToken(Base):
    """
    Tour Purchase Token - Token koji dokazuje kupovinu ture
    Generiše se nakon uspešnog checkout-a
    """
    __tablename__ = "tour_purchase_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    
    # Vlasnik tokena
    user_id = Column(Integer, nullable=False, index=True)
    
    # Informacije o kupi
    cart_id = Column(Integer, ForeignKey("shopping_carts.id"), nullable=False)
    tour_id = Column(Integer, nullable=False)
    tour_name = Column(String(255), nullable=False)
    
    # Transakcija
    purchase_price = Column(Float, nullable=False)
    purchased_at = Column(DateTime, default=datetime.utcnow)
    
    # Status
    is_active = Column(SQLEnum(OrderStatus), default=OrderStatus.COMPLETED)
    
    # Relacije
    cart = relationship("ShoppingCart", back_populates="purchase_tokens")


class SagaTransaction(Base):
    """
    SAGA Transaction - Praćenje SAGA transakcija
    Čuva stanje svake transakcije za potrebe rollback-a
    """
    __tablename__ = "saga_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(100), unique=True, nullable=False, index=True)
    
    cart_id = Column(Integer, ForeignKey("shopping_carts.id"), nullable=False)
    user_id = Column(Integer, nullable=False)
    
    # Status SAGA transakcije
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PROCESSING)
    current_step = Column(String(100))
    
    # Log aktivnosti
    steps_completed = Column(Text)  # JSON string sa završenim koracima
    compensation_log = Column(Text)  # JSON string sa kompenzacionim akcijama
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
