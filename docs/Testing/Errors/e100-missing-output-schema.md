---
title: 'E100: Missing Output Schema'
description: 'Missing Output Schema - Schema & Contract error in Syrin'
weight: 2
---

## What comes out?

**Category**: Schema & Contract  
**Severity**: Error  
**Detection**: Static Analysis

**Description**:  
Tool does not declare an output schema. Downstream tools cannot safely consume its output.

**What Causes It**:

- Tool has no output fields defined
- Output schema is empty or missing
- Tool returns data but doesn't declare structure

**Why This Is Fatal**:

- Downstream tools cannot reason about outputs
- LLM will invent structure
- Reproducibility is impossible

**How to Fix**:

- Add an output schema to the tool definition
- Specify the structure of the output using JSON Schema
- Ensure all output fields are properly typed

**Example**:

```python
# ❌ Bad: No output schema
@mcp.tool()
def fetch_user(user_id: str):
    return {"id": user_id, "name": "John"}

# ✅ Good: Has output schema
@mcp.tool()
def fetch_user(user_id: str) -> User:
    return User(id=user_id, name="John")
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
