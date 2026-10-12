"""REST API views for route analysis."""
from datetime import datetime, timedelta, timezone

from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status as http_status

from .orchestrator import RouteAnalyzer, MILES_PER_METER
from .risk import risk_index_from, risk_level
from .services import (
    GeocodingService,
    RoutingService,
    WeatherService,
    haversine_meters,
)
from .weather_cache import patch_weather_service
from .serializers import serialize_result
from django.conf import settings


_analyzer = None
_routing = None
_weather = None


def get_analyzer():
    global _analyzer, _routing, _weather
    if _analyzer is None:
        patch_weather_service(WeatherService)
        _routing = RoutingService(
            osrm_base=settings.OSRM_BASE_URL,
            ors_api_key=settings.ORS_API_KEY,
        )
        _weather = WeatherService(base_url=settings.OPEN_METEO_URL)
        _analyzer = RouteAnalyzer(
            routing=_routing,
            weather=_weather,
            geocoding=GeocodingService(),
        )
    return _analyzer


def get_weather():
    get_analyzer()
    return _weather


@api_view(["POST"])
@permission_classes([AllowAny])
def analyze(request):
    data = request.data
    origin = data.get("origin")
    destination = data.get("destination")
    departure = data.get("departure")
    load_lbs = data.get("load_lbs", 0)

    if not origin or not destination or not departure:
        return Response(
            {"error": "origin, destination, and departure are required"},
            status=http_status.HTTP_400_BAD_REQUEST,
        )

    try:
        load_lbs = float(load_lbs)
    except (TypeError, ValueError):
        return Response(
            {"error": "load_lbs must be a number"},
            status=http_status.HTTP_400_BAD_REQUEST,
        )

    try:
        departure_iso = _parse_departure(departure)
    except ValueError as e:
        return Response(
            {"error": str(e)},
            status=http_status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = get_analyzer().analyze(
            origin_text=origin,
            destination_text=destination,
            departure_iso=departure_iso,
            load_lbs=load_lbs,
        )
        return Response(serialize_result(result))
    except Exception as e:
        return Response(
            {"error": "Analysis failed: " + str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def health(request):
    return JsonResponse({"status": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
def heatmap(request):
    """Return 48-hour hourly weather risk grid along a route corridor.

    Expects JSON body: {"geometry": [[lat, lon], ...], "departure": ISO, "load_lbs": n}
    Returns {"points": [{"lat", "lon", "hours": [{"time","wind_mph","rain_inph","snow_inph","risk_index","risk_level"}, ...]}]}
    """
    data = request.data
    geometry = data.get("geometry") or []
    departure = data.get("departure")
    load_lbs = float(data.get("load_lbs", 0) or 0)

    if not geometry or len(geometry) < 2 or not departure:
        return Response(
            {"error": "geometry (>=2 points) and departure are required"},
            status=http_status.HTTP_400_BAD_REQUEST,
        )

    try:
        departure_iso = _parse_departure(departure)
    except ValueError as e:
        return Response({"error": str(e)}, status=http_status.HTTP_400_BAD_REQUEST)

    # Sample points along the route every ~25 miles for the heatmap
    interval_m = 25.0 / MILES_PER_METER
    routing = RoutingService()
    samples = routing.sample_points(geometry, interval_m)

    # Limit to a reasonable number of points to avoid API rate limits
    max_points = 12
    if len(samples) > max_points:
        step = len(samples) / max_points
        samples = [samples[int(i * step)] for i in range(max_points)]
        samples.append(geometry[-1])

    weather = get_weather()
    points = []
    for (lat, lon) in samples:
        hours_data = weather.hourly_for_48h(lat, lon, departure_iso.isoformat())
        if hours_data is None:
            continue
        hours = []
        for h in hours_data:
            idx = risk_index_from(h["wind_mph"], h["rain_inph"], h["snow_inph"], load_lbs)
            hours.append({
                "time": h["time"],
                "wind_mph": h["wind_mph"],
                "rain_inph": h["rain_inph"],
                "snow_inph": h["snow_inph"],
                "risk_index": idx,
                "risk_level": risk_level(idx),
            })
        points.append({"lat": lat, "lon": lon, "hours": hours})

    return Response({"points": points})


def _parse_departure(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        value = value.strip()
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(value)
        except ValueError:
            raise ValueError("departure must be ISO 8601 datetime")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    raise ValueError("departure must be a datetime or ISO string")