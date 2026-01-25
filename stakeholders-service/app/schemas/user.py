from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    VODIC = "vodic"
    TURISTA = "turista"


# Schema za login
class UserLogin(BaseModel):
    username_or_email: str
    password: str


# Schema za login response
class UserLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# Schema za registraciju korisnika
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    @field_validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Korisničko ime mora imati najmanje 3 karaktera')
        if len(v) > 50:
            raise ValueError('Korisničko ime može imati maksimalno 50 karaktera')
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Korisničko ime može sadržavati samo slova, brojevi, _ i -')
        return v.lower()
    
    @field_validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Lozinka mora imati najmanje 6 karaktera')
        return v
    
    @field_validator('role')
    def validate_role(cls, v):
        if v == UserRole.ADMIN:
            raise ValueError('Admin uloga se ne može dodeliti kroz registraciju')
        return v


# Schema za izmenu profila
class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image: Optional[str] = None
    biography: Optional[str] = None
    motto: Optional[str] = None
    
    @field_validator('first_name', 'last_name')
    def validate_names(cls, v):
        if v is not None:
            if len(v.strip()) == 0:
                raise ValueError('Ime i prezime ne mogu biti prazni')
            if len(v) > 50:
                raise ValueError('Ime i prezime mogu imati maksimalno 50 karaktera')
        return v.strip() if v else v
    
    @field_validator('motto')
    def validate_motto(cls, v):
        if v is not None and len(v) > 255:
            raise ValueError('Moto može imati maksimalno 255 karaktera')
        return v
    
    @field_validator('biography')
    def validate_biography(cls, v):
        if v is not None and len(v) > 1000:
            raise ValueError('Biografija može imati maksimalno 1000 karaktera')
        return v


# Schema za response
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    first_name: Optional[str]
    last_name: Optional[str]
    profile_image: Optional[str]
    biography: Optional[str]
    motto: Optional[str]
    is_blocked: bool
    is_active: bool = True  # Korisnik je aktivan ako nije blokiran
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Schema za response nakon registracije
class UserCreateResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    message: str = "Korisnik je uspešno registrovan"
    
    class Config:
        from_attributes = True


# Schema za response nakon izmene profila
class UserProfileUpdateResponse(BaseModel):
    id: int
    username: str
    first_name: Optional[str]
    last_name: Optional[str]
    profile_image: Optional[str]
    biography: Optional[str]
    motto: Optional[str]
    updated_at: datetime
    message: str = "Profil je uspešno ažuriran"
    
    class Config:
        from_attributes = True
