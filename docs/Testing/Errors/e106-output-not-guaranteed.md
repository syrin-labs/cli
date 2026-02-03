---
title: 'E106: Output Not Guaranteed'
description: 'Output Not Guaranteed - Schema & Contract error in Syrin'
weight: 8
---

## Promises, promises

**Category**: Schema & Contract  
**Severity**: Error  
**Detection**: Static Analysis

**Description**:  
Output of tool is not guaranteed, but is used by downstream tools without fallback.

**What Causes It**:

- Output field is optional (`required: false`)
- Output field is nullable (`nullable: true`)
- Downstream tool requires the field but upstream doesn't guarantee it

**Why This Is Fatal**:

- Silent null propagation
- Hard-to-debug failures
- Runtime errors when field is missing

**How to Fix**:

- Make the upstream output field required
- Add fallback/handling in downstream tool
- Make downstream field nullable if appropriate

**Example**:

```python
# ❌ Bad: Output not guaranteed
def get_user() -> User:
    return User(id="123", name="John", email=None)  # email is optional

def send_email(email: str) -> None:  # E106: requires email but upstream doesn't guarantee it
    send(email)

# ✅ Good: Guaranteed output
def get_user() -> User:
    return User(id="123", name="John", email="john@example.com")  # email is required

def send_email(email: str) -> None:
    send(email)
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
