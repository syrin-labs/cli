"""
Utility functions for weather tools.
"""

import requests
from typing import Tuple

# Base URL for Open-Meteo API
OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"


# WMO Weather interpretation codes mapping
WMO_WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def get_weather_description(weather_code: int) -> str:
    """Convert WMO weather code to human-readable description."""
    return WMO_WEATHER_CODES.get(weather_code, "Unknown weather condition")


def geocode_location(location: str) -> Tuple[float, float, str]:
    """
    Geocode a location name to latitude and longitude using Open-Meteo geocoding API.
    
    Returns:
        Tuple of (latitude, longitude, location_name)
    """
    try:
        response = requests.get(
            OPEN_METEO_GEOCODING_URL,
            params={
                "name": location,
                "count": 1,
                "language": "en",
                "format": "json",
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        
        if not data.get("results") or len(data["results"]) == 0:
            raise ValueError(f"Location '{location}' not found")
        
        result = data["results"][0]
        latitude = result["latitude"]
        longitude = result["longitude"]
        location_name = result.get("name", location)
        
        return latitude, longitude, location_name
    except requests.RequestException as e:
        raise ValueError(f"Failed to geocode location '{location}': {str(e)}") from e


def parse_location(location: str) -> Tuple[float, float, str]:
    """
    Parse location string - either coordinates (lat,lon) or location name (which will be geocoded).
    
    Returns:
        Tuple of (latitude, longitude, location_name)
    """
    # Parse coordinates if provided (format: "lat,lon"), otherwise geocode
    # Check if comma-separated parts are numeric (coordinates) before parsing
    if "," in location:
        parts = location.split(",")
        if len(parts) == 2:
            lat_str = parts[0].strip()
            lon_str = parts[1].strip()
            # Try to parse as coordinates only if both parts are numeric
            try:
                latitude = float(lat_str)
                longitude = float(lon_str)
                # Validate coordinate ranges
                if -90 <= latitude <= 90 and -180 <= longitude <= 180:
                    location_name = f"{latitude},{longitude}"
                    return latitude, longitude, location_name
                else:
                    # Out of range, treat as location name
                    return geocode_location(location)
            except ValueError:
                # Not numeric, treat as location name (e.g., "London, UK")
                return geocode_location(location)
        else:
            # Multiple commas, treat as location name
            return geocode_location(location)
    else:
        # No comma, treat as location name
        return geocode_location(location)
