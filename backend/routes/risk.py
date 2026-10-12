"""Weather risk classification rules for truck routing."""
from typing import Dict, List

RISK_LEVELS: List[str] = ["Low", "Moderate", "High", "Severe", "No Travel"]
RISK_ORDER: Dict[str, int] = {level: i for i, level in enumerate(RISK_LEVELS)}


def _classify_wind(wind_mph: float) -> int:
    if wind_mph < 25:
        return RISK_ORDER["Low"]
    if wind_mph < 35:
        return RISK_ORDER["Moderate"]
    if wind_mph < 45:
        return RISK_ORDER["High"]
    if wind_mph < 55:
        return RISK_ORDER["Severe"]
    return RISK_ORDER["No Travel"]


def _classify_rain(rain_inph: float) -> int:
    if rain_inph < 0.10:
        return RISK_ORDER["Low"]
    if rain_inph < 0.25:
        return RISK_ORDER["Moderate"]
    if rain_inph < 0.50:
        return RISK_ORDER["High"]
    if rain_inph < 1.00:
        return RISK_ORDER["Severe"]
    return RISK_ORDER["No Travel"]


def _classify_snow(snow_inph: float) -> int:
    if snow_inph < 0.5:
        return RISK_ORDER["Low"]
    if snow_inph < 1.0:
        return RISK_ORDER["Moderate"]
    if snow_inph < 2.0:
        return RISK_ORDER["High"]
    if snow_inph < 3.0:
        return RISK_ORDER["Severe"]
    return RISK_ORDER["No Travel"]


def base_risk(wind_mph: float, rain_inph: float, snow_inph: float) -> int:
    return max(_classify_wind(wind_mph), _classify_rain(rain_inph),
               _classify_snow(snow_inph))


def apply_load_rules_with_wind(base_risk_idx: int, wind_mph: float,
                               load_lbs: float) -> int:
    if wind_mph >= 55:
        return RISK_ORDER["No Travel"]
    if 45 <= wind_mph < 55 and load_lbs > 30000:
        return RISK_ORDER["No Travel"]
    if 35 <= wind_mph < 45 and load_lbs > 40000:
        return max(base_risk_idx, RISK_ORDER["Severe"])
    return base_risk_idx


def risk_level(index: int) -> str:
    if index < 0:
        index = 0
    if index >= len(RISK_LEVELS):
        index = len(RISK_LEVELS) - 1
    return RISK_LEVELS[index]


def risk_index_from(wind_mph: float, rain_inph: float, snow_inph: float,
                    load_lbs: float = 0.0) -> int:
    base = base_risk(wind_mph, rain_inph, snow_inph)
    return apply_load_rules_with_wind(base, wind_mph, load_lbs)