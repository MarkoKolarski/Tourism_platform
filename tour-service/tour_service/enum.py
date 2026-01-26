from django.db import models

class TourStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"


class TransportType(models.TextChoices):
    WALK = "walk", "Peške"
    BIKE = "bike", "Bicikl"
    CAR = "car", "Automobil"


class ExecutionStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"
    ABANDONED = "abandoned", "Abandoned"
