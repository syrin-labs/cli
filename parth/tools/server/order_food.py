"""
Order food tool.
"""

import random
from typing import Annotated
from pydantic import Field
from .models import FoodOrderResponse
from .data import WEATHER_FOOD_MAP


def order_food(
    weather: Annotated[
        str,
        Field(
            description="The weather condition to recommend food for. Must be one of the valid weather conditions. Obtain this from get_weather tool's weather or condition field output.",
            enum=["Sunny", "Rainy", "Snowy", "Cloudy", "Windy", "Foggy", "Stormy", "Hot", "Cold", "Misty"],
            examples=["Sunny", "Rainy", "Snowy"],
        ),
    ],
) -> FoodOrderResponse:
    """Recommend food based on weather conditions.
    
    Use get_weather to obtain weather condition, then pass the weather field to this tool.
    
    Args:
        weather: Weather condition from get_weather. Values: Sunny, Rainy, Snowy, Cloudy, Windy, Foggy, Stormy, Hot, Cold, Misty.
    
    Returns:
        FoodOrderResponse with recommended food and comment.
    """
    # Get food recommendations for this weather condition
    foods = WEATHER_FOOD_MAP.get(weather, WEATHER_FOOD_MAP["Sunny"])
    
    # Validate that foods is a non-empty sequence
    if not foods or len(foods) == 0:
        FALLBACK_FOODS = [{"food": "Sandwich", "funny": "Safe fallback option! 🥪"}]
        foods = FALLBACK_FOODS
    
    # Randomly select a food
    food_item = random.choice(foods)
    recommendation = (
        f"🍽️ Food Recommendation for {weather} Weather:\n"
        f"Order: {food_item['food']}\n"
        f"💬 {food_item['funny']}"
    )
    return FoodOrderResponse(
        food=food_item['food'],
        recommendation=recommendation,
        comment=food_item['funny']
    )
