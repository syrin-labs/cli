---
title: "W105: Optional Input Used as Required Downstream"
description: "Optional Input Used as Required Downstream - Schema & Contract warning in Syrin"
weight: 6
---

## Maybe becomes must

**Category**: Schema & Contract  
**Severity**: Warning  
**Detection**: Static Analysis

**Description**:  
Optional input is treated as required downstream. Hidden contract violation.

**What Causes It**:
- Source field is optional (`required: false`) or nullable (`nullable: true`)
- Target field is required (`required: true`)
- Tool chaining assumes optional field is always present

**Why This Is a Warning**:
- Hidden contract violation
- Runtime failures when optional field is missing
- Unpredictable tool chaining

**How to Fix**:
- Make source field required if it's always needed
- Make target field optional if source can be missing
- Add fallback handling in downstream tool

**Example**:
```python
# ⚠️ Warning: Optional as required
def get_user() -> User:
    return User(id="123", email=None)  # email is optional

def send_email(email: str) -> None:  # email is required
    send(email)  # W105: optional → required

# ✅ Good: Matching requirements
def get_user() -> User:
    return User(id="123", email="user@example.com")  # email is required

def send_email(email: str) -> None:
    send(email)
```

## See Also

- [Warning Rules Overview](/testing/warnings/)
- [Error Rules](/testing/errors/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
