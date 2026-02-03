---
title: 'E500: Side Effect Detected'
description: 'Side Effect Detected - Behavioral error in Syrin'
weight: 18
---

## Don't touch that

**Category**: Behavioral  
**Severity**: Error  
**Detection**: Runtime (Test Execution)

**Description**:  
Tool attempted filesystem write to project files. Tools should not mutate project state.

**What Causes It**:

- Tool writes to files outside temp directory
- Tool modifies project state
- Tool creates or deletes project files
- Tool updates configuration files

**Why This Is Fatal**:

- Tools should not mutate project state
- Breaks isolation and testability
- Makes behavior unpredictable

**How to Fix**:

- Remove filesystem writes
- Write only to temp directory
- Ensure tools don't mutate project state

**Example in Test**:

```yaml
tests:
  - name: test_side_effect_detected
    input:
      data: 'test data'
    expect:
      error:
        type: side_effect
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
