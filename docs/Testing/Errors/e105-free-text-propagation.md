---
title: "E105: Free Text Propagation"
description: "Free Text Propagation - Schema & Contract error in Syrin"
weight: 7
---

## Anything goes

**Category**: Schema & Contract  
**Severity**: Error  
**Detection**: Static Analysis

**Description**:  
Free-text output is used by another tool. This is unsafe without constraints.

**What Causes It**:
- Tool outputs unconstrained string (no enum, no pattern)
- Output is used as input to another tool
- No validation or constraints on the output

**Why This Is Fatal**:
- LLM passes sentences instead of data
- Most common real-world failure
- Unpredictable tool chaining

**How to Fix**:
- Add enum values to constrain output
- Add regex pattern for validation
- Structure the output as an object with typed fields

**Example**:
```python
# ❌ Bad: Free text propagation
def get_status() -> str:  # Unconstrained string
    return "active"

def update_user(status: str) -> User:  # E105: free text → tool
    return update_user_status(status)

# ✅ Good: Constrained output
def get_status() -> str:
    """Get user status.
    
    Returns:
        One of: "active", "inactive", "pending"
    """
    return "active"  # Enum-like constraint

def update_user(status: str) -> User:
    return update_user_status(status)
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
