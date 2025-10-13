from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime
from enum import Enum
import json


class OrderStatusEnum(str, Enum):
    """Statusi narudžbine"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"



class OrderItemCreate(BaseModel):
    """Schema za kreiranje stavke u korpi"""
    tour_id: int = Field(..., description="ID ture koja se dodaje u korpu")
    tour_name: str = Field(..., description="Naziv ture")
    tour_price: float = Field(..., gt=0, description="Cena ture")
    quantity: int = Field(default=1, ge=1, description="Količina (broj osoba)")


class OrderItemResponse(BaseModel):
    """Schema za prikaz stavke iz korpe"""
    id: int
    tour_id: int
    tour_name: str
    tour_price: float
    quantity: int
    price: float
    created_at: datetime
    
    class Config:
        from_attributes = True


class ShoppingCartResponse(BaseModel):
    """Schema za prikaz korpe"""
    id: int
    user_id: int
    total_price: float
    status: OrderStatusEnum
    items: List[OrderItemResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AddToCartRequest(BaseModel):
    """Request za dodavanje ture u korpu"""
    tour_id: int = Field(..., description="ID ture")
    tour_name: Optional[str] = Field(None, description="Naziv ture (opciono)")
    tour_price: Optional[float] = Field(None, gt=0, description="Cena ture (opciono)")
    quantity: int = Field(default=1, ge=1, description="Broj osoba")


class UpdateCartItemRequest(BaseModel):
    """Request za izmenu stavke u korpi"""
    quantity: int = Field(..., ge=1, description="Nova količina")


class TourPurchaseTokenResponse(BaseModel):
    """Schema za prikaz purchase tokena"""
    id: int
    token: str
    user_id: int
    tour_id: int
    tour_name: str
    purchase_price: float
    purchased_at: datetime
    is_active: OrderStatusEnum
    
    class Config:
        from_attributes = True


class CheckoutRequest(BaseModel):
    """Request za checkout proces"""
    cart_id: int = Field(..., description="ID korpe koja se kupuje")
    payment_method: Optional[str] = Field(default="card", description="Metod plaćanja")


class CheckoutResponse(BaseModel):
    """Response nakon uspešnog checkout-a"""
    transaction_id: str
    status: OrderStatusEnum
    tokens: List[TourPurchaseTokenResponse]
    total_price: float
    message: str


class SagaTransactionResponse(BaseModel):
    """Schema za prikaz SAGA transakcije"""
    id: int
    transaction_id: str
    cart_id: int
    user_id: int
    status: OrderStatusEnum
    current_step: Optional[str]
    steps_completed: List[str] = Field(default_factory=list, description="Završeni koraci")
    compensation_log: List[str] = Field(default_factory=list, description="Log kompenzacije")
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    
    @field_validator('steps_completed', mode='before')
    @classmethod
    def parse_steps_completed(cls, v):
        """Parse JSON string to list"""
        if isinstance(v, str):
            try:
                return json.loads(v) if v else []
            except json.JSONDecodeError:
                return []
        return v if v is not None else []
    
    @field_validator('compensation_log', mode='before')
    @classmethod
    def parse_compensation_log(cls, v):
        """Parse JSON string to list"""
        if isinstance(v, str):
            try:
                return json.loads(v) if v else []
            except json.JSONDecodeError:
                return []
        return v if v is not None else []
    
    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    """Generička poruka"""
    message: str
    details: Optional[dict] = None
