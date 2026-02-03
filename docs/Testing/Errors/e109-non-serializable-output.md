---
title: 'E109: Non-Serializable Output'
description: 'Non-Serializable Output - Schema & Contract error in Syrin'
weight: 11
---

## Can't send that

**Category**: Schema & Contract  
**Severity**: Error  
**Detection**: Static Analysis

**Description**:  
Output of tool is not serializable. Breaks MCP contract.

**What Causes It**:

- Output contains functions
- Output contains class instances
- Output contains unsupported types (undefined, symbol, bigint)

**Why This Is Fatal**:

- Breaks MCP contract
- Breaks recording & replay
- Cannot be transmitted over protocol

**How to Fix**:

- Change output type to serializable types
- Convert objects to plain dictionaries
- Remove non-serializable fields

**Example**:

```python
# ❌ Bad: Non-serializable
@mcp.tool()
def get_handler() -> Callable:  # E109: function is not serializable
    return lambda x: x + 1

# ✅ Good: Serializable
@mcp.tool()
def get_handler() -> dict:
    return {"type": "increment", "value": 1}
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
