---
title: "W107: Multiple Entry Points for Same Concept"
description: "Multiple Entry Points for Same Concept - Schema & Contract warning in Syrin"
weight: 8
---

## Too many doors

**Category**: Schema & Contract  
**Severity**: Warning  
**Detection**: Static Analysis

**Description**:  
Multiple tools capture the same concept. Conflicting sources of truth.

**What Causes It**:
- Multiple tools ask for same conceptual data (location, user_id, email, etc.)
- Tools have overlapping input fields
- No single source of truth

**Why This Is a Warning**:
- Conflicting sources of truth
- Ambiguous data collection
- Inconsistent tool usage

**How to Fix**:
- Consolidate concept collection into a single tool
- Use one tool to provide the data
- Remove duplicate entry points

**Example**:
```python
# ⚠️ Warning: Multiple entry points
@mcp.tool()
def get_weather(location: str) -> WeatherData:  # Asks for location
    return fetch_weather(location)

@mcp.tool()
def get_forecast(place: str) -> ForecastData:  # W107: Also asks for location concept
    return fetch_forecast(place)

# ✅ Good: Single entry point
@mcp.tool()
def get_location() -> Location:
    """Get user's current location."""
    return current_location()

@mcp.tool()
def get_weather(location: Location) -> WeatherData:
    """Get weather for location."""
    return fetch_weather(location)
```

## See Also

- [Warning Rules Overview](/testing/warnings/)
- [Error Rules](/testing/errors/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
