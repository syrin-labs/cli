---
title: 'E301: Output Explosion'
description: 'Output Explosion - Output Validation error in Syrin'
weight: 15
---

## Too much of a good thing

**Category**: Output Validation  
**Severity**: Error  
**Detection**: Runtime (Test Execution)

**Description**:  
Tool output exceeds declared size limit. Large outputs overwhelm LLM context and break agent reasoning.

**What Causes It**:

- Tool returns more data than declared
- No pagination or filtering
- Output size limit too small for actual use
- Tool fetches all records instead of subset

**Why This Is Fatal**:

- Large outputs overwhelm LLM context
- Breaks agent reasoning
- Indicates design issue (pagination, filtering needed)

**How to Fix**:

- Reduce output size by paginating results
- Add filters to limit data
- Update contract limit if legitimate

**Example**:

```yaml
guarantees:
  max_output_size: 10kb

tests:
  - name: test_output_too_large
    input:
      query: 'fetch all records'
    expect:
      error:
        type: output_explosion
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
