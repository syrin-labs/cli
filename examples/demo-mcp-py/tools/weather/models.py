"""
Shared models for weather tools.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class CurrentWeatherResponse(BaseModel):
    """Response containing current weather information."""
    location: str = Field(description="The location name")
    latitude: float = Field(description="Latitude of the location")
    longitude: float = Field(description="Longitude of the location")
    temperature: float = Field(description="Current temperature in Celsius")
    apparent_temperature: float = Field(description="Apparent temperature (feels like) in Celsius")
    humidity: float = Field(description="Relative humidity percentage")
    weather_code: int = Field(description="WMO Weather interpretation code")
    weather_description: str = Field(description="Human-readable weather description")
    cloud_cover: float = Field(description="Cloud cover percentage")
    wind_speed: float = Field(description="Wind speed in km/h")
    wind_direction: float = Field(description="Wind direction in degrees")
    pressure: float = Field(description="Sea level pressure in hPa")
    is_day: bool = Field(description="Whether it is day or night")
    time: str = Field(description="Time of the weather data")


class HourlyDataPoint(BaseModel):
    """Single hourly forecast data point."""
    model_config = ConfigDict(extra='allow')  # Allow extra fields for flexibility
    
    time: str = Field(description="Timestamp of the forecast hour")
    temperature: Optional[float] = Field(default=None, description="Temperature in Celsius")
    apparent_temperature: Optional[float] = Field(default=None, description="Apparent temperature in Celsius")
    humidity: Optional[float] = Field(default=None, description="Relative humidity percentage")
    weather_code: Optional[int] = Field(default=None, description="WMO Weather interpretation code")
    weather_description: str = Field(description="Human-readable weather description")
    cloud_cover: Optional[float] = Field(default=None, description="Cloud cover percentage")
    wind_speed: Optional[float] = Field(default=None, description="Wind speed in km/h")
    wind_direction: Optional[float] = Field(default=None, description="Wind direction in degrees")
    precipitation: Optional[float] = Field(default=None, description="Precipitation amount in mm")
    rain: Optional[float] = Field(default=None, description="Rain amount in mm")
    showers: Optional[float] = Field(default=None, description="Showers amount in mm")
    snowfall: Optional[float] = Field(default=None, description="Snowfall amount in cm")


class DailyDataPoint(BaseModel):
    """Single daily forecast data point."""
    model_config = ConfigDict(extra='allow')  # Allow extra fields for flexibility
    
    date: str = Field(description="Date of the forecast")
    weather_code: Optional[int] = Field(default=None, description="WMO Weather interpretation code")
    weather_description: str = Field(description="Human-readable weather description")
    temperature_max: Optional[float] = Field(default=None, description="Maximum temperature in Celsius")
    temperature_min: Optional[float] = Field(default=None, description="Minimum temperature in Celsius")
    apparent_temperature_max: Optional[float] = Field(default=None, description="Maximum apparent temperature in Celsius")
    apparent_temperature_min: Optional[float] = Field(default=None, description="Minimum apparent temperature in Celsius")
    sunrise: Optional[str] = Field(default=None, description="Sunrise time")
    sunset: Optional[str] = Field(default=None, description="Sunset time")
    precipitation_sum: Optional[float] = Field(default=None, description="Total precipitation in mm")
    rain_sum: Optional[float] = Field(default=None, description="Total rain in mm")
    showers_sum: Optional[float] = Field(default=None, description="Total showers in mm")
    snowfall_sum: Optional[float] = Field(default=None, description="Total snowfall in cm")
    precipitation_hours: Optional[float] = Field(default=None, description="Hours with precipitation")
    precipitation_probability_max: Optional[float] = Field(default=None, description="Maximum precipitation probability percentage")
    wind_speed_max: Optional[float] = Field(default=None, description="Maximum wind speed in km/h")
    wind_gusts_max: Optional[float] = Field(default=None, description="Maximum wind gusts in km/h")
    wind_direction_dominant: Optional[float] = Field(default=None, description="Dominant wind direction in degrees")


class HourlyForecastResponse(BaseModel):
    """Response containing hourly weather forecast."""
    location: str = Field(description="The location name")
    latitude: float = Field(description="Latitude of the location")
    longitude: float = Field(description="Longitude of the location")
    timezone: str = Field(description="Timezone of the location")
    forecast_start: str = Field(description="Start time of the forecast")
    forecast_end: str = Field(description="End time of the forecast")
    hours: List[HourlyDataPoint] = Field(description="List of hourly forecast data points")


class DailyForecastResponse(BaseModel):
    """Response containing daily weather forecast."""
    location: str = Field(description="The location name")
    latitude: float = Field(description="Latitude of the location")
    longitude: float = Field(description="Longitude of the location")
    timezone: str = Field(description="Timezone of the location")
    forecast_start: str = Field(description="Start date of the forecast")
    forecast_end: str = Field(description="End date of the forecast")
    days: List[DailyDataPoint] = Field(description="List of daily forecast data points")
