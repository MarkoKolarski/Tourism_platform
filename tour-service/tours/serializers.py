from rest_framework import serializers
from .models import Tour, KeyPoint

class TourSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tour
        fields = "__all__"
        
class KeyPointSerializer(serializers.ModelSerializer):
    class Meta:
        model = KeyPoint
        fields = "__all__"
