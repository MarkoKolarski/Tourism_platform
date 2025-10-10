from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserProfileUpdate
from app.core.security import get_password_hash
from typing import Optional


class UserService:
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_user(self, user_data: UserCreate) -> User:
        """Registruje novog korisnika"""
        try:
            # Proverava da li korisničko ime već postoji
            existing_user = self.db.query(User).filter(
                (User.username == user_data.username) | 
                (User.email == user_data.email)
            ).first()
            
            if existing_user:
                if existing_user.username == user_data.username:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Korisničko ime već postoji"
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email adresa je već registrovana"
                    )
            
            # Kreira novog korisnika
            hashed_password = get_password_hash(user_data.password)
            db_user = User(
                username=user_data.username,
                email=user_data.email,
                password_hash=hashed_password,
                role=UserRole(user_data.role.value)
            )
            
            self.db.add(db_user)
            self.db.commit()
            self.db.refresh(db_user)
            
            return db_user
            
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Korisnik sa tim podacima već postoji"
            )
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Greška pri registraciji korisnika: {str(e)}"
            )
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Dobija korisnika po ID-u"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Dobija korisnika po korisničkom imenu"""
        return self.db.query(User).filter(User.username == username).first()
    
    def update_user_profile(self, user_id: int, profile_data: UserProfileUpdate, current_user_id: int) -> User:
        """Ažurira profil korisnika"""
        # Proverava da li korisnik postoji
        user = self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Korisnik nije pronađen"
            )
        
        # Proverava da li korisnik može da menja profil (samo svoj profil)
        if user.id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nemate dozvolu da menjate profil drugog korisnika"
            )
        
        # Proverava da li je korisnik blokiran
        if user.is_blocked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vaš nalog je blokiran"
            )
        
        try:
            # Ažurira samo polja koja su prosleđena
            update_data = profile_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(user, field, value)
            
            self.db.commit()
            self.db.refresh(user)
            
            return user
            
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Greška pri ažuriranju profila: {str(e)}"
            )
