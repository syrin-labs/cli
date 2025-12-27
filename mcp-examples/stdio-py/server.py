#!/usr/bin/env python3
"""
Stdio MCP Server Example (Python)
Simple JSON-RPC implementation over stdio

Tool Dependencies:
- getCurrentLocation: Returns the current location (Bengaluru)
- getWeather: Gets weather for a location. If no location is passed, gets current location first.
- orderFood: Checks weather first, then orders food based on weather-mood.
"""

import sys
import json
import math
from datetime import datetime

# Static weather data for different locations
weather_data = {
    'Bengaluru': {'temperature': 28, 'condition': 'Partly Cloudy', 'humidity': 65, 'windSpeed': 12},
    'Mumbai': {'temperature': 32, 'condition': 'Sunny', 'humidity': 75, 'windSpeed': 15},
    'Delhi': {'temperature': 35, 'condition': 'Hot', 'humidity': 45, 'windSpeed': 10},
    'Chennai': {'temperature': 30, 'condition': 'Humid', 'humidity': 80, 'windSpeed': 18},
}

# Food recommendations based on weather conditions
def get_food_recommendation(condition, temperature):
    condition_lower = condition.lower()
    if 'rain' in condition_lower or 'cloudy' in condition_lower:
        return 'Hot Masala Dosa with Sambar and Chutney - perfect for a cozy rainy day!'
    elif 'sunny' in condition_lower or temperature > 30:
        return 'Cool Raita, Fresh Fruit Salad, and Lemon Rice - refreshing for hot weather!'
    elif 'cold' in condition_lower or temperature < 20:
        return 'Hot Biryani with Raita and Gulab Jamun - warming comfort food!'
    else:
        return 'Butter Chicken with Naan and Mango Lassi - a balanced meal for pleasant weather!'


def send_response(response_id, result=None, error=None):
    """Send a JSON-RPC response."""
    if error:
        response = {
            "jsonrpc": "2.0",
            "id": response_id,
            "error": error
        }
    else:
        response = {
            "jsonrpc": "2.0",
            "id": response_id,
            "result": result
        }
    print(json.dumps(response))
    sys.stdout.flush()


def handle_initialize(request):
    """Handle initialize request."""
    return {
        "protocolVersion": "2024-11-05",
        "capabilities": {
            "tools": {"listChanged": True},
            "prompts": {},
            "resources": {}
        },
        "serverInfo": {
            "name": "example-stdio-py-server",
            "version": "1.0.0"
        }
    }


def handle_tools_list(request):
    """Handle tools/list request."""
    return {
        "tools": [
            {
                "name": "getCurrentLocation",
                "description": "Get the current location. Returns Bengaluru.",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "getWeather",
                "description": "Get weather information for a location. If no location is passed, it will get the current location first.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string", "description": "Location name (optional, defaults to current location)"}
                    }
                }
            },
            {
                "name": "orderFood",
                "description": "Order food based on weather-mood. This will first check the weather, then recommend food based on the weather conditions.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string", "description": "Location name (optional, defaults to current location)"}
                    }
                }
            }
        ]
    }


def handle_tools_call(request):
    """Handle tools/call request."""
    params = request.get("params", {})
    name = params.get("name")
    args = params.get("arguments", {})
    
    if name == "getCurrentLocation":
        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "location": "Bengaluru",
                        "message": "Current location retrieved successfully."
                    })
                }
            ],
            "isError": False
        }
    
    elif name == "getWeather":
        location = args.get("location") or "Bengaluru"
        weather = weather_data.get(location)
        
        if not weather:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps({
                            "error": f"Weather data not available for location: {location}"
                        }),
                        "isError": True
                    }
                ]
            }
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "location": location,
                        "temperature": weather["temperature"],
                        "condition": weather["condition"],
                        "humidity": weather["humidity"],
                        "windSpeed": weather["windSpeed"],
                        "unit": "Celsius",
                        "message": f"Weather retrieved for {location}."
                    })
                }
            ],
            "isError": False
        }
    
    elif name == "orderFood":
        location = args.get("location") or "Bengaluru"
        weather = weather_data.get(location)
        
        if not weather:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps({
                            "error": f"Cannot order food: Weather data not available for location: {location}"
                        }),
                        "isError": True
                    }
                ]
            }
        
        food_recommendation = get_food_recommendation(weather["condition"], weather["temperature"])
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "location": location,
                        "weather": {
                            "temperature": weather["temperature"],
                            "condition": weather["condition"]
                        },
                        "order": food_recommendation,
                        "status": "Ordered",
                        "message": f"Food ordered based on weather in {location}."
                    })
                }
            ],
            "isError": False
        }
    
    return None


def handle_prompts_list(request):
    """Handle prompts/list request."""
    return {
        "prompts": [
            {
                "name": "explain",
                "description": "Explain code or concept",
                "arguments": [
                    {"name": "topic", "description": "Topic to explain", "required": True}
                ]
            }
        ]
    }


def handle_prompts_get(request):
    """Handle prompts/get request."""
    params = request.get("params", {})
    name = params.get("name")
    args = params.get("arguments", {})
    
    if name == "explain":
        topic = args.get("topic", "")
        return {
            "messages": [
                {
                    "role": "user",
                    "content": {
                        "type": "text",
                        "text": f"Please explain: {topic}"
                    }
                }
            ]
        }
    
    return None


def handle_resources_list(request):
    """Handle resources/list request."""
    return {
        "resources": [
            {
                "uri": "example://greeting",
                "name": "Greeting",
                "description": "A greeting message",
                "mimeType": "text/plain"
            }
        ]
    }


def handle_resources_read(request):
    """Handle resources/read request."""
    params = request.get("params", {})
    uri = params.get("uri")
    
    if uri == "example://greeting":
        return {
            "contents": [
                {
                    "uri": uri,
                    "mimeType": "text/plain",
                    "text": "Hello from Python stdio MCP server with dependent tools!"
                }
            ]
        }
    
    return None


def main():
    """Main server loop."""
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            request = json.loads(line.strip())
            method = request.get("method")
            request_id = request.get("id")
            
            if method == "initialize":
                result = handle_initialize(request)
                send_response(request_id, result=result)
                # Send initialized notification
                print(json.dumps({
                    "jsonrpc": "2.0",
                    "method": "notifications/initialized"
                }))
                sys.stdout.flush()
            
            elif method == "tools/list":
                result = handle_tools_list(request)
                send_response(request_id, result=result)
            
            elif method == "tools/call":
                result = handle_tools_call(request)
                if result:
                    send_response(request_id, result=result)
                else:
                    send_response(request_id, error={"code": -32601, "message": "Unknown tool"})
            
            elif method == "prompts/list":
                result = handle_prompts_list(request)
                send_response(request_id, result=result)
            
            elif method == "prompts/get":
                result = handle_prompts_get(request)
                if result:
                    send_response(request_id, result=result)
                else:
                    send_response(request_id, error={"code": -32601, "message": "Unknown prompt"})
            
            elif method == "resources/list":
                result = handle_resources_list(request)
                send_response(request_id, result=result)
            
            elif method == "resources/read":
                result = handle_resources_read(request)
                if result:
                    send_response(request_id, result=result)
                else:
                    send_response(request_id, error={"code": -32601, "message": "Unknown resource"})
            
            else:
                send_response(request_id, error={"code": -32601, "message": f"Method not found: {method}"})
        
        except json.JSONDecodeError:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": "Parse error"}
            }
            print(json.dumps(error_response))
            sys.stdout.flush()
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": request.get("id") if 'request' in locals() else None,
                "error": {"code": -32603, "message": str(e)}
            }
            print(json.dumps(error_response))
            sys.stdout.flush()


if __name__ == "__main__":
    main()
