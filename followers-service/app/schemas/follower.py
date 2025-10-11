from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class FollowRequest(BaseModel):
    """Schema za follow zahtev"""
    follower_id: int = Field(..., description="ID korisnika koji prati")
    following_id: int = Field(..., description="ID korisnika koji se prati")


class UnfollowRequest(BaseModel):
    """Schema za unfollow zahtev"""
    follower_id: int = Field(..., description="ID korisnika koji prestaje da prati")
    following_id: int = Field(..., description="ID korisnika koji se više ne prati")


class FollowerResponse(BaseModel):
    """Schema za odgovor sa informacijama o pratiocu"""
    user_id: int
    username: str
    followed_at: Optional[str] = None


class FollowingResponse(BaseModel):
    """Schema za odgovor sa informacijama o korisniku koji se prati"""
    user_id: int
    username: str
    followed_at: Optional[str] = None


class FollowStatsResponse(BaseModel):
    """Schema za statistiku praćenja"""
    user_id: int
    followers_count: int
    following_count: int


class IsFollowingResponse(BaseModel):
    """Schema za proveru da li korisnik prati drugog korisnika"""
    follower_id: int
    following_id: int
    is_following: bool


class MutualFollowersResponse(BaseModel):
    """Schema za uzajamne pratioce"""
    user_id: int
    mutual_followers: List[FollowerResponse]
    count: int


class FollowRecommendationsResponse(BaseModel):
    """Schema za preporuke korisnika za praćenje"""
    user_id: int
    recommendations: List[FollowerResponse]
    count: int
