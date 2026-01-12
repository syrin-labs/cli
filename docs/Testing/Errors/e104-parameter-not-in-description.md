---
title: "E104: Parameter Not In Description"
description: "Parameter Not In Description - Schema & Contract error in Syrin"
weight: 6
---

## Hidden in plain sight

**Category**: Schema & Contract  
**Severity**: Error  
**Detection**: Static Analysis

**Description**:  
Required parameter is not referenced in tool description. LLM may not know parameter exists.

**What Causes It**:
- Required parameter exists in schema but not mentioned in description
- Description doesn't explain what the parameter is for
- Parameter name doesn't appear in description text

**Why This Is Fatal**:
- LLM does not know parameter exists or matters
- Parameter may be omitted in tool calls
- Tool fails with missing parameter errors

**How to Fix**:
- Mention the parameter in the tool description
- Explain what the parameter is for
- Include parameter name or related terms in description

**Example**:
```python
# ❌ Bad: Parameter not mentioned
@mcp.tool()
def fetch_user(user_id: str) -> User:
    """Fetch user information."""  # user_id not mentioned
    return get_user(user_id)

# ✅ Good: Parameter mentioned
@mcp.tool()
def fetch_user(user_id: str) -> User:
    """Fetch user information by user_id."""  # user_id mentioned
    return get_user(user_id)
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
