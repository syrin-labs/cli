#!/usr/bin/env python3
"""
HTTP/SSE MCP Server Example (Python)
Runs on http://localhost:8001/mcp

Tool Dependencies:
- getCurrentLocation: Returns the current location (Bengaluru)
- getWeather: Gets weather for a location. If no location is passed, gets current location first.
- orderFood: Checks weather first, then orders food based on weather-mood.

Note: This is a simplified JSON-RPC implementation over HTTP POST/GET.
For production, use the official MCP Python SDK with proper SSE transport.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
from datetime import datetime

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.post("/mcp")
async def mcp_endpoint(request: Request):
    """Handle MCP JSON-RPC requests."""
    try:
        body = await request.json()
        method = body.get("method")
        params = body.get("params", {})
        request_id = body.get("id")
        
        if method == "initialize":
            return JSONResponse({
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {"listChanged": True},
                        "prompts": {},
                        "resources": {}
                    },
                    "serverInfo": {
                        "name": "example-http-py-server",
                        "version": "1.0.0"
                    }
                }
            })
        
        elif method == "tools/list":
            return JSONResponse({
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
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
            })
        
        elif method == "tools/call":
            tool_name = params.get("name")
            tool_args = params.get("arguments", {})
            
            if tool_name == "getCurrentLocation":
                return JSONResponse({
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
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
                })
            
            elif tool_name == "getWeather":
                location = tool_args.get("location") or "Bengaluru"
                weather = weather_data.get(location)
                
                if not weather:
                    return JSONResponse({
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": {
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
                    })
                
                return JSONResponse({
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
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
                })
            
            elif tool_name == "orderFood":
                location = tool_args.get("location") or "Bengaluru"
                weather = weather_data.get(location)
                
                if not weather:
                    return JSONResponse({
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": {
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
                    })
                
                food_recommendation = get_food_recommendation(weather["condition"], weather["temperature"])
                
                return JSONResponse({
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
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
                })
            
            else:
                return JSONResponse({
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}
                })
        
        else:
            return JSONResponse({
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {"code": -32601, "message": f"Method not found: {method}"}
            })
    
    except Exception as e:
        return JSONResponse({
            "jsonrpc": "2.0",
            "id": body.get("id") if 'body' in locals() else None,
            "error": {"code": -32603, "message": str(e)}
        })


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "ok", "server": "http-py"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
