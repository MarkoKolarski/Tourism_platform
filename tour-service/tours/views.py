from django.shortcuts import render
import json
from django.http import JsonResponse,HttpResponse
from django.views.decorators.http import require_http_methods
from .models import Tour, KeyPoint, TourDuration, Review

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
