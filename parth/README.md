# Parth - Example MCP Server

A simple example MCP server that supports both HTTP and stdio transports.

## Setup

1. Create virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Usage

### Stdio Mode (default)

```bash
python server.py --mode stdio
# or simply
python server.py
```

### HTTP Mode

```bash
python server.py --mode http --host localhost --port 8000
```

The server will be available at `http://localhost:8000/mcp`

## Features

### Tools

1. **currentLocation**: Asks the user for their current location
2. **getWeather**: Takes a location as parameter and returns weather data (temperature, condition, humidity, description)
   - Returns one of 10 different weather scenarios randomly
3. **orderFood**: Takes weather condition as input and recommends food
   - 10 different food options per weather condition
   - Includes funny comments about the food and weather
   - Weather-to-food mapping for optimal recommendations

### Prompts

1. **weather_food_guide**: Complete guide for getting weather and food recommendations
2. **quick_weather_check**: Quick weather check for any location

### Resources

1. **parth://weather-data**: Access to all weather data scenarios
2. **parth://food-recommendations**: Access to all food recommendations mapped to weather
3. **parth://help**: Help guide for using the server

## Testing with Syrin

### Stdio Mode (Default)

The config.yaml is already set up for stdio mode. Simply run:

```bash
cd /path/to/syrin
syrin dev --exec
```

This will automatically spawn the server using the script in config.yaml.

### HTTP Mode

1. Update `.syrin/config.yaml`:
   - Change `transport: 'http'`
   - Uncomment and set `mcp_url: 'http://localhost:8000/mcp'`
   - Update `script: '.venv/bin/python server.py --mode http'`

2. Option A: Spawn server internally

   ```bash
   cd /path/to/syrin
   syrin dev --exec --run-script
   ```

3. Option B: Run server manually, then connect

   ```bash
   # Terminal 1: Start server
   .venv/bin/python server.py --mode http

   # Terminal 2: Connect with Syrin
   cd /path/to/syrin
   syrin dev --exec
   ```
