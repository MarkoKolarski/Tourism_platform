from django.db import models
from datetime import timedelta, datetime
from .enum import TourStatus, TransportType, ExecutionStatus

class Tour(models.Model):
    author_id = models.IntegerField()
    name = models.CharField(max_length=200)
    description = models.TextField()
    difficulty = models.IntegerField()
    tags = models.JSONField(default=list)
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=TourStatus.choices,
        default=TourStatus.DRAFT
    )

    total_length_km = models.FloatField(default=0)

    published_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
    
class KeyPoint(models.Model):
    tour = models.ForeignKey(
        Tour,
        related_name="key_points",
        on_delete=models.CASCADE
    )

    name = models.CharField(max_length=200)
    description = models.TextField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    image = models.ImageField(upload_to="keypoints/", null=True, blank=True)
    order = models.PositiveIntegerField() # Redosled ključne tačke u okviru ture
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Tour: {self.tour.name})"
    
class TourDuration(models.Model):
    tour = models.ForeignKey(
        Tour,
        related_name="durations",
        on_delete=models.CASCADE
    )

    transport_type = models.CharField(
        max_length=20,
        choices=TransportType.choices
    )

    duration_minutes = models.DurationField()

class Review(models.Model):
    tour = models.ForeignKey(
        Tour,
        related_name="reviews",
        on_delete=models.CASCADE
    )

    tourist_id = models.UUIDField()

    rating = models.IntegerField()
    comment = models.TextField()

    visited_at = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    image = models.ImageField(upload_to="reviews/",null=True)
    def __str__(self):
        return f"Review for {self.tour.name} by {self.tourist_id}"
    
class TourExecution(models.Model):
    tour = models.ForeignKey(
        Tour,
        related_name="executions",
        on_delete=models.CASCADE
    )

    tourist_id = models.UUIDField()

    status = models.CharField(
        max_length=20,
        choices=ExecutionStatus.choices,
        default=ExecutionStatus.ACTIVE
    )

    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    last_activity_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Execution of {self.tour.name} by {self.tourist_id}"

class CompletedKeyPoint(models.Model):
    execution = models.ForeignKey(
        TourExecution,
        related_name="completed_points",
        on_delete=models.CASCADE
    )

    key_point = models.ForeignKey(KeyPoint, on_delete=models.CASCADE)
    completed_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"Completed {self.key_point.name} in execution {self.execution.id}"