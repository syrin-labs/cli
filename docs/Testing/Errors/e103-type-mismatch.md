---
title: 'E103: Type Mismatch'
description: 'Type Mismatch - Schema & Contract error in Syrin'
weight: 5
---

## Square peg, round hole

**Category**: Schema & Contract  
**Severity**: Error  
**Detection**: Static Analysis

**Description**:  
Output type incompatible with downstream input type. Tool chains will break.

**What Causes It**:

- Tool A outputs a type that Tool B cannot accept
- Incompatible type conversions (e.g., string → number without conversion)
- Type definitions don't match between tools

**Why This Is Fatal**:

- Tool chains silently break
- Bugs appear "random"
- Execution fails at runtime

**How to Fix**:

- Ensure output type matches downstream input type
- Add type conversion if needed
- Update schema definitions to match

**Example**:

```python
# ❌ Bad: Type mismatch
# Tool A outputs string
def get_user_id() -> str:
    return "123"

# Tool B expects number
def fetch_user(user_id: int) -> User:  # E103: string → int mismatch
    return get_user(user_id)

# ✅ Good: Matching types
def get_user_id() -> int:
    return 123

def fetch_user(user_id: int) -> User:
    return get_user(user_id)
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
