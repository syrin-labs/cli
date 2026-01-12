---
title: "E300: Output Validation Failed"
description: "Output Validation Failed - Output Validation error in Syrin"
weight: 14
---

## That's not what I got

**Category**: Output Validation  
**Severity**: Error  
**Detection**: Runtime (Test Execution)

**Description**:  
Tool output doesn't match declared output schema.

**What Causes It**:
- Missing required output fields
- Invalid output types
- Output structure mismatches
- Schema drift between implementation and contract

**Why This Is Fatal**:
- Downstream tools cannot consume output
- Breaks tool chaining
- Indicates implementation doesn't match contract

**How to Fix**:
- Ensure output matches declared schema
- Update implementation to match contract
- Fix missing or incorrect fields

**Example in Test**:
```yaml
tests:
  - name: test_invalid_output
    input:
      user_id: '123'
    expect:
      error:
        type: output_validation
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
