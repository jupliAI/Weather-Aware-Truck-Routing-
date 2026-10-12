"""URL configuration for the routes app."""
from django.urls import path
from . import views

urlpatterns = [
    path("analyze/", views.analyze, name="analyze"),
    path("heatmap/", views.heatmap, name="heatmap"),
    path("health/", views.health, name="health"),
]
