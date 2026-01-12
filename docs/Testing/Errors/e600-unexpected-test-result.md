---
title: "E600: Unexpected Test Result"
description: "Unexpected Test Result - Test Framework error in Syrin"
slug: "errors/e600-unexpected-test-result"
weight: 20
---

## That's not what I expected

**Category**: Test Framework  
**Severity**: Error  
**Detection**: Runtime (Test Execution)

**Description**:  
Test expectation doesn't match actual result. Test case is incorrect or tool behavior changed.

**What Causes It**:
- Test expects success but tool fails
- Test expects error but tool succeeds
- Expected error type doesn't match actual error
- Tool behavior changed but test wasn't updated

**Why This Is Fatal**:
- Test cases are incorrect
- Tool behavior doesn't match expectations
- Indicates contract drift

**How to Fix**:
- Update test expectations to match actual behavior
- Fix tool if behavior is incorrect
- Ensure tests accurately reflect tool behavior

**Example**:
```yaml
tests:
  - name: test_should_succeed
    input:
      user_id: '123'
    expect:
      output_schema: User
    # But tool actually fails → E600
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
