---
title: 'E107: Circular Dependency'
description: 'Circular Dependency - Schema & Contract error in Syrin'
weight: 9
---

## Going in circles

**Category**: Schema & Contract  
**Severity**: Error  
**Detection**: Static Analysis

**Description**:  
Circular dependency detected between tools. Execution becomes undefined.

**What Causes It**:

- Tool A depends on Tool B
- Tool B depends on Tool A (directly or indirectly)
- Dependency graph contains a cycle

**Why This Is Fatal**:

- LLMs cannot reason about cycles
- Execution becomes undefined
- Infinite loops possible

**How to Fix**:

- Break the cycle by removing or restructuring dependencies
- Refactor tools to remove circular coupling
- Create intermediate tools to break the cycle

**Example**:

```python
# ❌ Bad: Circular dependency
def process_data(data: str) -> str:
    result = validate_data(data)  # Calls validate_data
    return transform(result)

def validate_data(data: str) -> str:
    result = process_data(data)  # E107: Calls process_data (circular!)
    return validate(result)

# ✅ Good: No cycle
def process_data(data: str) -> str:
    validated = validate_data(data)
    return transform(validated)

def validate_data(data: str) -> str:
    return validate(data)  # No circular call
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
