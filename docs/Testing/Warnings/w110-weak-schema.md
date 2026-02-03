---
title: 'W110: Weak Schema'
description: 'Weak Schema - Schema & Contract warning in Syrin'
weight: 11
---

## Loose definitions

**Category**: Schema & Contract  
**Severity**: Warning  
**Detection**: Runtime (Test Execution)

**Description**:  
Contract schema is too loose or does not match MCP tool schema structure.

**What Causes It**:

- Contract schema names don't match actual MCP tool schemas
- Schema structure differs between contract and implementation
- Contract is outdated

**Why This Is a Warning**:

- Loose schemas make validation less effective
- Mismatch indicates contract needs update
- Validation may miss issues

**How to Fix**:

- Update contract to match actual tool schema structure
- Ensure `input_schema` and `output_schema` names reference correct schemas
- Keep contract in sync with implementation

**Example**:

```yaml
# ⚠️ Warning: Schema mismatch
contract:
  input_schema: FetchUserRequest  # Doesn't match actual schema name
  output_schema: UserResponse     # Doesn't match actual schema name

# ✅ Good: Matching schemas
contract:
  input_schema: GetUserInput      # Matches actual schema
  output_schema: User              # Matches actual schema
```

## See Also

- [Warning Rules Overview](/testing/warnings/)
- [Error Rules](/testing/errors/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
