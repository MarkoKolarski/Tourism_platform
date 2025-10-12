"""
Purchase API - REST endpoints za kupovinu tura
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import decode_access_token
from app.schemas.purchase import (
    ShoppingCartResponse,
    OrderItemResponse,
    AddToCartRequest,
    UpdateCartItemRequest,
    CheckoutRequest,
    CheckoutResponse,
    TourPurchaseTokenResponse,
    SagaTransactionResponse,
    MessageResponse
)
from app.services.purchase_service import PurchaseService
from fastapi import Header


router = APIRouter()


def get_current_user_id(authorization: str = Header(None)) -> int:
    """
    Dependency za dobijanje trenutnog korisnika iz JWT tokena
    Frontend ima zaštitu - svi moraju biti ulogovani da pristupe Purchase stranici
    """
    if not authorization or not authorization.startswith("Bearer "):
        # Bez tokena, koristi default user ID za testiranje
        return 1
    
    token = authorization.replace("Bearer ", "")
    payload = decode_access_token(token)
    
    if not payload:
        # Invalid token, ali dozvoli pristup sa default user
        return 1
    
    # JWT token ima 'sub' field koji sadrži user ID
    user_id = payload.get("sub")
    if not user_id:
        return 1
    
    return user_id


# ========== Shopping Cart Endpoints ==========

@router.get("/cart", response_model=ShoppingCartResponse)
def get_cart(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Dobij aktivnu korpu trenutnog korisnika
    """
    service = PurchaseService(db)
    cart = service.get_cart(current_user_id)
    return cart


@router.post("/cart/add", response_model=ShoppingCartResponse, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    request: AddToCartRequest,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Dodaj turu u korpu
    
    **Parametri:**
    - `tour_id`: ID ture koja se dodaje
    - `quantity`: Broj osoba (default: 1)
    
    Tura mora postojati i mora biti aktivna (ne arhivirana).
    """
    service = PurchaseService(db)
    
    # TODO: U produkciji, ovde treba validacija da tura postoji
    # Poziv Tours servisa da dobije informacije o turi
    
    # Simulirane informacije o turi
    tour_name = f"Tour #{request.tour_id}"
    tour_price = 100.0  # Placeholder
    
    cart, item = service.add_to_cart(
        user_id=current_user_id,
        tour_id=request.tour_id,
        tour_name=tour_name,
        tour_price=tour_price,
        quantity=request.quantity
    )
    
    return cart


@router.delete("/cart/items/{item_id}", response_model=ShoppingCartResponse)
def remove_from_cart(
    item_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Ukloni stavku iz korpe
    """
    service = PurchaseService(db)
    cart = service.remove_from_cart(current_user_id, item_id)
    
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found in cart"
        )
    
    return cart


@router.put("/cart/items/{item_id}", response_model=OrderItemResponse)
def update_cart_item(
    item_id: int,
    request: UpdateCartItemRequest,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Ažuriraj količinu stavke u korpi
    """
    service = PurchaseService(db)
    item = service.update_cart_item(current_user_id, item_id, request.quantity)
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found in cart"
        )
    
    return item


@router.delete("/cart/clear", response_model=MessageResponse)
def clear_cart(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Isprazni korpu (obriši sve stavke)
    """
    service = PurchaseService(db)
    cart = service.clear_cart(current_user_id)
    
    return MessageResponse(
        message="Cart cleared successfully",
        details={"cart_id": cart.id}
    )


# ========== Checkout Endpoints ==========

@router.post("/checkout", response_model=CheckoutResponse)
async def checkout(
    request: CheckoutRequest,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Pokreni checkout proces sa SAGA pattern-om
    
    **SAGA koraci:**
    1. Validacija korisnika (Stakeholders Service)
    2. Rezervacija tura (Tours Service)
    3. Procesiranje plaćanja (Payment Service)
    4. Generisanje purchase tokena
    5. Ažuriranje statistike korisnika
    
    Ako bilo koji korak ne uspe, automatski se pokreće kompenzacija (rollback).
    
    **Vraća:**
    - `transaction_id`: ID SAGA transakcije
    - `tokens`: Lista purchase tokena (dokaz kupovine)
    - `total_price`: Ukupna cena
    - `status`: Status transakcije
    """
    service = PurchaseService(db)
    
    success, tokens, transaction_id, error = await service.checkout(
        current_user_id, 
        request.cart_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Checkout failed: {error}"
        )
    
    # Kalkulacija ukupne cene
    total_price = sum(token.purchase_price for token in tokens)
    
    return CheckoutResponse(
        transaction_id=transaction_id,
        status="completed",
        tokens=tokens,
        total_price=total_price,
        message="Purchase completed successfully! You can now access full tour details."
    )


# ========== Purchase Tokens Endpoints ==========

@router.get("/tokens", response_model=List[TourPurchaseTokenResponse])
def get_my_tokens(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Dobij sve purchase tokene trenutnog korisnika (kupljene ture)
    """
    service = PurchaseService(db)
    tokens = service.get_user_tokens(current_user_id)
    return tokens


@router.get("/tokens/{token_id}", response_model=TourPurchaseTokenResponse)
def get_token(
    token_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Dobij specifičan purchase token
    """
    service = PurchaseService(db)
    token = service.get_token_by_id(token_id, current_user_id)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )
    
    return token


# ========== SAGA Transaction Endpoints (Admin/Debug) ==========

@router.get("/transactions", response_model=List[SagaTransactionResponse])
def get_my_transactions(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Dobij sve SAGA transakcije trenutnog korisnika
    Korisno za debugging i praćenje statusa kupovina
    """
    service = PurchaseService(db)
    transactions = service.get_user_saga_transactions(current_user_id)
    return transactions


@router.get("/transactions/{transaction_id}", response_model=SagaTransactionResponse)
def get_transaction(
    transaction_id: str,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Dobij detalje specifične SAGA transakcije
    """
    service = PurchaseService(db)
    transaction = service.get_saga_transaction(transaction_id)
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    # Proveri da li transakcija pripada korisniku
    if transaction.user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return transaction
