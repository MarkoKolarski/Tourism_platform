from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_tour, name='create_tour'),
    path('my/', views.get_my_tours, name='get_my_tours'),
]
