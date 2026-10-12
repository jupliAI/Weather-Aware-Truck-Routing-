"""Orchestrates routing, weather sampling, risk scoring, and recommendation."""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from .risk import RISK_ORDER, RISK_LEVELS, risk_index_from, risk_level
from .services import GeocodingService, RoutingService, WeatherService, haversine_meters


MILES_PER_METER = 0.000621371


class RouteAnalyzer:
    """Analyze routes: sample weather, compute risk, recommend best route."""

    def __init__(self, routing: RoutingService, weather: WeatherService,
                 geocoding: GeocodingService):
        self.routing = routing
        self.weather = weather
        self.geocoding = geocoding

    def analyze(self, origin_text, destination_text, departure_iso,
                load_lbs, sample_miles=(10, 25, 50)):
        origin = self.geocoding.geocode(origin_text)
        destination = self.geocoding.geocode(destination_text)
        raw_routes = self.routing.routes(origin, destination, alternatives=3)

        routes = []
        for i, r in enumerate(raw_routes):
            route = self._analyze_route(r, origin, destination, departure_iso,
                                        load_lbs, sample_miles)
            routes.append(route)

        ranked = self._rank(routes)
        return {
            "origin": {"text": origin_text, "lat": origin[0], "lon": origin[1]},
            "destination": {"text": destination_text,
                            "lat": destination[0], "lon": destination[1]},
            "departure_time": departure_iso,
            "load_lbs": load_lbs,
            "routes": ranked,
        }

    def _analyze_route(self, r, origin, destination, departure_iso,
                       load_lbs, sample_miles):
        distance_m = r["distance_m"]
        duration_s = r["duration_s"]
        geometry = r["geometry"]
        checkpoints = []
        all_weather = []

        for interval in sample_miles:
            interval_m = interval / MILES_PER_METER
            samples = self.routing.sample_points(geometry, interval_m)
            route_checkpoints = []
            # Precompute cumulative distance along samples for O(1) arrival time
            cum_dists = [0.0]
            for k in range(len(samples) - 1):
                p1 = samples[k]
                p2 = samples[k + 1]
                seg = haversine_meters(p1[0], p1[1], p2[0], p2[1])
                cum_dists.append(cum_dists[-1] + seg)
            total_dist = cum_dists[-1] if cum_dists else 0.0

            for j, (lat, lon) in enumerate(samples):
                frac = (cum_dists[j] / total_dist) if total_dist > 0 else 0.0
                arrival = departure_iso + timedelta(seconds=frac * duration_s)
                w = self.weather.at(lat, lon, arrival.strftime("%Y-%m-%dT%H:%M"))
                if w is None:
                    continue
                wind = float(w.get("wind_mph", 0) or 0)
                rain = float(w.get("rain_inph", 0) or 0)
                snow = float(w.get("snow_inph", 0) or 0)
                idx = risk_index_from(wind, rain, snow, load_lbs)
                route_checkpoints.append({
                    "interval_miles": interval,
                    "index": j,
                    "lat": lat,
                    "lon": lon,
                    "arrival_time": arrival.strftime("%Y-%m-%dT%H:%M"),
                    "wind_mph": wind,
                    "rain_inph": rain,
                    "snow_inph": snow,
                    "risk_index": idx,
                    "risk_level": risk_level(idx),
                    "temp_c": w.get("temp_c"),
                    "humidity": w.get("humidity"),
                    "weathercode": w.get("weathercode"),
                })
                all_weather.append(w)
            checkpoints.append(route_checkpoints)

        flat = [c for cp in checkpoints for c in cp]
        severe_miles = sum(1 for c in flat if c["risk_index"] >= RISK_ORDER["Severe"])
        high_miles = sum(1 for c in flat if c["risk_index"] == RISK_ORDER["High"])
        avg_risk = (sum(c["risk_index"] for c in flat) / len(flat)) if flat else 0.0
        no_travel = any(c["risk_index"] == RISK_ORDER["No Travel"] for c in flat)

        return {
            "route_index": r.get("route_index", 0),
            "distance_miles": distance_m * MILES_PER_METER,
            "duration_hours": duration_s / 3600.0,
            "geometry": [[lat, lon] for (lat, lon) in geometry],
            "checkpoints_by_interval": checkpoints,
            "checkpoints": flat,
            "summary": {
                "severe_miles": severe_miles,
                "high_miles": high_miles,
                "avg_risk": avg_risk,
                "no_travel": no_travel,
                "total_checkpoints": len(flat),
            },
        }

    def _rank(self, routes):
        def score(r):
            s = r["summary"]
            if s["no_travel"]:
                return (999999, 999999, 999999, 999999)
            return (s["severe_miles"], s["high_miles"], s["avg_risk"],
                    r["duration_hours"])

        ranked = sorted(routes, key=score)
        for i, r in enumerate(ranked):
            r["rank"] = i + 1
            r["recommended"] = (i == 0)
        return ranked