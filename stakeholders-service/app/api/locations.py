from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.current_location import CurrentLocation
from app.schemas.location import (
    LocationUpdateRequest, 
    CurrentLocationResponse,
    LocationSimulatorResponse
)
from app.services.user_service import UserService

router = APIRouter()


@router.get("/current/{user_id}", response_model=LocationSimulatorResponse)
async def get_current_location(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Dobija trenutnu lokaciju korisnika za simulator pozicije
    
    - **user_id**: ID korisnika
    
    Vraća trenutnu lokaciju korisnika ako postoji, ili prazan odgovor.
    """
    user_service = UserService(db)
    user = user_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Korisnik nije pronađen"
        )
    
    # Dobij najnoviju lokaciju korisnika
    current_location = db.query(CurrentLocation).filter(
        CurrentLocation.user_id == user_id
    ).order_by(CurrentLocation.recorded_at.desc()).first()
    
    return LocationSimulatorResponse(
        user_id=user.id,
        username=user.username,
        current_location=current_location,
        has_location=current_location is not None
    )


@router.put("/current/{user_id}", response_model=CurrentLocationResponse)
async def update_current_location(
    user_id: int,
    location_data: LocationUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Ažurira trenutnu lokaciju korisnika (simulator pozicije)
    
    - **user_id**: ID korisnika
    - **latitude**: Geografska širina (-90 do 90)
    - **longitude**: Geografska dužina (-180 do 180)
    
    Briše prethodnu lokaciju i kreira novu sa trenutnim timestampom.
    """
    user_service = UserService(db)
    user = user_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Korisnik nije pronađen"
        )
    
    try:
        # Obriši prethodnu lokaciju korisnika (zadržavamo samo najnoviju)
        db.query(CurrentLocation).filter(
            CurrentLocation.user_id == user_id
        ).delete()
        
        # Kreiraj novu lokaciju
        new_location = CurrentLocation(
            user_id=user_id,
            latitude=location_data.latitude,
            longitude=location_data.longitude
        )
        
        db.add(new_location)
        db.commit()
        db.refresh(new_location)
        
        return new_location
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Greška pri ažuriranju lokacije: {str(e)}"
        )


@router.delete("/current/{user_id}")
async def clear_current_location(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Briše trenutnu lokaciju korisnika
    
    - **user_id**: ID korisnika
    """
    user_service = UserService(db)
    user = user_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Korisnik nije pronađen"
        )
    
    try:
        deleted_count = db.query(CurrentLocation).filter(
            CurrentLocation.user_id == user_id
        ).delete()
        
        db.commit()
        
        return {
            "message": "Lokacija je uspešno obrisana" if deleted_count > 0 else "Korisnik nije imao postavljenu lokaciju",
            "deleted_locations": deleted_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Greška pri brisanju lokacije: {str(e)}"
        )