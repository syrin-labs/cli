---
title: 'E400: Tool Execution Failed'
description: 'Tool Execution Failed - Execution error in Syrin'
weight: 16
---

## Something went wrong

**Category**: Execution  
**Severity**: Error  
**Detection**: Runtime (Test Execution)

**Description**:  
Tool raises an exception during execution. Tool should handle errors gracefully instead of crashing.

**What Causes It**:

- Unhandled exceptions
- External API failures
- Resource exhaustion
- Missing error handling
- Invalid assumptions about input

**Why This Is Fatal**:

- Tool crashes instead of handling errors gracefully
- Breaks agent reliability
- Indicates missing error handling or input validation

**How to Fix**:

- Fix tool implementation errors
- Ensure tool handles all input cases gracefully
- Add proper error handling and validation

**Example in Test**:

```yaml
tests:
  - name: test_api_failure
    input:
      location: 'InvalidLocation12345XYZ'
    expect:
      error:
        type: execution_error
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
