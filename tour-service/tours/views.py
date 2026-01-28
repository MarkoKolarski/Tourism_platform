from django.shortcuts import render
import json
from django.http import JsonResponse,HttpResponse
from django.views.decorators.http import require_http_methods
from .models import Tour, KeyPoint, TourDuration, Review
from .enum import TourStatus, TransportType
from math import radians, cos, sin, asin, sqrt
from datetime import datetime


def create_tour(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    if request.user_role != "vodic":
        return JsonResponse({"error": "Forbidden"}, status=403)

    data = json.loads(request.body)

    tour = Tour.objects.create(
        author_id=request.user_id,
        name=data["name"],
        description=data["description"],
        difficulty=data["difficulty"],
        tags=data.get("tags", []),
    )

    return JsonResponse(
        {"id": tour.id, "status": tour.status},
        status=201
    )

def get_my_tours(request):
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    if request.user_role != "vodic":
        return JsonResponse({"error": "Forbidden"}, status=403)

    tours = Tour.objects.filter(author_id=request.user_id)
    tours_data = [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "difficulty": t.difficulty,
            "tags": t.tags,
            "status": t.status,
            "price": float(t.price),
            "created_at": t.created_at.isoformat()
        }
        for t in tours
    ]
    return JsonResponse({"tours": tours_data}, status=200)

# funkcija za racunanje distance izmedju dve koordinate (Haversine formula)
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # radius -> km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return R * c

def get_keypoints_by_tour(request, tour_id):
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    try:
        keypoints = func_get_keypoints_by_tour(tour_id)
        keypoints_data = [
        {
            #"id": kp.id,
            "name": kp.name,
            "description": kp.description,
            "latitude": kp.latitude,
            "longitude": kp.longitude,
            "image": kp.image.url if kp.image else None,
            "order": kp.order
        }
        for kp in keypoints
        ]
        return JsonResponse({"keypoints": keypoints_data}, status=200)
    except Tour.DoesNotExist:
        return JsonResponse({"error": "Tour not found"}, status=404)

def func_get_keypoints_by_tour(tour_id):
    try:
        #tour = Tour.objects.get(id=tour_id, author_id=request.user_id)
        tour = Tour.objects.get(id=tour_id)
    except Tour.DoesNotExist:
        #return JsonResponse({"error": "Tour not found"}, status=404)
        raise Tour.DoesNotExist
    #keypoints = tour.keypoints.all().order_by("order")
    keypoints = KeyPoint.objects.filter(tour=tour).order_by("order")
    
    return keypoints

def add_keypoint(request, tour_id):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    if request.user_role != "vodic":
        return JsonResponse({"error": "Forbidden"}, status=403)
    
    try:
        tour = Tour.objects.get(id=tour_id, author_id=request.user_id)
    except Tour.DoesNotExist:
        return JsonResponse({"error": "Tour not found"}, status=404)
    keypoints = func_get_keypoints_by_tour(tour_id)

    data = json.loads(request.body)
    kp = KeyPoint.objects.create(
        tour=tour,
        name=data.get("name"),
        description=data.get("description"),
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        image_url=data.get("image_url", None),
        order= len(keypoints)+1                                       # order=len(keypoints) + 1
    )
    if len(keypoints) > 1:
        total_length = 0
        for i in range(1, len(keypoints)):
            total_length += haversine(
                keypoints[i-1].latitude,
                keypoints[i-1].longitude,
                keypoints[i].latitude,
                keypoints[i].longitude
            )
        tour.total_length_km = total_length
        tour.save()
        # if keypoints.exists():
        #     last = keypoints.last()
        #     tour.total_length_km += haversine(
        #         last.latitude,
        #         last.longitude,
        #         kp.latitude,
        #         kp.longitude
        #     )
        #     tour.save()

    return JsonResponse({
        "message": "KeyPoint added",
        "keypoint": {
            #"id": kp.id,
            "name": kp.name,
            "latitude": kp.latitude,
            "longitude": kp.longitude
        },
        "tour_length_km": tour.total_length_km
    }, status=201)

def get_tour_durations(tour_id):
    durations = TourDuration.objects.filter(tour_id=tour_id)
    return durations

def publish_tour(request, tour_id):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    if request.user_role != "vodic":
        return JsonResponse({"error": "Only authors can publish tours"}, status=403)

    try:
        tour = Tour.objects.get(id=tour_id, author_id=request.user_id)
    except Tour.DoesNotExist:
        return JsonResponse({"error": "Tour not found"}, status=404)

    if tour.status != TourStatus.DRAFT:
        return JsonResponse({"error": "Only draft tours can be published"}, status=400)

    if not tour.name or not tour.description or not tour.difficulty or not tour.tags:
        return JsonResponse({"error": "Tour does not have basic data"}, status=400)

    keypoints = func_get_keypoints_by_tour(tour_id)
    if keypoints.count() < 2:
        return JsonResponse({"error": "Tour must have at least 2 key points"}, status=400)

    durations = get_tour_durations(tour_id)
    if durations.count() < 1:
        return JsonResponse({"error": "Tour must have at least one transport time"}, status=400)

    tour.status = TourStatus.PUBLISHED
    tour.published_at = datetime.now()
    tour.save()

    return JsonResponse({
        "message": "Tour published successfully",
        "published_at": tour.published_at
    }, status=200)

def archive_tour(request, tour_id):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    if request.user_role != "vodic":
        return JsonResponse({"error": "Only authors can archive tours"}, status=403)

    try:
        tour = Tour.objects.get(id=tour_id, author_id=request.user_id)
    except Tour.DoesNotExist:
        return JsonResponse({"error": "Tour not found"}, status=404)

    if tour.status != TourStatus.PUBLISHED:
    #if tour.status != "published":
        return JsonResponse({"error": "Only published tours can be archived"}, status=400)

    tour.status = TourStatus.ARCHIVED
    tour.archived_at = datetime.now()
    tour.save()

    return JsonResponse({
        "message": "Tour archived successfully",
        "archived_at": tour.archived_at
    }, status=200)

def func_get_tour_by_status(status):
    if status not in {"draft", "published", "archived"}:
        raise ValueError("Invalid tour status")
    tours = Tour.objects.filter(status=status)
    return tours

def get_tours_by_status(request, status):
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        tours = func_get_tour_by_status(status)
        tours_data = [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "difficulty": t.difficulty,
                "tags": t.tags,
                "status": t.status,
                "price": float(t.price),
                "created_at": t.created_at.isoformat()
            }
            for t in tours
        ]
        return JsonResponse({"tours": tours_data}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)  
    
def get_tours_for_tourists(request):
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    tours = Tour.objects.filter(status=TourStatus.PUBLISHED)
    if tours.exists():
        tours_data = []
        for t in tours:
            fist_point = func_get_keypoints_by_tour(t.id).filter(order=1)
            tours_data.append(
                {
                    "id": t.id,
                    "name": t.name,
                    "description": t.description,
                    "difficulty": t.difficulty,
                    "tags": t.tags,
                    "status": t.status,
                    "price": float(t.price),
                    "created_at": t.created_at.isoformat(),
                    "first_keypoint": {
                        "name": fist_point[0].name,
                        "latitude": fist_point[0].latitude,
                        "longitude": fist_point[0].longitude
                    } if fist_point.exists() else None
                }
                #for t in tours
            )

    return JsonResponse({"tours": tours_data}, status=200)

def activate_tour(request, tour_id):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    if request.user_role != "vodic":
        return JsonResponse({"error": "Only authors can activate tours"}, status=403)

    try:
        tour = Tour.objects.get(id=tour_id, author_id=request.user_id)
    except Tour.DoesNotExist:
        return JsonResponse({"error": "Tour not found"}, status=404)

    if tour.status != TourStatus.ARCHIVED:
        return JsonResponse({"error": "Only archived tours can be activated"}, status=400)

    tour.status = TourStatus.PUBLISHED
    tour.archived_at = None
    tour.save()

    return JsonResponse({
        "message": "Tour activated successfully",
    }, status=200)