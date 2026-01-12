"""
Shared models for server tools.
"""

from pydantic import BaseModel, Field


class LocationResponse(BaseModel):
    """Response containing the user's location."""
    location: str = Field(description="The user's location (city, state, country, or address)")
    prompt: str = Field(description="Status message about the location request")


class WeatherResponse(BaseModel):
    """Response containing weather information.
    
    Note: Both 'weather' and 'condition' fields contain the same value for API compatibility.
    The 'weather' field is canonical; 'condition' is an alias maintained for backward compatibility.
    """
    weather: str = Field(description="The weather condition (Sunny, Rainy, Snowy, etc.)")
    condition: str = Field(description="Alias for weather condition (maintains same value as 'weather' for backward compatibility)")
    temperature: int = Field(description="Temperature in Celsius")
    humidity: int = Field(description="Humidity percentage")
    description: str = Field(description="Human-readable weather description")


class FoodOrderResponse(BaseModel):
    """Response containing food recommendation."""
    food: str = Field(description="The recommended food item name")
    recommendation: str = Field(description="The full food recommendation message with emoji")
    comment: str = Field(description="Funny comment about the food recommendation")
