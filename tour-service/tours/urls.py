from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_tour, name='create_tour'),
    path('my/', views.get_my_tours, name='get_my_tours'),
    path('<int:tour_id>/keypoints/add/', views.add_keypoint, name='add_keypoint'),
    path("<int:tour_id>/publish/", views.publish_tour),
    path("<int:tour_id>/archive/", views.archive_tour),
    path("status/<string:status>/", views.get_tours_by_status),
    path("<int:tour_id>/activate/", views.activate_tour),
    #path("<int:tour_id>/", views.get_tour_details),
]
