"""In-memory cache for weather lookups to reduce duplicate API calls."""
import threading
import time
from typing import Optional, Tuple


class WeatherCache:
    """Simple TTL cache keyed by (lat, lon, time_bucket)."""

    def __init__(self, ttl_seconds: int = 300):
        self.ttl = ttl_seconds
        self._store = {}
        self._lock = threading.Lock()

    def _key(self, lat: float, lon: float, iso: str) -> Tuple:
        return (round(lat, 3), round(lon, 3), iso[:13])

    def get(self, lat, lon, iso):
        k = self._key(lat, lon, iso)
        with self._lock:
            entry = self._store.get(k)
            if not entry:
                return None
            value, ts = entry
            if time.time() - ts > self.ttl:
                del self._store[k]
                return None
            return value

    def set(self, lat, lon, iso, value):
        k = self._key(lat, lon, iso)
        with self._lock:
            self._store[k] = (value, time.time())

    def clear(self):
        with self._lock:
            self._store.clear()


def patch_weather_service(WeatherService):
    """Patch WeatherService.at to use a shared cache."""
    if getattr(WeatherService, "_cached", False):
        return WeatherService
    WeatherService._cache = WeatherCache()

    original_at = WeatherService.at

    def cached_at(self, lat, lon, target_iso):
        cached = WeatherService._cache.get(lat, lon, target_iso)
        if cached is not None:
            return cached
        result = original_at(self, lat, lon, target_iso)
        if result is not None:
            WeatherService._cache.set(lat, lon, target_iso, result)
        return result

    WeatherService.at = cached_at
    WeatherService._cached = True
    return WeatherService