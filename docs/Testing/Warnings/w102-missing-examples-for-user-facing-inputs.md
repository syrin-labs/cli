---
title: 'W102: Missing Examples for User-Facing Inputs'
description: 'Missing Examples for User-Facing Inputs - Schema & Contract warning in Syrin'
weight: 3
---

## Show, don't just tell

**Category**: Schema & Contract  
**Severity**: Warning  
**Detection**: Static Analysis

**Description**:  
Tool accepts user-provided input but has no examples. LLM accuracy may be reduced.

**What Causes It**:

- Tool takes user-facing input (user, email, location, query, etc.)
- No example values provided in schema
- Input lacks example documentation

**Why This Is a Warning**:

- LLM guessing increases error rate
- Ambiguous input format
- Reduced tool selection accuracy

**How to Fix**:

- Add example values to input schema
- Provide clear examples in description
- Include example in JSON Schema definition

**Example**:

```python
# ⚠️ Warning: Missing examples
@mcp.tool()
def search_users(query: str) -> List[User]:  # No example
    """Search users by query."""
    return search(query)

# ✅ Good: Has examples
@mcp.tool()
def search_users(query: str) -> List[User]:
    """Search users by query.

    Args:
        query: Search query (e.g., "John Doe", "john@example.com")
    """
    return search(query)
```

## See Also

- [Warning Rules Overview](/testing/warnings/)
- [Error Rules](/testing/errors/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
