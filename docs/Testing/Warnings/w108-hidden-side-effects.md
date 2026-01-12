---
title: "W108: Hidden Side Effects"
description: "Hidden Side Effects - Schema & Contract warning in Syrin"
weight: 9
---

## What you don't see

**Category**: Schema & Contract  
**Severity**: Warning  
**Detection**: Static Analysis

**Description**:  
Tool appears to have side effects not reflected in schema. Execution surprises.

**What Causes It**:
- Tool name/description suggests mutation (create, delete, update, etc.)
- Schema doesn't reflect state changes
- No output indicating mutation occurred

**Why This Is a Warning**:
- Execution surprises
- Hard to reason about tool behavior
- Hidden state changes

**How to Fix**:
- Update output schema to reflect state changes
- Add success status, created ID, or mutation confirmation
- Document side effects in description

**Example**:
```python
# ⚠️ Warning: Hidden side effects
@mcp.tool()
def create_user(data: dict) -> User:  # Name suggests mutation
    """Create a new user."""  # Description suggests mutation
    # But output doesn't indicate creation occurred
    return User(id="123", name="John")

# ✅ Good: Schema reflects mutation
@mcp.tool()
def create_user(data: dict) -> CreateUserResult:
    """Create a new user.
    
    Returns:
        Result with success status and created user ID
    """
    user = create_user_internal(data)
    return CreateUserResult(success=True, user_id=user.id, user=user)
```

## See Also

- [Warning Rules Overview](/testing/warnings/)
- [Error Rules](/testing/errors/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
