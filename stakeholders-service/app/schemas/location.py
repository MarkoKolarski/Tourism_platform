from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class LocationUpdateRequest(BaseModel):
    """Schema za ažuriranje trenutne lokacije korisnika"""
    latitude: float
    longitude: float
    
    @field_validator('latitude')
    def validate_latitude(cls, v):
        if not -90 <= v <= 90:
            raise ValueError('Latitude mora biti između -90 i 90 stepeni')
        return v
    
    @field_validator('longitude') 
    def validate_longitude(cls, v):
        if not -180 <= v <= 180:
            raise ValueError('Longitude mora biti između -180 i 180 stepeni')
        return v


class CurrentLocationResponse(BaseModel):
    """Schema za vraćanje trenutne lokacije korisnika"""
    id: int
    user_id: int
    latitude: float
    longitude: float
    recorded_at: datetime
    
    class Config:
        from_attributes = True


class LocationSimulatorResponse(BaseModel):
    """Schema za simulator pozicije - kompletne informacije"""
    user_id: int
    username: str
    current_location: Optional[CurrentLocationResponse] = None
    has_location: bool = False
    
    class Config:
        from_attributes = True