"""
Get weather tool.
"""

import random
from typing import Annotated
from pydantic import Field
from .models import WeatherResponse
from .data import WEATHER_DATA


def get_weather(
    location: str
) -> WeatherResponse:
    """Retrieve weather information for a location.
    
    Tool chain: current_location provides location -> get_weather -> order_food
    
    Args:
        location: Location name (city, state/country, or address). Use current_location tool for user location.
                  Examples: "New York", "London, UK"
    
    Returns:
        WeatherResponse with weather condition, temperature, humidity, description.
        Use the weather field as input to order_food.
    """
    # Randomly select weather data
    weather_data = random.choice(WEATHER_DATA)
    # Note: weather and condition are set to the same value for API compatibility
    # The 'condition' field is an alias of 'weather' maintained for backward compatibility
    condition_value = weather_data['condition']
    return WeatherResponse(
        weather=condition_value,
        condition=condition_value,
        temperature=weather_data['temp'],
        humidity=weather_data['humidity'],
        description=f"Weather for {location}: {weather_data['description']}"
    )
