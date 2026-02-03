---
title: 'W106: Output Schema Too Broad'
description: 'Output Schema Too Broad - Schema & Contract warning in Syrin'
weight: 7
---

## Casting a wide net

**Category**: Schema & Contract  
**Severity**: Warning  
**Detection**: Static Analysis

**Description**:  
Output schema of tool is too broad. No contract enforcement.

**What Causes It**:

- Output type is `any`
- Output is object with no properties defined
- Schema lacks structure

**Why This Is a Warning**:

- No contract enforcement
- Breaks evolution and maintenance
- Unpredictable output structure

**How to Fix**:

- Specify concrete types instead of `any`
- Define object properties
- Add structure to output schema

**Example**:

```python
# ⚠️ Warning: Broad schema
@mcp.tool()
def get_data() -> Any:  # Too broad
    return {"anything": "goes"}

# ✅ Good: Specific schema
@mcp.tool()
def get_user() -> User:
    """Get user data.

    Returns:
        User object with id, name, and email fields
    """
    return User(id="123", name="John", email="john@example.com")
```

## See Also

- [Warning Rules Overview](/testing/warnings/)
- [Error Rules](/testing/errors/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
