from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
from app.core.security import create_access_token, verify_token
from app.models.user import User
from datetime import timedelta

router = APIRouter()
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency za dobijanje trenutno ulogovanog korisnika iz JWT tokena"""
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nevažeći token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nevažeći token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_service = UserService(db)
    user = user_service.get_user_by_id(user_id)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Korisnik nije pronađen",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


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


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Dobijanje podataka o korisniku (BEZ autentifikacije)
    
    Query parametar: user_id (id ulogovanog korisnika)
    Primer: GET /api/users/me?user_id=1
    """
    user_service = UserService(db)
    user = user_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Korisnik nije pronađen"
        )
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, 'value') else user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "profile_image": user.profile_image,
        "biography": user.biography,
        "motto": user.motto,
        "is_blocked": user.is_blocked,
        "is_active": not user.is_blocked,
        "created_at": user.created_at,
        "updated_at": user.updated_at
    }


@router.get("/all", response_model=list[UserResponse])
async def get_all_users(
    db: Session = Depends(get_db)
):
    """
    Dobijanje liste svih korisnika
    
    Vraća sve korisnike iz sistema.
    Koristi se za prikaz svih korisnika koje možete da zapratite.
    """
    users = db.query(User).all()
    
    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, 'value') else user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "profile_image": user.profile_image,
            "biography": user.biography,
            "motto": user.motto,
            "is_blocked": user.is_blocked,
            "is_active": not user.is_blocked,
            "created_at": user.created_at,
            "updated_at": user.updated_at
        }
        for user in users
    ]


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


@router.put("/profile", response_model=UserProfileUpdateResponse)
async def update_user_profile(
    user_id: int,
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db)
):
    """
    Ažuriranje profila korisnika (BEZ autentifikacije)
    
    Query parametar: user_id (id korisnika čiji profil se ažurira)
    
    Korisnik može da ažurira sledeća polja svog profila:
    - **first_name**: Ime
    - **last_name**: Prezime  
    - **profile_image**: URL profilne slike
    - **biography**: Biografija (do 1000 karaktera)
    - **motto**: Moto/citat (do 255 karaktera)
    """
    try:
        user_service = UserService(db)
        current_user = user_service.get_user_by_id(user_id)
        
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Korisnik nije pronađen"
            )
        
        # Ažurira samo prosleđena polja
        update_data = profile_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(current_user, field, value)
        
        db.commit()
        db.refresh(current_user)
        
        return UserProfileUpdateResponse(
            id=current_user.id,
            username=current_user.username,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            profile_image=current_user.profile_image,
            biography=current_user.biography,
            motto=current_user.motto,
            updated_at=current_user.updated_at,
            message="Profil je uspešno ažuriran"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Greška pri ažuriranju profila: {str(e)}"
        )


@router.get("/all", response_model=list[UserResponse])
async def get_all_users(
    db: Session = Depends(get_db)
):
    """
    Dobijanje liste svih korisnika
    
    Vraća sve korisnike iz sistema.
    Koristi se za prikaz svih korisnika koje možete da zapratite.
    """
    users = db.query(User).all()
    
    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, 'value') else user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "profile_image": user.profile_image,
            "biography": user.biography,
            "motto": user.motto,
            "is_blocked": user.is_blocked,
            "is_active": not user.is_blocked,
            "created_at": user.created_at,
            "updated_at": user.updated_at
        }
        for user in users
    ]
