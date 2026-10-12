"""Serializers for route analysis responses."""


def serialize_route(route):
    return {
        "route_index": route["route_index"],
        "rank": route["rank"],
        "recommended": route["recommended"],
        "distance_miles": round(route["distance_miles"], 2),
        "duration_hours": round(route["duration_hours"], 2),
        "geometry": route["geometry"],
        "checkpoints": route["checkpoints"],
        "checkpoints_by_interval": route["checkpoints_by_interval"],
        "summary": route["summary"],
    }


def serialize_result(result):
    return {
        "origin": result["origin"],
        "destination": result["destination"],
        "departure_time": result["departure_time"],
        "load_lbs": result["load_lbs"],
        "routes": [serialize_route(r) for r in result["routes"]],
    }