---
title: "E110: Tool Ambiguity"
description: "Tool Ambiguity - Schema & Contract error in Syrin"
weight: 12
---

## Too many choices

**Category**: Schema & Contract  
**Severity**: Error  
**Detection**: Static Analysis

**Description**:  
Multiple tools match the same intent. LLM tool selection is ambiguous.

**What Causes It**:
- Two or more tools have overlapping descriptions
- Tools have overlapping schemas
- No clear differentiator between tools

**Why This Is Fatal**:
- Tool selection becomes nondeterministic
- Agent behavior changes across runs/models
- Wrong tool may be selected

**How to Fix**:
- Make descriptions more distinct
- Differentiate schemas
- Add unique identifiers or names

**Example**:
```python
# ❌ Bad: Ambiguous tools
@mcp.tool()
def get_user(user_id: str) -> User:
    """Get user."""  # Too generic
    return fetch_user(user_id)

@mcp.tool()
def fetch_user(user_id: str) -> User:
    """Get user."""  # E110: Same description, same schema
    return get_user_by_id(user_id)

# ✅ Good: Distinct tools
@mcp.tool()
def get_user_by_id(user_id: str) -> User:
    """Get user by unique identifier."""
    return fetch_user(user_id)

@mcp.tool()
def get_user_by_email(email: str) -> User:
    """Get user by email address."""  # Different parameter, different purpose
    return fetch_user_by_email(email)
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
