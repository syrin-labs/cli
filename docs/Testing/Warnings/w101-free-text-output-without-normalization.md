---
title: "W101: Free-Text Output Without Normalization"
description: "Free-Text Output Without Normalization - Schema & Contract warning in Syrin"
weight: 2
---

## Wild and free

**Category**: Schema & Contract  
**Severity**: Warning  
**Detection**: Static Analysis

**Description**:  
Tool returns unconstrained free text. Consider normalizing output.

**What Causes It**:
- Output is string type
- No enum values provided
- No regex pattern for validation
- No description explaining format

**Why This Is a Warning**:
- Hard to reuse in other tools
- Hard to evolve and maintain
- Unpredictable output format

**How to Fix**:
- Add enum values to constrain output
- Add regex pattern for validation
- Provide clear description of expected format

**Example**:
```python
# ⚠️ Warning: Unconstrained free text
@mcp.tool()
def get_status() -> str:  # No constraints
    return "active"

# ✅ Good: Constrained output
@mcp.tool()
def get_status() -> str:
    """Get user status.
    
    Returns:
        One of: "active", "inactive", "pending"
    """
    return "active"  # Enum-like constraint
```

## See Also

- [Warning Rules Overview](/testing/warnings/)
- [Error Rules](/testing/errors/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
