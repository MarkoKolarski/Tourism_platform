from django.shortcuts import render
import json
from django.http import JsonResponse,HttpResponse
from django.views.decorators.http import require_http_methods
from .models import Tour, KeyPoint, TourDuration, Review
from math import radians, cos, sin, asin, sqrt


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

    return JsonResponse({
        "message": "KeyPoint added",
        "keypoint": {
            "id": kp.id,
            "name": kp.name,
            "latitude": kp.latitude,
            "longitude": kp.longitude
        },
        "tour_length_km": tour.length_km
    }, status=201)