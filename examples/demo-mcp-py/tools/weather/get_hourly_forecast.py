"""
Get hourly forecast tool.
"""

from typing import Annotated, Optional
from pydantic import Field
import requests
from .models import HourlyForecastResponse
from .utils import parse_location, get_weather_description, OPEN_METEO_BASE_URL


def get_hourly_forecast(
    location: Annotated[
        str,
        Field(
            description="The location to get hourly weather forecast for. Can be a city name, city with country, or coordinates (latitude,longitude).",
            examples=["New York", "London, UK", "Tokyo", "52.52,13.405"],
        ),
    ],
    days: Annotated[
        Optional[int],
        Field(
            description="Number of days to forecast (1-16, default: 7)",
            default=7,
            ge=1,
            le=16,
        ),
    ] = 7,
) -> HourlyForecastResponse:
    """Get hourly weather forecast for a location using Open-Meteo API.
    
    This tool retrieves hourly weather forecast data from the Open-Meteo API.
    The forecast can be requested for 1 to 16 days ahead.
    
    Args:
        location: Location name or coordinates (latitude,longitude)
                 Examples: "New York", "London, UK", "52.52,13.405"
        days: Number of days to forecast (1-16, default: 7)
    
    Returns:
        HourlyForecastResponse with hourly forecast data including temperature, precipitation, wind, etc.
    """
    try:
        latitude, longitude, location_name = parse_location(location)
        
        # Get hourly forecast from Open-Meteo API
        response = requests.get(
            OPEN_METEO_BASE_URL,
            params={
                "latitude": latitude,
                "longitude": longitude,
                "hourly": [
                    "temperature_2m",
                    "apparent_temperature",
                    "relative_humidity_2m",
                    "weather_code",
                    "cloud_cover",
                    "wind_speed_10m",
                    "wind_direction_10m",
                    "precipitation",
                    "rain",
                    "showers",
                    "snowfall",
                ],
                "forecast_days": days,
                "timezone": "auto",
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        
        # Extract hourly arrays once to avoid repeated dictionary lookups
        temperature_arr = hourly.get("temperature_2m", [])
        apparent_arr = hourly.get("apparent_temperature", [])
        humidity_arr = hourly.get("relative_humidity_2m", [])
        weather_code_arr = hourly.get("weather_code", [])
        cloud_cover_arr = hourly.get("cloud_cover", [])
        wind_speed_arr = hourly.get("wind_speed_10m", [])
        wind_direction_arr = hourly.get("wind_direction_10m", [])
        precipitation_arr = hourly.get("precipitation", [])
        rain_arr = hourly.get("rain", [])
        showers_arr = hourly.get("showers", [])
        snowfall_arr = hourly.get("snowfall", [])
        
        # Format hourly data as list of dictionaries
        hourly_data = []
        for i in range(len(times)):
            weather_code = weather_code_arr[i] if i < len(weather_code_arr) else 0
            hourly_data.append({
                "time": times[i],
                "temperature": temperature_arr[i] if i < len(temperature_arr) else None,
                "apparent_temperature": apparent_arr[i] if i < len(apparent_arr) else None,
                "humidity": humidity_arr[i] if i < len(humidity_arr) else None,
                "weather_code": weather_code_arr[i] if i < len(weather_code_arr) else None,
                "weather_description": get_weather_description(weather_code),
                "cloud_cover": cloud_cover_arr[i] if i < len(cloud_cover_arr) else None,
                "wind_speed": wind_speed_arr[i] if i < len(wind_speed_arr) else None,
                "wind_direction": wind_direction_arr[i] if i < len(wind_direction_arr) else None,
                "precipitation": precipitation_arr[i] if i < len(precipitation_arr) else None,
                "rain": rain_arr[i] if i < len(rain_arr) else None,
                "showers": showers_arr[i] if i < len(showers_arr) else None,
                "snowfall": snowfall_arr[i] if i < len(snowfall_arr) else None,
            })
        
        return HourlyForecastResponse(
            location=location_name,
            latitude=latitude,
            longitude=longitude,
            timezone=data.get("timezone", ""),
            forecast_start=times[0] if times else "",
            forecast_end=times[-1] if times else "",
            hours=hourly_data,
        )
    except requests.RequestException as e:
        raise ValueError(f"Failed to fetch weather forecast: {e}") from e
    except (KeyError, IndexError) as e:
        raise ValueError(f"Invalid response format: {e}") from e
