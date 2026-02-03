#!/usr/bin/env python3
"""
Parth Weather - MCP Server for Open-Meteo Weather API
Provides weather forecast and current weather data using the Open-Meteo API.
Supports both HTTP and stdio transports based on command-line arguments.
Uses FastMCP for simplified server setup.
"""

import sys
import argparse
import asyncio
from fastmcp import FastMCP

# Create MCP server instance using FastMCP
mcp = FastMCP("Parth Weather")

# Import tools and register them
from tools.weather.get_current_weather import get_current_weather
from tools.weather.get_hourly_forecast import get_hourly_forecast
from tools.weather.get_daily_forecast import get_daily_forecast

# Register tools
mcp.tool()(get_current_weather)
mcp.tool()(get_hourly_forecast)
mcp.tool()(get_daily_forecast)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Parth Weather MCP Server")
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
        default=8001,
        help="Port for HTTP mode (default: 8001)",
    )

    args = parser.parse_args()

    if args.mode == "stdio":
        print("Starting Parth Weather MCP server in stdio mode", file=sys.stderr)
        mcp.run(transport="stdio")
    else:
        print(
            f"Starting Parth Weather MCP server in HTTP mode on http://{args.host}:{args.port}/mcp",
            file=sys.stderr,
        )
        asyncio.run(
            mcp.run_http_async(
                host=args.host,
                port=args.port,
                path="/mcp",
                json_response=True,
            )
        )


if __name__ == "__main__":
    main()
