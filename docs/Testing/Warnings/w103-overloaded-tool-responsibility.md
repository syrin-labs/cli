---
title: "W103: Overloaded Tool Responsibility"
description: "Overloaded Tool Responsibility - Schema & Contract warning in Syrin"
weight: 4
---

## Jack of all trades

**Category**: Schema & Contract  
**Severity**: Warning  
**Detection**: Static Analysis

**Description**:  
Tool appears to handle multiple responsibilities. Tool selection becomes unstable.

**What Causes It**:
- Tool description contains multiple verbs (>3)
- Description has multiple intents (>2)
- Tool does multiple conceptual things

**Why This Is a Warning**:
- Tool selection becomes unstable
- Hard to compose with other tools
- Ambiguous tool purpose

**How to Fix**:
- Split tool into multiple focused tools
- Each tool should handle a single responsibility
- Make descriptions more specific

**Example**:
```python
# ⚠️ Warning: Overloaded responsibility
@mcp.tool()
def manage_user(user_id: str, action: str, data: dict) -> dict:
    """Get, create, update, or delete user data."""  # Multiple verbs
    # Handles multiple operations

# ✅ Good: Focused tools
@mcp.tool()
def get_user(user_id: str) -> User:
    """Get user by ID."""
    return fetch_user(user_id)

@mcp.tool()
def create_user(data: dict) -> User:
    """Create a new user."""
    return create_user(data)
```

## See Also

- [Warning Rules Overview](/testing/warnings/)
- [Error Rules](/testing/errors/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
