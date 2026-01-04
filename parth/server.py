#!/usr/bin/env python3
"""
Parth - Example MCP Server
Supports both HTTP and stdio transports based on command-line arguments.
Uses FastMCP for simplified server setup.
"""

import sys
import argparse
import asyncio
import random
import json
from typing import Annotated
from pydantic import BaseModel, Field
from fastmcp import FastMCP

# Create MCP server instance using FastMCP
mcp = FastMCP("Parth")


# Pydantic models for structured outputs
class LocationResponse(BaseModel):
    """Response containing the user's location."""
    location: str = Field(description="The user's location (city, state, country, or address)")
    prompt: str = Field(description="Status message about the location request")


class WeatherResponse(BaseModel):
    """Response containing weather information."""
    weather: str = Field(description="The weather condition (Sunny, Rainy, Snowy, etc.). Use this field as input to order_food.")
    condition: str = Field(description="Alias for weather condition (Sunny, Rainy, Snowy, etc.)")
    temperature: int = Field(description="Temperature in Celsius")
    humidity: int = Field(description="Humidity percentage")
    description: str = Field(description="Human-readable weather description")


class FoodOrderResponse(BaseModel):
    """Response containing food recommendation."""
    food: str = Field(description="The recommended food item name")
    recommendation: str = Field(description="The full food recommendation message with emoji")
    comment: str = Field(description="Funny comment about the food recommendation")

# Weather data (10 different scenarios)
WEATHER_DATA = [
    {"condition": "Sunny", "temp": 28, "humidity": 45, "description": "Perfect beach weather! ☀️"},
    {"condition": "Rainy", "temp": 18, "humidity": 85, "description": "Grab your umbrella! 🌧️"},
    {"condition": "Snowy", "temp": -5, "humidity": 70, "description": "Winter wonderland! ❄️"},
    {"condition": "Cloudy", "temp": 22, "humidity": 60, "description": "Overcast skies ahead ☁️"},
    {"condition": "Windy", "temp": 20, "humidity": 50, "description": "Hold onto your hat! 💨"},
    {"condition": "Foggy", "temp": 15, "humidity": 95, "description": "Visibility is low! 🌫️"},
    {"condition": "Stormy", "temp": 16, "humidity": 90, "description": "Thunder and lightning! ⛈️"},
    {"condition": "Hot", "temp": 35, "humidity": 40, "description": "Scorching hot day! 🔥"},
    {"condition": "Cold", "temp": 5, "humidity": 55, "description": "Bundle up! 🧊"},
    {"condition": "Misty", "temp": 12, "humidity": 88, "description": "Mysterious mist! 🌫️"},
]

# Food recommendations mapped to weather conditions
WEATHER_FOOD_MAP = {
    "Sunny": [
        {"food": "Ice Cream", "funny": "Because nothing says 'I'm melting' like ice cream on a sunny day! 🍦"},
        {"food": "Fresh Salad", "funny": "Light and refreshing - just like your chances of staying cool! 🥗"},
        {"food": "Cold Smoothie", "funny": "Blended perfection to beat the heat! 🥤"},
        {"food": "BBQ Burger", "funny": "Grill it while the sun's out! 🔥🍔"},
        {"food": "Watermelon", "funny": "Nature's air conditioner! 🍉"},
        {"food": "Fish Tacos", "funny": "Fresh catch for a hot day! 🌮🐟"},
        {"food": "Gazpacho", "funny": "Cold soup for hot heads! 🥣"},
        {"food": "Frozen Yogurt", "funny": "Cooler than your ex's heart! 🍧"},
        {"food": "Ceviche", "funny": "Citrusy and cool - like a beach vacation! 🦐"},
        {"food": "Popsicle", "funny": "Childhood memories in frozen form! 🍭"},
    ],
    "Rainy": [
        {"food": "Hot Soup", "funny": "Warm your soul while the rain soaks your shoes! 🍲"},
        {"food": "Grilled Cheese", "funny": "Comfort food for when the sky is crying! 🧀"},
        {"food": "Mac and Cheese", "funny": "Cheesy goodness to brighten a gloomy day! 🧀🍝"},
        {"food": "Chili", "funny": "Spicy warmth to fight the damp! 🌶️"},
        {"food": "Hot Chocolate", "funny": "Liquid happiness in a cup! ☕"},
        {"food": "Fried Chicken", "funny": "Crispy comfort for wet weather! 🍗"},
        {"food": "Ramen", "funny": "Steamy noodles for a steamy day! 🍜"},
        {"food": "Pot Pie", "funny": "Warm and cozy like a blanket! 🥧"},
        {"food": "Tea and Cookies", "funny": "British weather calls for British comfort! ☕🍪"},
        {"food": "Stew", "funny": "Hearty and warm - just like your grandma's hug! 🍲"},
    ],
    "Snowy": [
        {"food": "Hot Cocoa", "funny": "Marshmallows optional, warmth mandatory! ☕"},
        {"food": "Chili", "funny": "Spice up your frozen existence! 🌶️"},
        {"food": "Soup", "funny": "Liquid warmth for solid cold! 🍲"},
        {"food": "Hot Pot", "funny": "Communal warmth in a pot! 🍲"},
        {"food": "Roasted Chicken", "funny": "Hot bird for a cold day! 🍗"},
        {"food": "Lasagna", "funny": "Layered warmth for layered clothing! 🍝"},
        {"food": "Mulled Wine", "funny": "Warm wine for cold times! 🍷"},
        {"food": "Baked Potato", "funny": "Hot and starchy - nature's hand warmer! 🥔"},
        {"food": "Fondue", "funny": "Melted cheese for melted snow! 🧀"},
        {"food": "Goulash", "funny": "Eastern European warmth! 🍲"},
    ],
    "Cloudy": [
        {"food": "Sandwich", "funny": "Simple food for simple skies! 🥪"},
        {"food": "Pasta", "funny": "Carbs to match the cloud cover! 🍝"},
        {"food": "Pizza", "funny": "Round food for round clouds! 🍕"},
        {"food": "Burrito", "funny": "Wrapped comfort for overcast days! 🌯"},
        {"food": "Sushi", "funny": "Fresh fish for fresh air! 🍣"},
        {"food": "Quesadilla", "funny": "Cheesy clouds in your mouth! 🧀"},
        {"food": "Wrap", "funny": "Wrapped up like the weather! 🌯"},
        {"food": "Panini", "funny": "Pressed and perfect! 🥪"},
        {"food": "Dumplings", "funny": "Little clouds of deliciousness! 🥟"},
        {"food": "Tacos", "funny": "Taco 'bout cloudy weather! 🌮"},
    ],
    "Windy": [
        {"food": "Soup", "funny": "Hold onto your bowl! 🍲"},
        {"food": "Stew", "funny": "Heavy food for heavy winds! 🍲"},
        {"food": "Casserole", "funny": "One-dish wonder for windy days! 🍲"},
        {"food": "Meatloaf", "funny": "Solid food for turbulent times! 🍖"},
        {"food": "Shepherd's Pie", "funny": "Comfort food that won't blow away! 🥧"},
        {"food": "Curry", "funny": "Spicy warmth to fight the breeze! 🍛"},
        {"food": "Risotto", "funny": "Creamy and stable! 🍚"},
        {"food": "Paella", "funny": "Spanish warmth for windy weather! 🥘"},
        {"food": "Jambalaya", "funny": "Spicy and hearty! 🍲"},
        {"food": "Gumbo", "funny": "Thick and satisfying! 🍲"},
    ],
    "Foggy": [
        {"food": "Soup", "funny": "Clear soup for unclear skies! 🍲"},
        {"food": "Stew", "funny": "Warm and mysterious! 🍲"},
        {"food": "Chowder", "funny": "Thick like the fog! 🍲"},
        {"food": "Bisque", "funny": "Smooth and foggy! 🍲"},
        {"food": "Porridge", "funny": "Comforting and cloudy! 🥣"},
        {"food": "Congee", "funny": "Asian comfort for foggy days! 🍲"},
        {"food": "Broth", "funny": "Clear warmth in unclear weather! 🍲"},
        {"food": "Miso Soup", "funny": "Japanese warmth! 🍲"},
        {"food": "Pho", "funny": "Vietnamese fog-fighter! 🍜"},
        {"food": "Ramen", "funny": "Steamy noodles for steamy air! 🍜"},
    ],
    "Stormy": [
        {"food": "Comfort Food", "funny": "When the sky's angry, eat happy food! 🍲"},
        {"food": "Chili", "funny": "Spicy warmth to match the thunder! 🌶️"},
        {"food": "Soup", "funny": "Warmth in the storm! 🍲"},
        {"food": "Hot Chocolate", "funny": "Sweet comfort for scary weather! ☕"},
        {"food": "Cookies", "funny": "Baked goods for baked skies! 🍪"},
        {"food": "Brownies", "funny": "Chocolate therapy! 🍫"},
        {"food": "Pie", "funny": "Sweet escape from the storm! 🥧"},
        {"food": "Cake", "funny": "Celebrate surviving the weather! 🎂"},
        {"food": "Pudding", "funny": "Smooth comfort! 🍮"},
        {"food": "Ice Cream", "funny": "Because storms are stressful! 🍦"},
    ],
    "Hot": [
        {"food": "Ice Cream", "funny": "Emergency cooling system! 🍦"},
        {"food": "Smoothie", "funny": "Blended refreshment! 🥤"},
        {"food": "Salad", "funny": "Light and cool! 🥗"},
        {"food": "Ceviche", "funny": "Raw and refreshing! 🦐"},
        {"food": "Gazpacho", "funny": "Cold soup for hot heads! 🥣"},
        {"food": "Sorbet", "funny": "Frozen fruit therapy! 🍧"},
        {"food": "Watermelon", "funny": "Nature's AC! 🍉"},
        {"food": "Cucumber Salad", "funny": "Cool as a cucumber! 🥒"},
        {"food": "Cold Noodles", "funny": "Asian cool-down! 🍜"},
        {"food": "Frozen Margarita", "funny": "Adult slushie! 🍹"},
    ],
    "Cold": [
        {"food": "Hot Soup", "funny": "Liquid warmth! 🍲"},
        {"food": "Stew", "funny": "Hearty and hot! 🍲"},
        {"food": "Hot Chocolate", "funny": "Warmth in a cup! ☕"},
        {"food": "Chili", "funny": "Spice up the cold! 🌶️"},
        {"food": "Roast", "funny": "Hot meat for cold days! 🍖"},
        {"food": "Casserole", "funny": "Baked warmth! 🍲"},
        {"food": "Hot Pot", "funny": "Communal heating! 🍲"},
        {"food": "Fondue", "funny": "Melted comfort! 🧀"},
        {"food": "Goulash", "funny": "Eastern European warmth! 🍲"},
        {"food": "Borscht", "funny": "Russian red warmth! 🍲"},
    ],
    "Misty": [
        {"food": "Soup", "funny": "Warmth in the mist! 🍲"},
        {"food": "Tea", "funny": "Steamy drink for steamy air! ☕"},
        {"food": "Porridge", "funny": "Comforting and warm! 🥣"},
        {"food": "Congee", "funny": "Asian mist-fighter! 🍲"},
        {"food": "Broth", "funny": "Clear warmth! 🍲"},
        {"food": "Miso Soup", "funny": "Japanese comfort! 🍲"},
        {"food": "Pho", "funny": "Vietnamese warmth! 🍜"},
        {"food": "Ramen", "funny": "Steamy noodles! 🍜"},
        {"food": "Hot Toddy", "funny": "Adult warmth! 🍹"},
        {"food": "Egg Drop Soup", "funny": "Chinese comfort! 🍲"},
    ],
}


# Tools
@mcp.tool()
def current_location() -> LocationResponse:
    """Get the user's current location by prompting them.
    
    This tool asks the user for their location. The location field will be empty
    until the user provides their location. The prompt field contains the question
    to ask the user. Once the user provides their location, it should be used as
    the location parameter for get_weather.
    
    Tool chain: current_location prompts user -> user provides location -> get_weather uses location parameter
    
    Returns:
        LocationResponse with an empty "location" field and a "prompt" field containing
        the question to ask the user. Once the user responds, the location field should
        be populated and passed to get_weather as the location parameter.
    """
    # In a real scenario, this would prompt the user and get their response
    # For now, this returns a structured format with an empty location and a prompt
    return LocationResponse(
        location="",
        prompt="What is your current location? Please provide your city, state, or address."
    )


@mcp.tool()
def get_weather(
    location: Annotated[
        str,
        Field(
            description="The location to get weather for. Can be a city name, city with state/country, or full address. This should be obtained from the user (either directly from conversation or by using the current_location tool to prompt the user).",
            examples=["New York", "London, UK", "San Francisco, CA", "Paris", "Tokyo, Japan"],
        ),
    ],
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
    return WeatherResponse(
        weather=weather_data['condition'],
        condition=weather_data['condition'],
        temperature=weather_data['temp'],
        humidity=weather_data['humidity'],
        description=f"Weather for {location}: {weather_data['description']}"
    )


@mcp.tool()
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


# Prompts
@mcp.prompt()
def weather_food_guide(location: str) -> list[dict]:
    """Get a complete guide on weather-based food recommendations.
    
    Args:
        location: Your current location
    """
    return [
        {
            "role": "user",
            "content": (
                f"I'm at {location}. Can you help me:\n"
                "1. Check the current weather\n"
                "2. Recommend food based on the weather\n"
                "3. Make it fun and entertaining!"
            ),
        }
    ]


@mcp.prompt()
def quick_weather_check(location: str) -> list[dict]:
    """Quick weather check for any location.
    
    Args:
        location: Location to check weather for
    """
    return [
        {
            "role": "user",
            "content": f"What's the weather like in {location}?",
        }
    ]


# Resources
@mcp.resource("parth://weather-data")
def weather_data() -> str:
    """Static weather data with 10 different weather scenarios."""
    return json.dumps(WEATHER_DATA, indent=2)


@mcp.resource("parth://food-recommendations")
def food_recommendations() -> str:
    """Food recommendations mapped to weather conditions."""
    return json.dumps(WEATHER_FOOD_MAP, indent=2)


@mcp.resource("parth://help")
def help_guide() -> str:
    """Help guide for using Parth MCP server."""
    return (
        "Parth MCP Server Help\n"
        "====================\n\n"
        "Available Tools:\n"
        "1. currentLocation - Ask user for their location\n"
        "2. getWeather - Get weather for a location\n"
        "3. orderFood - Order food based on weather\n\n"
        "Available Prompts:\n"
        "1. weather_food_guide - Complete weather and food guide\n"
        "2. quick_weather_check - Quick weather check\n\n"
        "Available Resources:\n"
        "1. parth://weather-data - Weather data\n"
        "2. parth://food-recommendations - Food recommendations\n"
        "3. parth://help - This help guide\n"
    )


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Parth MCP Server")
    parser.add_argument(
        "--mode",
        choices=["stdio", "http"],
        default="stdio",
        help="Transport mode: stdio or http (default: stdio)",
    )
    parser.add_argument(
        "--host",
        default="localhost",
        help="Host for HTTP mode (default: localhost)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port for HTTP mode (default: 8000)",
    )

    args = parser.parse_args()

    if args.mode == "stdio":
        print("Starting Parth MCP server in stdio mode", file=sys.stderr)
        mcp.run(transport="stdio")
    else:
        print(f"Starting Parth MCP server in HTTP mode on http://{args.host}:{args.port}/mcp", file=sys.stderr)
        asyncio.run(mcp.run_http_async(transport="http", host=args.host, port=args.port, path="/mcp", json_response=True))


if __name__ == "__main__":
    main()
