---
title: 'W100: Implicit Tool Dependency'
description: 'Implicit Tool Dependency - Schema & Contract warning in Syrin'
weight: 1
---

## Reading between the lines

**Category**: Schema & Contract  
**Severity**: Warning  
**Detection**: Static Analysis

**Description**:  
Tool appears to depend on another tool, but the dependency is implicit.

**What Causes It**:

- Medium confidence dependency inferred (0.6–0.8)
- Dependency not stated explicitly in description
- Tool name tokens don't appear in description

**Why This Is a Warning**:

- LLM may not chain tools reliably
- Hidden dependencies make execution unpredictable
- Tool selection becomes ambiguous

**How to Fix**:

- Mention the dependency tool in the description
- Make dependencies explicit in contract (`guarantees.dependencies`)
- Update description to reference dependent tools

**Example**:

```python
# ⚠️ Warning: Implicit dependency
@mcp.tool()
def process_user_data(user_id: str) -> ProcessedData:
    """Process user data."""  # Doesn't mention fetch_user dependency
    user = fetch_user(user_id)  # Calls fetch_user but not mentioned
    return process(user)

# ✅ Good: Explicit dependency
@mcp.tool()
def process_user_data(user_id: str) -> ProcessedData:
    """Process user data using fetch_user to retrieve user information."""
    user = fetch_user(user_id)
    return process(user)
```

## See Also

- [Warning Rules Overview](/testing/warnings/)
- [Error Rules](/testing/errors/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
