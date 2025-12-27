#!/usr/bin/env node

/**
 * Stdio MCP Server Example (TypeScript)
 * 
 * Tool Dependencies:
 * - getCurrentLocation: Returns the current location (Bengaluru)
 * - getWeather: Gets weather for a location. If no location is passed, gets current location first.
 * - orderFood: Checks weather first, then orders food based on weather-mood.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Static weather data for different locations
const weatherData: Record<
  string,
  {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
  }
> = {
  Bengaluru: {
    temperature: 28,
    condition: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 12,
  },
  Mumbai: { temperature: 32, condition: 'Sunny', humidity: 75, windSpeed: 15 },
  Delhi: { temperature: 35, condition: 'Hot', humidity: 45, windSpeed: 10 },
  Chennai: { temperature: 30, condition: 'Humid', humidity: 80, windSpeed: 18 },
};

// Food recommendations based on weather conditions
const getFoodRecommendation = (
  condition: string,
  temperature: number
): string => {
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes('rain') || conditionLower.includes('cloudy')) {
    return 'Hot Masala Dosa with Sambar and Chutney - perfect for a cozy rainy day!';
  } else if (conditionLower.includes('sunny') || temperature > 30) {
    return 'Cool Raita, Fresh Fruit Salad, and Lemon Rice - refreshing for hot weather!';
  } else if (conditionLower.includes('cold') || temperature < 20) {
    return 'Hot Biryani with Raita and Gulab Jamun - warming comfort food!';
  } else {
    return 'Butter Chicken with Naan and Mango Lassi - a balanced meal for pleasant weather!';
  }
};

const mcpServer = new McpServer(
  {
    name: 'example-stdio-ts-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: { listChanged: true },
      prompts: {},
      resources: {},
    },
  }
);

// Tool 1: Get current location
mcpServer.registerTool(
  'getCurrentLocation',
  {
    description: 'Get the current location. Returns Bengaluru.',
    inputSchema: {},
  },
  () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            location: 'Bengaluru',
            message: 'Current location retrieved successfully.',
          }),
        },
      ],
    };
  }
);

// Tool 2: Get weather (optionally uses getCurrentLocation if no location provided)
mcpServer.registerTool(
  'getWeather',
  {
    description:
      'Get weather information for a location. If no location is passed, it will get the current location first.',
    inputSchema: {
      location: z
        .string()
        .optional()
        .describe('Location name (optional, defaults to current location)'),
    },
  },
  ({ location }) => {
    // If no location provided, get current location (Bengaluru)
    const targetLocation = location || 'Bengaluru';

    const weather = weatherData[targetLocation];
    if (!weather) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Weather data not available for location: ${targetLocation}`,
            }),
          },
        ],
        isError: true,
      };
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            location: targetLocation,
            temperature: weather.temperature,
            condition: weather.condition,
            humidity: weather.humidity,
            windSpeed: weather.windSpeed,
            unit: 'Celsius',
            message: `Weather retrieved for ${targetLocation}.`,
          }),
        },
      ],
    };
  }
);

// Tool 3: Order food (depends on getWeather)
mcpServer.registerTool(
  'orderFood',
  {
    description:
      'Order food based on weather-mood. This will first check the weather, then recommend food based on the weather conditions.',
    inputSchema: {
      location: z
        .string()
        .optional()
        .describe('Location name (optional, defaults to current location)'),
    },
  },
  ({ location }) => {
    // First, get weather (if no location, it will use current location)
    const targetLocation = location || 'Bengaluru';
    const weather = weatherData[targetLocation];

    if (!weather) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Cannot order food: Weather data not available for location: ${targetLocation}`,
            }),
          },
        ],
        isError: true,
      };
    }

    // Get food recommendation based on weather
    const foodRecommendation = getFoodRecommendation(
      weather.condition,
      weather.temperature
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            location: targetLocation,
            weather: {
              temperature: weather.temperature,
              condition: weather.condition,
            },
            order: foodRecommendation,
            status: 'Ordered',
            message: `Food ordered based on weather in ${targetLocation}.`,
          }),
        },
      ],
    };
  }
);

// Register prompts
mcpServer.registerPrompt(
  'documentation',
  {
    description: 'Generate documentation for code',
    argsSchema: {
      code: z.string().describe('The code to document'),
    },
  },
  ({ code }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please generate documentation for this code:\n\n${code}`,
          },
        },
      ],
    };
  }
);

// Register resources
mcpServer.registerResource(
  'Help',
  'example://help',
  {
    description: 'Help information for this server',
    mimeType: 'text/plain',
  },
  () => {
    return {
      contents: [
        {
          uri: 'example://help',
          mimeType: 'text/plain',
          text: 'This is an example stdio MCP server written in TypeScript with dependent tools.',
        },
      ],
    };
  }
);

// Start stdio transport
const transport = new StdioServerTransport();
mcpServer.connect(transport).catch(console.error);
