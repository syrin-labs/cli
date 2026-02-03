#!/usr/bin/env python3
"""
Parth - Example MCP Server
Supports both HTTP and stdio transports based on command-line arguments.
Uses FastMCP for simplified server setup.
"""

import sys
import argparse
import asyncio
import json
from fastmcp import FastMCP

# Create MCP server instance using FastMCP
mcp = FastMCP("Parth")

# Import tools and register them
from tools.server.current_location import current_location
from tools.server.get_weather import get_weather
from tools.server.order_food import order_food
from tools.server.data import WEATHER_DATA, WEATHER_FOOD_MAP

# Register tools
mcp.tool()(current_location)
mcp.tool()(get_weather)
mcp.tool()(order_food)


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
