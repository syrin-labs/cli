---
title: "E200: Input Validation Failed"
description: "Input Validation Failed - Input Validation error in Syrin"
weight: 13
---

## That's not what I asked for

**Category**: Input Validation  
**Severity**: Error  
**Detection**: Runtime (Test Execution)

**Description**:  
Tool input doesn't match declared input schema. Tool doesn't handle invalid inputs gracefully.

**What Causes It**:
- Missing required fields
- Invalid field types (e.g., string instead of number)
- Values outside allowed ranges
- Pattern mismatches
- Enum violations

**Why This Is Fatal**:
- Tool contract is inaccurate
- Tool doesn't handle invalid inputs gracefully
- Can cause runtime errors in production
- Indicates missing input validation or schema mismatch

**How to Fix**:
- Fix input validation to handle edge cases gracefully
- Update input schema to match actual validation
- Add proper error handling for invalid inputs

**Example in Test**:
```yaml
tests:
  - name: test_invalid_input
    input:
      user_id: 123  # Wrong type (should be string)
    expect:
      error:
        type: input_validation
        details:
          field: user_id
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
