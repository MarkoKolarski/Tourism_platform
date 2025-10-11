from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.schemas.follower import (
    FollowRequest, 
    UnfollowRequest,
    FollowerResponse, 
    FollowingResponse,
    FollowStatsResponse,
    IsFollowingResponse,
    MutualFollowersResponse,
    FollowRecommendationsResponse
)
from app.services.follower_service import FollowerService
from app.core.database import get_neo4j_driver

router = APIRouter()


def get_follower_service():
    """Dependency injection za FollowerService"""
    driver = get_neo4j_driver()
    return FollowerService(driver)


@router.post("/follow", status_code=status.HTTP_201_CREATED)
async def follow_user(
    request: FollowRequest,
    service: FollowerService = Depends(get_follower_service)
):
    """
    Omogućava korisniku da zaprati drugog korisnika
    """
    if request.follower_id == request.following_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Korisnik ne može pratiti sam sebe"
        )
    
    success = service.follow_user(
        follower_id=request.follower_id,
        following_id=request.following_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Greška prilikom praćenja korisnika"
        )
    
    return {
        "message": "Uspešno ste zapratili korisnika",
        "follower_id": request.follower_id,
        "following_id": request.following_id
    }


@router.post("/unfollow", status_code=status.HTTP_200_OK)
async def unfollow_user(
    request: UnfollowRequest,
    service: FollowerService = Depends(get_follower_service)
):
    """
    Omogućava korisniku da prestane da prati drugog korisnika
    """
    success = service.unfollow_user(
        follower_id=request.follower_id,
        following_id=request.following_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ne pratite ovog korisnika"
        )
    
    return {
        "message": "Uspešno ste prestali da pratite korisnika",
        "follower_id": request.follower_id,
        "following_id": request.following_id
    }


@router.get("/followers/{user_id}", response_model=List[FollowerResponse])
async def get_followers(
    user_id: int,
    service: FollowerService = Depends(get_follower_service)
):
    """
    Vraća listu svih pratilaca korisnika
    """
    followers = service.get_followers(user_id)
    return followers


@router.get("/following/{user_id}", response_model=List[FollowingResponse])
async def get_following(
    user_id: int,
    service: FollowerService = Depends(get_follower_service)
):
    """
    Vraća listu svih korisnika koje korisnik prati
    """
    following = service.get_following(user_id)
    return following


@router.get("/stats/{user_id}", response_model=FollowStatsResponse)
async def get_follow_stats(
    user_id: int,
    service: FollowerService = Depends(get_follower_service)
):
    """
    Vraća statistiku praćenja za korisnika (broj pratilaca i broj korisnika koje prati)
    """
    followers_count = service.get_followers_count(user_id)
    following_count = service.get_following_count(user_id)
    
    return {
        "user_id": user_id,
        "followers_count": followers_count,
        "following_count": following_count
    }


@router.get("/is-following/{follower_id}/{following_id}", response_model=IsFollowingResponse)
async def check_is_following(
    follower_id: int,
    following_id: int,
    service: FollowerService = Depends(get_follower_service)
):
    """
    Proverava da li korisnik prati drugog korisnika
    """
    is_following = service.is_following(follower_id, following_id)
    
    return {
        "follower_id": follower_id,
        "following_id": following_id,
        "is_following": is_following
    }


@router.get("/mutual/{user_id}", response_model=MutualFollowersResponse)
async def get_mutual_followers(
    user_id: int,
    service: FollowerService = Depends(get_follower_service)
):
    """
    Vraća listu uzajamnih pratilaca (korisnici koji se međusobno prate)
    """
    mutual = service.get_mutual_followers(user_id)
    
    return {
        "user_id": user_id,
        "mutual_followers": mutual,
        "count": len(mutual)
    }


@router.get("/recommendations/{user_id}", response_model=FollowRecommendationsResponse)
async def get_follow_recommendations(
    user_id: int,
    limit: int = 10,
    service: FollowerService = Depends(get_follower_service)
):
    """
    Vraća preporuke korisnika za praćenje baziranih na praćenju prijatelja
    """
    recommendations = service.get_follow_recommendations(user_id, limit)
    
    return {
        "user_id": user_id,
        "recommendations": recommendations,
        "count": len(recommendations)
    }


@router.post("/users/create", status_code=status.HTTP_201_CREATED)
async def create_user_node(
    user_id: int,
    username: str,
    service: FollowerService = Depends(get_follower_service)
):
    """
    Kreira User node u Neo4j bazi (za sinhronizaciju sa Stakeholders servisom)
    """
    success = service.create_user_node(user_id, username)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Greška prilikom kreiranja korisnika u Neo4j"
        )
    
    return {
        "message": "Korisnik uspešno kreiran",
        "user_id": user_id,
        "username": username
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user_node(
    user_id: int,
    service: FollowerService = Depends(get_follower_service)
):
    """
    Briše User node iz Neo4j baze sa svim relacijama
    """
    success = service.delete_user(user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Korisnik nije pronađen"
        )
    
    return {
        "message": "Korisnik uspešno obrisan",
        "user_id": user_id
    }
