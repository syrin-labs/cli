---
title: "E403: Unbounded Execution"
description: "Unbounded Execution - Execution error in Syrin"
weight: 17
---

## Running forever

**Category**: Execution  
**Severity**: Error  
**Detection**: Runtime (Test Execution)

**Description**:  
Tool execution timed out or failed to terminate. Tool may hang indefinitely, breaking agent reliability.

**What Causes It**:
- Infinite loops
- Missing timeouts
- Slow operations without limits
- Blocking calls that never return
- Tool exceeds declared `max_execution_time`

**Why This Is Fatal**:
- Tool may hang indefinitely
- Breaks agent reliability
- Indicates design issue (missing timeouts, infinite loops)

**How to Fix**:
- Add timeouts
- Fix infinite loops
- Optimize slow operations
- If tool legitimately takes longer, declare `max_execution_time` in contract

**Example**:
```yaml
guarantees:
  max_execution_time: 5s

tests:
  - name: test_timeout
    input:
      query: 'infinite loop'
    expect:
      error:
        type: unbounded_execution
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
