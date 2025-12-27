package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// Weather data structure
type WeatherData struct {
	Temperature int
	Condition   string
	Humidity    int
	WindSpeed   int
}

// Static weather data for different locations
var weatherData = map[string]WeatherData{
	"Bengaluru": {Temperature: 28, Condition: "Partly Cloudy", Humidity: 65, WindSpeed: 12},
	"Mumbai":    {Temperature: 32, Condition: "Sunny", Humidity: 75, WindSpeed: 15},
	"Delhi":     {Temperature: 35, Condition: "Hot", Humidity: 45, WindSpeed: 10},
	"Chennai":   {Temperature: 30, Condition: "Humid", Humidity: 80, WindSpeed: 18},
}

// Food recommendations based on weather conditions
func getFoodRecommendation(condition string, temperature int) string {
	conditionLower := strings.ToLower(condition)
	if strings.Contains(conditionLower, "rain") || strings.Contains(conditionLower, "cloudy") {
		return "Hot Masala Dosa with Sambar and Chutney - perfect for a cozy rainy day!"
	} else if strings.Contains(conditionLower, "sunny") || temperature > 30 {
		return "Cool Raita, Fresh Fruit Salad, and Lemon Rice - refreshing for hot weather!"
	} else if strings.Contains(conditionLower, "cold") || temperature < 20 {
		return "Hot Biryani with Raita and Gulab Jamun - warming comfort food!"
	} else {
		return "Butter Chicken with Naan and Mango Lassi - a balanced meal for pleasant weather!"
	}
}

func main() {
	// Create server
	server := mcp.NewServer(&mcp.Implementation{Name: "example-http-go-server", Version: "1.0.0"}, nil)

	// Tool 1: Get current location
	type getCurrentLocationArgs struct{}
	mcp.AddTool(server, &mcp.Tool{
		Name:        "getCurrentLocation",
		Description: "Get the current location. Returns Bengaluru.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args getCurrentLocationArgs) (*mcp.CallToolResult, any, error) {
		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: `{"location": "Bengaluru", "message": "Current location retrieved successfully."}`},
			},
		}, nil, nil
	})

	// Tool 2: Get weather (optionally uses getCurrentLocation if no location provided)
	type getWeatherArgs struct {
		Location string `json:"location" jsonschema:"Location name (optional, defaults to current location)"`
	}
	mcp.AddTool(server, &mcp.Tool{
		Name:        "getWeather",
		Description: "Get weather information for a location. If no location is passed, it will get the current location first.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args getWeatherArgs) (*mcp.CallToolResult, any, error) {
		location := args.Location
		if location == "" {
			location = "Bengaluru"
		}

		weather, exists := weatherData[location]
		if !exists {
			return &mcp.CallToolResult{
				Content: []mcp.Content{
					&mcp.TextContent{Text: fmt.Sprintf(`{"error": "Weather data not available for location: %s"}`, location)},
				},
				IsError: true,
			}, nil, nil
		}

		result := fmt.Sprintf(`{"location": "%s", "temperature": %d, "condition": "%s", "humidity": %d, "windSpeed": %d, "unit": "Celsius", "message": "Weather retrieved for %s."}`,
			location, weather.Temperature, weather.Condition, weather.Humidity, weather.WindSpeed, location)
		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: result},
			},
		}, nil, nil
	})

	// Tool 3: Order food (depends on getWeather)
	type orderFoodArgs struct {
		Location string `json:"location" jsonschema:"Location name (optional, defaults to current location)"`
	}
	mcp.AddTool(server, &mcp.Tool{
		Name:        "orderFood",
		Description: "Order food based on weather-mood. This will first check the weather, then recommend food based on the weather conditions.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args orderFoodArgs) (*mcp.CallToolResult, any, error) {
		location := args.Location
		if location == "" {
			location = "Bengaluru"
		}

		weather, exists := weatherData[location]
		if !exists {
			return &mcp.CallToolResult{
				Content: []mcp.Content{
					&mcp.TextContent{Text: fmt.Sprintf(`{"error": "Cannot order food: Weather data not available for location: %s"}`, location)},
				},
				IsError: true,
			}, nil, nil
		}

		foodRecommendation := getFoodRecommendation(weather.Condition, weather.Temperature)
		result := fmt.Sprintf(`{"location": "%s", "weather": {"temperature": %d, "condition": "%s"}, "order": "%s", "status": "Ordered", "message": "Food ordered based on weather in %s."}`,
			location, weather.Temperature, weather.Condition, foodRecommendation, location)
		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: result},
			},
		}, nil, nil
	})

	// Add refactor prompt
	server.AddPrompt(&mcp.Prompt{
		Name:        "refactor",
		Description: "Refactor code",
	}, func(ctx context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		code := req.Params.Arguments["code"]
		if code == "" {
			code = "// code here"
		}
		return &mcp.GetPromptResult{
			Messages: []*mcp.PromptMessage{
				{
					Role:    "user",
					Content: &mcp.TextContent{Text: fmt.Sprintf("Please refactor this code:\n\n%s", code)},
				},
			},
		}, nil
	})

	// Add info resource
	server.AddResource(&mcp.Resource{
		URI:         "example://info",
		Name:        "Info",
		Description: "Server information",
		MIMEType:    "text/plain",
	}, func(ctx context.Context, req *mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
		return &mcp.ReadResourceResult{
			Contents: []*mcp.ResourceContents{
				{
					URI:      "example://info",
					MIMEType: "text/plain",
					Text:     "Go HTTP/SSE MCP server with dependent tools is running!",
				},
			},
		}, nil
	})

	// Create streamable HTTP handler
	handler := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server {
		return server
	}, nil)

	// Health check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok","server":"http-go"}`)
	})

	// MCP endpoint
	http.HandleFunc("/mcp", handler.ServeHTTP)

	fmt.Println("HTTP/SSE MCP Server running on http://localhost:8000/mcp")
	fmt.Println("Health check: http://localhost:8000/health")
	if err := http.ListenAndServe(":8000", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
