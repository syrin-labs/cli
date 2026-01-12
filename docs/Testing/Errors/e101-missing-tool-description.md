---
title: "E101: Missing Tool Description"
description: "Missing Tool Description - Schema & Contract error in Syrin"
weight: 3
---

## Say what you do

**Category**: Schema & Contract  
**Severity**: Error  
**Detection**: Static Analysis

**Description**:  
Tool is missing a description. LLM cannot understand what the tool does.

**What Causes It**:
- Tool has no description field
- Description is empty or only whitespace
- Description was accidentally removed

**Why This Is Fatal**:
- LLM cannot understand what the tool does
- Tool selection becomes ambiguous
- Critical for tool discovery and usage

**How to Fix**:
- Add a clear description explaining what the tool does
- Include what inputs it expects
- Describe what it returns

**Example**:
```python
# ❌ Bad: No description
@mcp.tool()
def fetch_user(user_id: str) -> User:
    return get_user(user_id)

# ✅ Good: Has description
@mcp.tool()
def fetch_user(user_id: str) -> User:
    """Fetch user information by user ID.
    
    Args:
        user_id: Unique identifier for the user
        
    Returns:
        User object with id, name, and email
    """
    return get_user(user_id)
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
