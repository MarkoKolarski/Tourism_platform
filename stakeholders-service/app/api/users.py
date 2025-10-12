from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.user_service import UserService
from app.schemas.user import (
    UserCreate, 
    UserCreateResponse,
    UserLogin,
    UserLoginResponse,
    UserProfileUpdate, 
    UserProfileUpdateResponse,
    UserResponse
)
from app.core.security import create_access_token
from datetime import timedelta

router = APIRouter()


@router.post("/login", response_model=UserLoginResponse)
async def login(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login korisnika
    
    - **username**: Korisničko ime
    - **password**: Lozinka
    
    Vraća JWT token i podatke o korisniku
    """
    user_service = UserService(db)
    
    # Autentifikuj korisnika
    user = user_service.authenticate_user(user_data.username, user_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pogrešno korisničko ime ili lozinka",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Kreiraj JWT token
    access_token = create_access_token(
        data={"sub": user.id, "username": user.username},
        expires_delta=timedelta(weeks=520)  # Token traje 10 godina
    )
    
    return UserLoginResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, 'value') else user.role
        }
    )


@router.post("/register", response_model=UserLoginResponse, status_code=status.HTTP_201_CREATED)
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
    Automatski se loguje korisnik nakon registracije.
    """
    user_service = UserService(db)
    
    # Registruje korisnika
    new_user = user_service.create_user(user_data)
    
    # Kreiraj JWT token - automatski login nakon registracije
    access_token = create_access_token(
        data={"sub": new_user.id, "username": new_user.username},
        expires_delta=timedelta(weeks=520)  # Token traje 10 godina
    )
    
    return UserLoginResponse(
        access_token=access_token,
        user={
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "role": new_user.role.value if hasattr(new_user.role, 'value') else new_user.role
        }
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Dobijanje podataka o korisniku po ID-u
    
    - **user_id**: ID korisnika
    
    Vraća sve javne podatke o korisniku.
    Koristi se za validaciju korisnika u drugim servisima (npr. Purchase Service).
    """
    user_service = UserService(db)
    
    user = user_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Korisnik nije pronađen"
        )
    
    # Kreiranje response-a sa explicit is_active poljem
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, 'value') else user.role,  # Handle enum
        "first_name": user.first_name,
        "last_name": user.last_name,
        "profile_image": user.profile_image,
        "biography": user.biography,
        "motto": user.motto,
        "is_blocked": user.is_blocked,
        "is_active": not user.is_blocked,  # Aktivan ako nije blokiran
        "created_at": user.created_at,
        "updated_at": user.updated_at
    }


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
