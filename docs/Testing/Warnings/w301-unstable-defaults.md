---
title: "W301: Unstable Defaults"
description: "Unstable Defaults - Output Validation warning in Syrin"
weight: 13
---

## Default to chaos

**Category**: Output Validation  
**Severity**: Warning  
**Detection**: Runtime (Test Execution)

**Description**:  
Tool behavior changes significantly with default values, breaking agent expectations.

**What Causes It**:
- Default values change tool behavior dramatically
- Different defaults produce different outputs
- Defaults are not stable across runs

**Why This Is a Warning**:
- Defaults should be stable and predictable
- Changing defaults breaks agent expectations
- Indicates design inconsistency

**How to Fix**:
- Ensure default values are stable and predictable
- Avoid defaults that change behavior significantly
- Document default behavior clearly
- Use consistent defaults across tool versions

**Example**:
```python
# ⚠️ Warning: Unstable defaults
@mcp.tool()
def get_data(limit: int = None) -> List[Data]:
    """Get data with optional limit."""
    if limit is None:
        limit = random.randint(10, 100)  # W301: Unstable default
    return fetch_data(limit)

# ✅ Good: Stable defaults
@mcp.tool()
def get_data(limit: int = 50) -> List[Data]:
    """Get data with limit (default: 50)."""
    return fetch_data(limit)  # Stable default
```

## See Also

- [Warning Rules Overview](/testing/warnings/)
- [Error Rules](/testing/errors/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
