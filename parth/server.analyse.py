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
    """
    Get the user's current location by prompting them.
    
    Returns location that can be used by get_weather tool.
    Use the location field from the output as input to get_weather.
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
    """
    Retrieve weather information for a location.
    
    Use location from current_location tool output.
    Returns weather condition that can be used by order_food tool.
    Use the weather or condition field from the output as input to order_food.
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
    """
    Recommend food based on weather conditions.
    
    Use weather condition from get_weather tool output.
    The weather parameter should come from get_weather tool's weather field.
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


# ============================================================================
# TEST TOOLS FOR ANALYSIS RULES
# ============================================================================
# These test tools are organized into three sections:
# 1. ERROR RULES - Tools that trigger error-level diagnostics
# 2. WARNING RULES - Tools that trigger warning-level diagnostics
# 3. DEPENDENCY-RELATED RULES - Tools that test dependency inference and chaining
# ============================================================================


# ============================================================================
# SECTION 1: ERROR RULES
# ============================================================================
# These tools test error-level analysis rules (E001-E011).
# Errors are blocking issues that prevent safe tool usage.
# ============================================================================

# ERROR E001: Missing Output Schema
# SEEDED ISSUE: Tool has no return type annotation, so no output schema is defined.
#               Downstream tools cannot safely consume its output.
# FIX: Add a return type annotation (e.g., -> dict, -> BaseModel, -> str)
@mcp.tool()
def test_e001_no_output(data: str):
    """Tool with no output schema - should trigger E001."""
    pass

# ERROR E002: Underspecified Required Input
# SEEDED ISSUE: Required parameter "data" has broad type (str) with no constraints
#               (no description, enum, pattern, or example). LLM may pass invalid values.
# FIX: Add constraints: Field(description="...", examples=["..."], enum=[...], or pattern="...")
@mcp.tool()
def test_e002_underspecified(data: str) -> dict:
    """Tool with underspecified required input."""
    return {"result": data}

# ERROR E005: Hard Tool Ambiguity
# SEEDED ISSUE: Two tools (test_e005_tool_one, test_e005_tool_two) have overlapping descriptions
#               and schemas with no clear differentiator. Tool selection becomes nondeterministic.
# FIX: Differentiate tools by making descriptions and schemas more distinct.
#      Add unique identifiers or specific use cases to each tool.
@mcp.tool()
def test_e005_tool_one(data: Annotated[str, Field(description="Input data")]) -> dict:
    """Process data and return result."""
    return {"result": data}

@mcp.tool()
def test_e005_tool_two(data: Annotated[str, Field(description="Input data")]) -> dict:
    """Process data and return result."""
    return {"result": data}

# ERROR E006: Required Input Not Mentioned in Description
# SEEDED ISSUE: Required parameter "data" is not referenced in the tool description.
#               LLM may not know the parameter exists or matters.
# FIX: Mention the parameter in the tool description (e.g., "Process the data parameter").
# NOTE: This error is also triggered by test_e001_no_output, test_e011_no_description,
#       test_w003_no_examples, and test_w001_tool_b for their respective parameters.

# ERROR E009: Tool Depends on User Input Indirectly
# SEEDED ISSUE: Parameter "user_name" has no explicit source tool providing it.
#               Tool depends on implicit user context (conversation/memory) with no explicit source.
# FIX: Create an explicit tool to provide "user_name", or ensure it's clearly documented as user input.
# NOTE: This is tested in test_w003_no_examples (see WARNING RULES section).

# ERROR E011: Missing Tool Description
# SEEDED ISSUE: Tool has empty or whitespace-only docstring. LLM cannot understand its purpose.
# FIX: Add a clear and concise description explaining what the tool does, its inputs, and outputs.
@mcp.tool()
def test_e011_no_description(data: str) -> dict:
    """
    """
    return {"result": data}

# ============================================================================
# SECTION 2: WARNING RULES
# ============================================================================
# These tools test warning-level analysis rules (W001-W010).
# Warnings are non-blocking issues that may cause problems but don't prevent usage.
# ============================================================================

# WARNING W002: Free-Text Output Without Normalization
# SEEDED ISSUE: Output field "message" is unconstrained string (no description, enum, or pattern).
#               Consider normalizing output to improve composability.
# FIX: Add constraints: Field(description="...", enum=[...], or pattern="...")
# WARNING W010: Tool Output Not Reusable
# SEEDED ISSUE: Output is tailored only for natural language (field name "message" suggests display-only).
#               Not structured for reuse, limits composability with other tools.
# FIX: Add structured output fields (objects/arrays) to improve composability with other tools.
class TestW002Response(BaseModel):
    """Response for W002 test."""
    message: str = Field()  # No description, enum, or pattern

@mcp.tool()
def test_w002_free_text() -> TestW002Response:
    """Tool that returns unconstrained free text."""
    return TestW002Response(message="Some unconstrained text")

# WARNING W003: Missing Examples for User-Facing Inputs
# SEEDED ISSUE: Parameter "user_name" has description but no examples. LLM accuracy may be reduced.
# FIX: Add examples to Field: Field(description="...", examples=["John", "Jane"])
# NOTE: Also triggers ERROR E009 (Tool Depends on User Input Indirectly)
@mcp.tool()
def test_w003_no_examples(
    user_name: Annotated[str, Field(description="The user's name")]
) -> dict:
    """Tool with user-facing input but no examples."""
    return {"greeting": f"Hello {user_name}"}

# WARNING W004: Overloaded Tool Responsibility
# SEEDED ISSUE: Tool description mentions multiple responsibilities (get, create, delete, update).
#               Tool appears to handle multiple unrelated tasks.
# FIX: Split into multiple focused tools, each handling a single responsibility.
# WARNING W009: Hidden Side Effects
# SEEDED ISSUE: Tool description suggests mutation (create, delete, update) but schema doesn't
#               reflect state changes (no success status, created ID, etc.).
# FIX: Update output schema to reflect state changes (e.g., add success status, created ID, etc.).
@mcp.tool()
def test_w004_overloaded() -> dict:
    """Get user, create user, delete user, and update user data."""
    return {"result": "done"}

# WARNING W005: Generic Description
# SEEDED ISSUE: Tool description "Handle it." is too generic and lacks specificity.
# FIX: Make description more specific with concrete nouns and actions
#      (e.g., "Get weather data for a location" instead of "Handle it").
@mcp.tool()
def test_w005_generic() -> dict:
    """Handle it."""
    return {"result": "done"}

# WARNING W007: Broad Output Schema
# SEEDED ISSUE: Output schema is an object with no properties defined (dict return type).
#               Schema is too broad and doesn't specify structure.
# FIX: Define a proper BaseModel with Field specifications, or define properties in the schema.
@mcp.tool()
def test_w007_broad() -> dict:
    """Tool with broad output schema."""
    return {"data": "anything"}

# WARNING W008: Multiple Entry Points for Same Concept
# SEEDED ISSUE: Multiple tools (test_w008_get_location, test_w008_ask_location, test_w008_find_location)
#               all ask for the same concept "location" as required input. Conflicting sources of truth.
# FIX: Consolidate location collection into a single tool to avoid conflicting sources of truth.
@mcp.tool()
def test_w008_get_location(location: Annotated[str, Field(description="User location")]) -> dict:
    """Get user location."""
    return {"location": location}

@mcp.tool()
def test_w008_ask_location(location: Annotated[str, Field(description="User location")]) -> dict:
    """Ask user for their location."""
    return {"location": location}

@mcp.tool()
def test_w008_find_location(location: Annotated[str, Field(description="Location to find")]) -> dict:
    """Find location."""
    return {"location": location}

# ============================================================================
# SECTION 3: DEPENDENCY-RELATED RULES
# ============================================================================
# These tools test rules that require dependency inference between tools.
# Dependencies are inferred based on field name similarity, type compatibility,
# and description overlap. Rules require high-confidence dependencies (>=0.8).
# ============================================================================

# ERROR E003: Unsafe Tool Chaining (Type Mismatch)
# SEEDED ISSUE: test_e003_tool_a outputs "enabled" as integer, but test_e003_tool_b expects boolean.
#               Types are incompatible (integer -> boolean). Tool chains will break.
# FIX: Ensure output type matches input type, or modify the downstream tool to accept the source type.
# NOTE: Requires high-confidence dependency (>=0.8) to trigger. Dependency inference needs:
#       - Exact field name match (enabled -> enabled)
#       - Compatible types for dependency inference (but incompatible for rule check)
#       - Strong description overlap
class TestE003OutputA(BaseModel):
    """Output from tool A."""
    enabled: int = Field(description="Enabled flag as integer")

@mcp.tool()
def test_e003_tool_a() -> TestE003OutputA:
    """Tool A outputs enabled flag. Use enabled in test_e003_tool_b."""
    return TestE003OutputA(enabled=1)

@mcp.tool()
def test_e003_tool_b(enabled: Annotated[bool, Field(description="Enabled flag from test_e003_tool_a")]) -> dict:
    """Tool B uses enabled flag from test_e003_tool_a."""
    return {"result": enabled}

# ERROR E004: Unsafe Tool Chaining (Free Text Propagation)
# SEEDED ISSUE: test_e004_tool_a outputs unconstrained free text (no description, enum, or pattern).
#               This text is used by test_e004_tool_b. LLM may pass sentences instead of structured data.
# FIX: Constrain the output by adding enum values, regex pattern, or clear description of expected format.
# NOTE: Requires high-confidence dependency (>=0.8) to trigger.
class TestE4OutputA(BaseModel):
    """Output from tool A."""
    text: str = Field()  # No constraints - unconstrained free text (no description, enum, or pattern)

@mcp.tool()
def test_e004_tool_a() -> TestE4OutputA:
    """Retrieve text information for processing.
    
    Returns:
        TestE4OutputA with text field. Use the text field as input to test_e004_tool_b.
    """
    return TestE4OutputA(text="Some free text message")

@mcp.tool()
def test_e004_tool_b(text: Annotated[str, Field(description="Text from test_e004_tool_a for processing")]) -> dict:
    """Process text information from test_e004_tool_a.
    
    Args:
        text: Text data. Use test_e004_tool_a text field output.
    """
    return {"result": text}

# ERROR E007: Output Used Downstream but Not Guaranteed
# SEEDED ISSUE: test_e007_tool_a outputs nullable "data" field, but test_e007_tool_b requires it
#               without fallback. Silent null propagation can cause hard-to-debug failures.
# FIX: Make the output non-nullable, or ensure the downstream tool handles null values.
# NOTE: Requires high-confidence dependency (>=0.8) to trigger.
class TestE7OutputA(BaseModel):
    """Output from tool A."""
    data: str | None = Field(description="Nullable data", default=None)

@mcp.tool()
def test_e007_tool_a() -> TestE7OutputA:
    """Retrieve data information for processing.
    
    Returns:
        TestE7OutputA with data field. Use the data field as input to test_e007_tool_b.
    """
    return TestE7OutputA(data=None)

@mcp.tool()
def test_e007_tool_b(data: Annotated[str, Field(description="Data from test_e007_tool_a for processing")]) -> dict:
    """Process data information from test_e007_tool_a.
    
    Args:
        data: Data value. Use test_e007_tool_a data field output.
    """
    return {"output": data}

# ERROR E008: Circular Tool Dependency
# SEEDED ISSUE: Tool dependency graph contains a cycle: test_e008_tool_a -> test_e008_tool_b -> test_e008_tool_a.
#               LLMs cannot reason about cycles, execution becomes undefined.
# FIX: Break the cycle by removing one dependency or restructuring the tools.
# NOTE: Requires high-confidence dependencies (>=0.8) forming a cycle to trigger.
#       This test case successfully creates a circular dependency that is detected.
class TestE8OutputA(BaseModel):
    """Output from tool A."""
    token: str = Field(description="Token for tool B")

class TestE8OutputB(BaseModel):
    """Output from tool B."""
    token: str = Field(description="Token for tool A")  # Same field name creates cycle

@mcp.tool()
def test_e008_tool_a(token: Annotated[str, Field(description="Token value from test_e008_tool_b")]) -> TestE8OutputA:
    """Tool A outputs token value. Use token in test_e008_tool_b."""
    return TestE8OutputA(token=f"token_a_{token}")

@mcp.tool()
def test_e008_tool_b(token: Annotated[str, Field(description="Token value from test_e008_tool_a")]) -> TestE8OutputB:
    """Tool B outputs token value. Use token in test_e008_tool_a."""
    return TestE8OutputB(token=f"token_b_{token}")

# WARNING W001: Implicit Dependency
# SEEDED ISSUE: Medium-confidence dependency exists (test_w001_tool_a.user_id -> test_w001_tool_b.user_id)
#               but is not mentioned in test_w001_tool_b's description. Hidden dependency may cause issues.
# FIX: Mention the source tool in the description (e.g., "Use user_id from test_w001_tool_a").
# NOTE: Also triggers ERROR E006 (Required Input Not Mentioned in Description).
class TestW1OutputA(BaseModel):
    """Output from tool A."""
    user_id: str = Field(description="User identifier")

@mcp.tool()
def test_w001_tool_a() -> TestW1OutputA:
    """Tool A that outputs user_id."""
    return TestW1OutputA(user_id="123")

@mcp.tool()
def test_w001_tool_b(user_id: Annotated[str, Field(description="User ID")]) -> dict:
    """Get user details. (Doesn't mention test_w001_tool_a)."""
    return {"user": user_id}

# WARNING W006: Optional Input Used as Required Downstream
# SEEDED ISSUE: test_w006_tool_a outputs optional/nullable "value", but test_w006_tool_b requires it.
#               Hidden contract violation - optional source treated as required downstream.
# FIX: Make the source output non-nullable, or make the downstream input optional.
# NOTE: Requires high-confidence dependency (>=0.8) to trigger.
class TestW6OutputA(BaseModel):
    """Output from tool A."""
    value: str | None = Field(description="Optional value", default=None)

@mcp.tool()
def test_w006_tool_a() -> TestW6OutputA:
    """Retrieve value information for processing.
    
    Returns:
        TestW6OutputA with value field. Use the value field as input to test_w006_tool_b.
    """
    return TestW6OutputA(value=None)

@mcp.tool()
def test_w006_tool_b(value: Annotated[str, Field(description="Value from test_w006_tool_a for processing")]) -> dict:
    """Process value information from test_w006_tool_a.
    
    Args:
        value: Value data. Use test_w006_tool_a value field output.
    """
    return {"result": value}


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
        "1. current_location - Ask user for their location\n"
        "2. get_weather - Get weather for a location\n"
        "3. order_food - Recommend food based on weather\n\n"
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
