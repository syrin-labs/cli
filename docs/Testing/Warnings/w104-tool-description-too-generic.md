---
title: "W104: Tool Description Too Generic"
description: "Tool Description Too Generic - Schema & Contract warning in Syrin"
weight: 5
---

## Could be anything

**Category**: Schema & Contract  
**Severity**: Warning  
**Detection**: Static Analysis

**Description**:  
Description of tool is too generic. LLM cannot discriminate tools.

**What Causes It**:
- Description uses vague verbs (get, handle, process, do, make, use, call)
- No concrete nouns (weather, location, user, file, data, etc.)
- Description lacks specificity

**Why This Is a Warning**:
- LLM cannot discriminate tools
- Tool selection becomes ambiguous
- Similar tools become indistinguishable

**How to Fix**:
- Make description more specific
- Include concrete nouns
- Use specific action verbs

**Example**:
```python
# ⚠️ Warning: Generic description
@mcp.tool()
def get_data(input: str) -> dict:
    """Get data."""  # Too vague

# ✅ Good: Specific description
@mcp.tool()
def get_weather(location: str) -> WeatherData:
    """Get weather data for a specific location."""  # Concrete nouns, specific action
```

## See Also

- [Warning Rules Overview](/testing/warnings/)
- [Error Rules](/testing/errors/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
