from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.user_service import UserService
from app.schemas.user import (
    UserCreate, 
    UserCreateResponse, 
    UserProfileUpdate, 
    UserProfileUpdateResponse
)

router = APIRouter()


@router.post("/register", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Registracija novog korisnika
    
    - **username**: Jedinstveno korisničko ime (3-50 karaktera)
    - **email**: Validna email adresa
    - **password**: Lozinka (minimum 6 karaktera)
    - **role**: Uloga korisnika ('vodic' ili 'turista')
    
    Admin korisnici se dodaju direktno u bazu.
    """
    user_service = UserService(db)
    
    # Registruje korisnika
    new_user = user_service.create_user(user_data)
    
    return UserCreateResponse(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        role=new_user.role,
        message="Korisnik je uspešno registrovan"
    )


@router.put("/{user_id}/profile", response_model=UserProfileUpdateResponse)
async def update_user_profile(
    user_id: int,
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db)
    # TODO: Dodati authentication dependency kada kolega implementira
    # current_user: User = Depends(get_current_user)
):
    """
    Ažuriranje profila korisnika
    
    Korisnik može da ažurira sledeća polja svog profila:
    - **first_name**: Ime
    - **last_name**: Prezime  
    - **profile_image**: URL profilne slike
    - **biography**: Biografija (do 1000 karaktera)
    - **motto**: Moto/citat (do 255 karaktera)
    
    Napomena: Korisnik može ažurirati samo svoj profil.
    """
    user_service = UserService(db)
    
    # TODO: Zameniti sa current_user.id kada kolega implementira autentifikaciju
    # Za sada ćemo koristiti user_id iz URL-a kao current_user_id za testiranje
    current_user_id = user_id  # Ovo treba zameniti sa current_user.id
    
    # Ažurira profil
    updated_user = user_service.update_user_profile(user_id, profile_data, current_user_id)
    
    return UserProfileUpdateResponse(
        id=updated_user.id,
        username=updated_user.username,
        first_name=updated_user.first_name,
        last_name=updated_user.last_name,
        profile_image=updated_user.profile_image,
        biography=updated_user.biography,
        motto=updated_user.motto,
        updated_at=updated_user.updated_at,
        message="Profil je uspešno ažuriran"
    )
