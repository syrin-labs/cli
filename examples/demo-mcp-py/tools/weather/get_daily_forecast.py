"""
Get daily forecast tool.
"""

from typing import Annotated, Optional
from pydantic import Field
import requests
from .models import DailyForecastResponse
from .utils import parse_location, get_weather_description, OPEN_METEO_BASE_URL


def get_daily_forecast(
    location: Annotated[
        str,
        Field(
            description="The location to get daily weather forecast for. Can be a city name, city with country, or coordinates (latitude,longitude).",
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
) -> DailyForecastResponse:
    """Get daily weather forecast for a location using Open-Meteo API.
    
    This tool retrieves daily weather forecast data from the Open-Meteo API.
    The forecast can be requested for 1 to 16 days ahead.
    
    Args:
        location: Location name or coordinates (latitude,longitude)
                 Examples: "New York", "London, UK", "52.52,13.405"
        days: Number of days to forecast (1-16, default: 7)
    
    Returns:
        DailyForecastResponse with daily forecast data including min/max temperature, precipitation, wind, etc.
    """
    try:
        latitude, longitude, location_name = parse_location(location)
        
        # Get daily forecast from Open-Meteo API
        response = requests.get(
            OPEN_METEO_BASE_URL,
            params={
                "latitude": latitude,
                "longitude": longitude,
                "daily": [
                    "weather_code",
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "apparent_temperature_max",
                    "apparent_temperature_min",
                    "sunrise",
                    "sunset",
                    "precipitation_sum",
                    "rain_sum",
                    "showers_sum",
                    "snowfall_sum",
                    "precipitation_hours",
                    "precipitation_probability_max",
                    "wind_speed_10m_max",
                    "wind_gusts_10m_max",
                    "wind_direction_10m_dominant",
                ],
                "forecast_days": days,
                "timezone": "auto",
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        
        daily = data.get("daily", {})
        times = daily.get("time", [])
        
        # Extract daily arrays once to avoid repeated dictionary lookups
        weather_codes = daily.get("weather_code", [])
        temps_max = daily.get("temperature_2m_max", [])
        temps_min = daily.get("temperature_2m_min", [])
        apparent_temps_max = daily.get("apparent_temperature_max", [])
        apparent_temps_min = daily.get("apparent_temperature_min", [])
        sunrise = daily.get("sunrise", [])
        sunset = daily.get("sunset", [])
        precipitation_sum = daily.get("precipitation_sum", [])
        rain_sum = daily.get("rain_sum", [])
        showers_sum = daily.get("showers_sum", [])
        snowfall_sum = daily.get("snowfall_sum", [])
        precipitation_hours = daily.get("precipitation_hours", [])
        precipitation_probability_max = daily.get("precipitation_probability_max", [])
        wind_speed_max = daily.get("wind_speed_10m_max", [])
        wind_gusts_max = daily.get("wind_gusts_10m_max", [])
        wind_direction_dominant = daily.get("wind_direction_10m_dominant", [])
        
        # Format daily data as list of dictionaries
        daily_data = []
        for i in range(len(times)):
            weather_code = weather_codes[i] if i < len(weather_codes) else 0
            daily_data.append({
                "date": times[i],
                "weather_code": weather_codes[i] if i < len(weather_codes) else None,
                "weather_description": get_weather_description(weather_code),
                "temperature_max": temps_max[i] if i < len(temps_max) else None,
                "temperature_min": temps_min[i] if i < len(temps_min) else None,
                "apparent_temperature_max": apparent_temps_max[i] if i < len(apparent_temps_max) else None,
                "apparent_temperature_min": apparent_temps_min[i] if i < len(apparent_temps_min) else None,
                "sunrise": sunrise[i] if i < len(sunrise) else None,
                "sunset": sunset[i] if i < len(sunset) else None,
                "precipitation_sum": precipitation_sum[i] if i < len(precipitation_sum) else None,
                "rain_sum": rain_sum[i] if i < len(rain_sum) else None,
                "showers_sum": showers_sum[i] if i < len(showers_sum) else None,
                "snowfall_sum": snowfall_sum[i] if i < len(snowfall_sum) else None,
                "precipitation_hours": precipitation_hours[i] if i < len(precipitation_hours) else None,
                "precipitation_probability_max": precipitation_probability_max[i] if i < len(precipitation_probability_max) else None,
                "wind_speed_max": wind_speed_max[i] if i < len(wind_speed_max) else None,
                "wind_gusts_max": wind_gusts_max[i] if i < len(wind_gusts_max) else None,
                "wind_direction_dominant": wind_direction_dominant[i] if i < len(wind_direction_dominant) else None,
            })
        
        return DailyForecastResponse(
            location=location_name,
            latitude=latitude,
            longitude=longitude,
            timezone=data.get("timezone", ""),
            forecast_start=times[0] if times else "",
            forecast_end=times[-1] if times else "",
            days=daily_data,
        )
    except requests.RequestException as e:
        raise ValueError(f"Failed to fetch weather forecast: {e}") from e
    except (ValueError, KeyError, IndexError) as e:
        raise ValueError(f"Invalid response format: {e}") from e
