---
title: "W109: Output Not Reusable"
description: "Output Not Reusable - Schema & Contract warning in Syrin"
weight: 10
---

## One-time use only

**Category**: Schema & Contract  
**Severity**: Warning  
**Detection**: Static Analysis

**Description**:  
Output of tool is not designed for reuse. Limits composability.

**What Causes It**:
- All outputs are natural language only (message, response, text, etc.)
- No structured output fields (objects/arrays)
- Output is only for display, not for tool chaining

**Why This Is a Warning**:
- Limits composability
- Hard to chain with other tools
- Output can't be used as input to other tools

**How to Fix**:
- Add structured output fields (objects/arrays)
- Include machine-readable data alongside human-readable text
- Make output suitable for tool chaining

**Example**:
```python
# ⚠️ Warning: Not reusable
@mcp.tool()
def get_status() -> str:
    """Get status message."""
    return "User is active"  # Only natural language

# ✅ Good: Reusable output
@mcp.tool()
def get_status() -> StatusData:
    """Get user status.
    
    Returns:
        Status object with status code and message
    """
    return StatusData(status="active", code=1, message="User is active")
```

## See Also

- [Warning Rules Overview](/testing/warnings/)
- [Error Rules](/testing/errors/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
