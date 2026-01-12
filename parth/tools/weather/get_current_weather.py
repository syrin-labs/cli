"""
Get current weather tool.
"""

from typing import Annotated
from pydantic import Field
import requests
from .models import CurrentWeatherResponse
from .utils import parse_location, get_weather_description, OPEN_METEO_BASE_URL


def get_current_weather(
    location: Annotated[
        str,
        Field(
            description="The location to get current weather for. Can be a city name, city with country, or coordinates (latitude,longitude).",
            examples=["New York", "London, UK", "Tokyo", "52.52,13.405"],
        ),
    ],
) -> CurrentWeatherResponse:
    """Get current weather conditions for a location using Open-Meteo API.
    
    This tool retrieves real-time weather data from the Open-Meteo weather forecast API.
    The location can be specified as a city name (which will be geocoded) or as coordinates.
    
    Args:
        location: Location name or coordinates (latitude,longitude)
                 Examples: "New York", "London, UK", "52.52,13.405"
    
    Returns:
        CurrentWeatherResponse with current temperature, humidity, weather conditions, wind, and pressure.
    """
    try:
        latitude, longitude, location_name = parse_location(location)
        
        # Get current weather from Open-Meteo API
        response = requests.get(
            OPEN_METEO_BASE_URL,
            params={
                "latitude": latitude,
                "longitude": longitude,
                "current": [
                    "temperature_2m",
                    "apparent_temperature",
                    "relative_humidity_2m",
                    "weather_code",
                    "cloud_cover",
                    "wind_speed_10m",
                    "wind_direction_10m",
                    "surface_pressure",
                    "is_day",
                ],
                "timezone": "auto",
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        
        current = data.get("current", {})
        current_time = current.get("time", "")
        
        weather_code = current.get("weather_code", 0)
        
        return CurrentWeatherResponse(
            location=location_name,
            latitude=latitude,
            longitude=longitude,
            temperature=current.get("temperature_2m", 0.0),
            apparent_temperature=current.get("apparent_temperature", 0.0),
            humidity=current.get("relative_humidity_2m", 0.0),
            weather_code=weather_code,
            weather_description=get_weather_description(weather_code),
            cloud_cover=current.get("cloud_cover", 0.0),
            wind_speed=current.get("wind_speed_10m", 0.0),
            wind_direction=current.get("wind_direction_10m", 0.0),
            pressure=current.get("surface_pressure", 0.0),
            is_day=bool(current.get("is_day", 0)),
            time=current_time,
        )
    except requests.RequestException as e:
        raise ValueError(f"Failed to fetch weather data: {e}") from e
    except (ValueError, KeyError, IndexError) as e:
        raise ValueError(f"Invalid response format: {e}") from e
