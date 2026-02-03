---
title: 'W300: High Entropy Output'
description: 'High Entropy Output - Output Validation warning in Syrin'
weight: 12
---

## Unpredictable by design

**Category**: Output Validation  
**Severity**: Warning  
**Detection**: Runtime (Test Execution)

**Description**:  
Tool output has high entropy, making it difficult for LLM to reason about.

**What Causes It**:

- Output has random or unpredictable structure
- High variability in output format
- Non-deterministic output patterns
- Entropy score exceeds threshold (default: 0.7)

**Why This Is a Warning**:

- High entropy makes it hard for LLM to reason about output
- Indicates potential design issues
- May indicate non-determinism

**How to Fix**:

- Normalize output structure
- Reduce randomness
- Provide more predictable output format
- Ensure deterministic output when possible

**Example**:

```python
# ⚠️ Warning: High entropy
@mcp.tool()
def get_data() -> dict:
    """Get random data."""
    return {
        "field1": random_string(),
        "field2": random_number(),
        "field3": random_object()
    }  # Unpredictable structure

# ✅ Good: Low entropy
@mcp.tool()
def get_data() -> DataResponse:
    """Get structured data."""
    return DataResponse(
        id="123",
        name="John",
        status="active"
    )  # Predictable structure
```

## See Also

- [Warning Rules Overview](/testing/warnings/)
- [Error Rules](/testing/errors/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
