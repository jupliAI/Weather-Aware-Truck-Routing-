"""Routing and weather service integrations."""

import math
import time
from typing import List, Optional, Tuple

import requests

from .risk import RISK_ORDER, RISK_LEVELS, risk_index_from, risk_level


def haversine_meters(lat1, lon1, lat2, lon2):
    r = 6371000.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


class GeocodingService:
    def __init__(self, base_url="https://nominatim.openstreetmap.org/search"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "WeatherTruckRouting/1.0"})

    def geocode(self, query):
        params = {"q": query, "format": "json", "limit": 1}
        resp = self.session.get(self.base_url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if not data:
            raise ValueError("Could not geocode location: " + query)
        return float(data[0]["lat"]), float(data[0]["lon"])


class RoutingService:
    def __init__(self, osrm_base="https://router.project-osrm.org", ors_api_key=""):
        self.osrm_base = osrm_base.rstrip("/")
        self.ors_api_key = ors_api_key
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "WeatherTruckRouting/1.0"})

    def routes(self, origin, destination, alternatives=3):
        coords = f"{origin[1]},{origin[0]};{destination[1]},{destination[0]}"
        url = f"{self.osrm_base}/route/v1/driving/{coords}"
        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
            "alternatives": str(alternatives),
            "annotations": "duration,distance",
        }
        resp = self.session.get(url, params=params, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != "Ok" or not data.get("routes"):
            raise RuntimeError("Routing failed: " + str(data))
        result = []
        for r in data["routes"]:
            geom = r.get("geometry", {}).get("coordinates", [])
            coords_list = [(p[1], p[0]) for p in geom]
            result.append({
                "distance_m": r.get("distance", 0.0),
                "duration_s": r.get("duration", 0.0),
                "geometry": coords_list,
            })

        # If OSRM did not return enough alternatives, generate detour routes
        # by adding perpendicular-offset waypoints near the midpoint.
        if len(result) < alternatives:
            detours = self._generate_detour_routes(origin, destination,
                                                   alternatives - len(result))
            result.extend(detours)

        return result[:alternatives]

    def _generate_detour_routes(self, origin, destination, count):
        """Generate alternative routes by routing through detour waypoints."""
        detours = []
        mid_lat = (origin[0] + destination[0]) / 2
        mid_lon = (origin[1] + destination[1]) / 2
        # Perpendicular direction to the origin->destination vector
        dlat = destination[0] - origin[0]
        dlon = destination[1] - origin[1]
        length = math.sqrt(dlat ** 2 + dlon ** 2) or 1.0
        # Perpendicular offsets (degrees, scaled by trip length)
        offsets = [0.15, -0.15, 0.25, -0.25]
        used = 0
        for off in offsets:
            if used >= count:
                break
            perp_lat = -dlon / length * off
            perp_lon = dlat / length * off
            wp_lat = mid_lat + perp_lat
            wp_lon = mid_lon + perp_lon
            try:
                route = self._route_via(origin, (wp_lat, wp_lon), destination)
                if route is not None:
                    detours.append(route)
                    used += 1
            except Exception:
                continue
        return detours

    def _route_via(self, origin, waypoint, destination):
        coords = (f"{origin[1]},{origin[0]};"
                  f"{waypoint[1]},{waypoint[0]};"
                  f"{destination[1]},{destination[0]}")
        url = f"{self.osrm_base}/route/v1/driving/{coords}"
        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
        }
        resp = self.session.get(url, params=params, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != "Ok" or not data.get("routes"):
            return None
        r = data["routes"][0]
        geom = r.get("geometry", {}).get("coordinates", [])
        coords_list = [(p[1], p[0]) for p in geom]
        return {
            "distance_m": r.get("distance", 0.0),
            "duration_s": r.get("duration", 0.0),
            "geometry": coords_list,
        }

    def sample_points(self, geometry, interval_m):
        if not geometry:
            return []
        sampled = [geometry[0]]
        cumulative = 0.0
        for i in range(len(geometry) - 1):
            p1 = geometry[i]
            p2 = geometry[i + 1]
            seg = haversine_meters(p1[0], p1[1], p2[0], p2[1])
            if seg <= 0:
                continue
            while cumulative + seg >= interval_m and len(sampled) < 200:
                need = interval_m - cumulative
                frac = need / seg if seg > 0 else 0
                lat = p1[0] + (p2[0] - p1[0]) * frac
                lon = p1[1] + (p2[1] - p1[1]) * frac
                sampled.append((lat, lon))
                cumulative = 0.0
            cumulative += seg
        sampled.append(geometry[-1])
        return sampled


class WeatherService:
    def __init__(self, base_url="https://api.open-meteo.com/v1/forecast"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "WeatherTruckRouting/1.0"})

    def hourly(self, lat, lon, start_iso, hours=48):
        from datetime import datetime, timedelta
        start_date = start_iso[:10]
        end_dt = datetime.fromisoformat(start_iso[:10]) + timedelta(days=1)
        end_date = end_dt.strftime("%Y-%m-%d")
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,rain,snowfall,weather_code",
            "start_date": start_date,
            "end_date": end_date,
            "timezone": "UTC",
            "wind_speed_unit": "mph",
            "rain_unit": "in",
            "snowfall_unit": "in",
        }
        resp = self.session.get(self.base_url, params=params, timeout=60)
        resp.raise_for_status()
        return resp.json()

    def hourly_for_48h(self, lat, lon, start_iso):
        """Return 48 hours of hourly weather arrays starting at start_iso."""
        data = self.hourly(lat, lon, start_iso, hours=48)
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        if not times:
            return None
        wind = hourly.get("wind_speed_10m", [])
        rain = hourly.get("rain", [])
        snow = hourly.get("snowfall", [])
        result = []
        for i in range(min(48, len(times))):
            result.append({
                "time": times[i],
                "wind_mph": float(wind[i] or 0) if i < len(wind) else 0.0,
                "rain_inph": float(rain[i] or 0) if i < len(rain) else 0.0,
                "snow_inph": float(snow[i] or 0) if i < len(snow) else 0.0,
            })
        return result

    def at(self, lat, lon, target_iso):
        data = self.hourly(lat, lon, target_iso, hours=48)
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        if not times:
            return None
        idx = 0
        for i, t in enumerate(times):
            if t >= target_iso[:16]:
                idx = i
                break
        return {
            "time": times[idx],
            "wind_mph": _safe_get(hourly, "wind_speed_10m", idx),
            "rain_inph": _safe_get(hourly, "rain", idx),
            "snow_inph": _safe_get(hourly, "snowfall", idx),
            "temp_c": _safe_get(hourly, "temperature_2m", idx),
            "humidity": _safe_get(hourly, "relative_humidity_2m", idx),
            "weathercode": _safe_get(hourly, "weather_code", idx),
        }


def _safe_get(d, key, idx):
    arr = d.get(key, [])
    if idx < len(arr):
        v = arr[idx]
        return v if v is not None else 0.0
    return 0.0