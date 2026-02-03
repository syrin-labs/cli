---
title: 'E108: Implicit User Input'
description: 'Implicit User Input - Schema & Contract error in Syrin'
weight: 10
---

## Where did that come from?

**Category**: Schema & Contract  
**Severity**: Error  
**Detection**: Static Analysis

**Description**:  
Tool depends on implicit user context with no explicit source.

**What Causes It**:

- Tool expects user data (name, email, location, etc.)
- No explicit tool provides this data
- Relies on conversation context or memory

**Why This Is Fatal**:

- Relies on hallucinated context
- No reliable source of data
- Tool fails when context is missing

**How to Fix**:

- Create an explicit tool to provide the user data
- Document the parameter as user input
- Ensure data comes from a reliable source

**Example**:

```python
# ❌ Bad: Implicit user input
def send_email(email: str) -> None:  # E108: email has no explicit source
    send(email)

# ✅ Good: Explicit source
def get_user_email(user_id: str) -> str:
    return get_user(user_id).email

def send_email(email: str) -> None:
    send(email)
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
