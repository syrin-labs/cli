---
title: 'E102: Underspecified Required Input'
description: 'Underspecified Required Input - Schema & Contract error in Syrin'
weight: 4
---

## The devil's in the details

**Category**: Schema & Contract  
**Severity**: Error  
**Detection**: Static Analysis

**Description**:  
Required parameter is underspecified. LLM may pass invalid or ambiguous values.

**What Causes It**:

- Required parameter has broad type (string, any, object)
- No description, enum, pattern, or example provided
- Parameter lacks constraints

**Why This Is Fatal**:

- LLM will hallucinate values
- Tool invocation becomes nondeterministic
- Invalid inputs cause runtime failures

**How to Fix**:

- Add a description explaining the parameter
- Provide enum values if applicable
- Add regex pattern for validation
- Include example values

**Example**:

```python
# ❌ Bad: Underspecified
@mcp.tool()
def fetch_user(user_id: str) -> User:  # What format? UUID? Number?
    return get_user(user_id)

# ✅ Good: Well-specified
@mcp.tool()
def fetch_user(user_id: str) -> User:
    """Fetch user by ID.

    Args:
        user_id: UUID format user identifier (e.g., "550e8400-e29b-41d4-a716-446655440000")
    """
    return get_user(user_id)
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
