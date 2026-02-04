---
title: 'Error Reference'
description: 'Every Syrin error code in one place'
weight: 8
---

## Every Error Code, One Page, No Excuses

Errors are **blocking** -- they must be fixed before tools can be safely used. Syrin exits with code `1` when any error is detected.

## Quick Reference

| Code | Name                          | Category              | Detection       |
| ---- | ----------------------------- | --------------------- | --------------- |
| E000 | Tool Not Found                | Configuration & Setup | Runtime         |
| E100 | Missing Output Schema         | Schema & Contract     | Static Analysis |
| E101 | Missing Tool Description      | Schema & Contract     | Static Analysis |
| E102 | Underspecified Required Input | Schema & Contract     | Static Analysis |
| E103 | Type Mismatch                 | Schema & Contract     | Static Analysis |
| E104 | Parameter Not In Description  | Schema & Contract     | Static Analysis |
| E105 | Free Text Propagation         | Schema & Contract     | Static Analysis |
| E106 | Output Not Guaranteed         | Schema & Contract     | Static Analysis |
| E107 | Circular Dependency           | Schema & Contract     | Static Analysis |
| E108 | Implicit User Input           | Schema & Contract     | Static Analysis |
| E109 | Non-Serializable Output       | Schema & Contract     | Static Analysis |
| E110 | Tool Ambiguity                | Schema & Contract     | Static Analysis |
| E200 | Input Validation Failed       | Input Validation      | Runtime         |
| E300 | Output Validation Failed      | Output Validation     | Runtime         |
| E301 | Output Explosion              | Output Validation     | Runtime         |
| E400 | Tool Execution Failed         | Execution             | Runtime         |
| E403 | Unbounded Execution           | Execution             | Runtime         |
| E500 | Side Effect Detected          | Behavioral            | Runtime         |
| E600 | Unexpected Test Result        | Test Framework        | Runtime         |

## Category Numbering

Error codes follow a pattern similar to HTTP status codes:

- **0xx**: Configuration & Setup
- **1xx**: Schema & Contract (Static Analysis)
- **2xx**: Input Validation
- **3xx**: Output Validation
- **4xx**: Execution
- **5xx**: Behavioral (Side Effects & Dependencies)
- **6xx**: Test & Validation Framework

## Error Types in Test Expectations

When writing test cases, use `expect.error.type` to match error codes:

| Error Type            | Error Code | Description                                       |
| --------------------- | ---------- | ------------------------------------------------- |
| `input_validation`    | E200       | Tool input does not match declared input schema   |
| `output_validation`   | E300       | Tool output does not match declared output schema |
| `execution_error`     | E400       | Tool execution failed due to runtime error        |
| `side_effect`         | E500       | Tool attempted filesystem writes to project files |
| `output_explosion`    | E301       | Tool output exceeds declared size limit           |
| `unbounded_execution` | E403       | Tool execution timed out or failed to terminate   |

---

## E000: Tool Not Found

**Category**: Configuration & Setup | **Detection**: Runtime

A tool contract exists, but the tool is not registered in the MCP server.

**Causes**:

- Tool contract file exists but tool is not implemented in the server
- Tool name mismatch between contract and server implementation
- Server script path is incorrect in `syrin.yaml`

**Fix**:

- Verify the tool is registered in your MCP server
- Ensure the tool name in the contract matches the server registration
- Check that the `script` configuration in `syrin.yaml` points to the correct server file

```yaml
# tools/fetch_user.yaml exists with:
tool: fetch_user

# But server.py does not register a tool named "fetch_user"
# Fix: add @mcp.tool() named "fetch_user" to the server
```

---

## E100: Missing Output Schema

**Category**: Schema & Contract | **Detection**: Static Analysis

Tool does not declare an output schema. Downstream tools cannot safely consume its output.

**Causes**:

- Tool has no output fields defined
- Output schema is empty or missing
- Tool returns data but does not declare structure

**Why this is fatal**: Downstream tools cannot reason about outputs. The LLM will invent structure. Reproducibility is impossible.

**Fix**: Add an output schema to the tool definition.

```python
# Bad: No output schema
@mcp.tool()
def fetch_user(user_id: str):
    return {"id": user_id, "name": "John"}

# Good: Has output schema
@mcp.tool()
def fetch_user(user_id: str) -> User:
    return User(id=user_id, name="John")
```

---

## E101: Missing Tool Description

**Category**: Schema & Contract | **Detection**: Static Analysis

Tool is missing a description. The LLM cannot understand what the tool does.

**Causes**:

- Tool has no description field
- Description is empty or only whitespace

**Why this is fatal**: The LLM cannot understand what the tool does. Tool selection becomes ambiguous.

**Fix**: Add a clear description explaining what the tool does, what inputs it expects, and what it returns.

```python
# Bad: No description
@mcp.tool()
def fetch_user(user_id: str) -> User:
    return get_user(user_id)

# Good: Has description
@mcp.tool()
def fetch_user(user_id: str) -> User:
    """Fetch user information by user ID.

    Args:
        user_id: Unique identifier for the user

    Returns:
        User object with id, name, and email
    """
    return get_user(user_id)
```

---

## E102: Underspecified Required Input

**Category**: Schema & Contract | **Detection**: Static Analysis

Required parameter is underspecified. The LLM may pass invalid or ambiguous values.

**Causes**:

- Required parameter has broad type (`string`, `any`, `object`)
- No description, enum, pattern, or example provided
- Parameter lacks constraints

**Why this is fatal**: The LLM will hallucinate values. Tool invocation becomes nondeterministic. Invalid inputs cause runtime failures.

**Fix**: Add a description, enum values, regex pattern, or example values.

```python
# Bad: Underspecified
@mcp.tool()
def fetch_user(user_id: str) -> User:  # What format? UUID? Number?
    return get_user(user_id)

# Good: Well-specified
@mcp.tool()
def fetch_user(user_id: str) -> User:
    """Fetch user by ID.

    Args:
        user_id: UUID format user identifier (e.g., "550e8400-e29b-41d4-a716-446655440000")
    """
    return get_user(user_id)
```

---

## E103: Type Mismatch

**Category**: Schema & Contract | **Detection**: Static Analysis

Output type incompatible with downstream input type. Tool chains will break.

**Causes**:

- Tool A outputs a type that Tool B cannot accept
- Incompatible type conversions (e.g., `string` -> `number`)
- Type definitions do not match between tools

**Why this is fatal**: Tool chains silently break. Bugs appear random. Execution fails at runtime.

**Fix**: Ensure output type matches downstream input type, or add type conversion.

```python
# Bad: Type mismatch
def get_user_id() -> str:
    return "123"

def fetch_user(user_id: int) -> User:  # E103: string -> int mismatch
    return get_user(user_id)

# Good: Matching types
def get_user_id() -> int:
    return 123

def fetch_user(user_id: int) -> User:
    return get_user(user_id)
```

---

## E104: Parameter Not In Description

**Category**: Schema & Contract | **Detection**: Static Analysis

Required parameter is not referenced in the tool description. The LLM may not know the parameter exists.

**Causes**:

- Required parameter exists in schema but is not mentioned in the description
- Description does not explain what the parameter is for

**Why this is fatal**: The LLM does not know the parameter exists. The parameter may be omitted in tool calls.

**Fix**: Mention the parameter in the tool description.

```python
# Bad: Parameter not mentioned
@mcp.tool()
def fetch_user(user_id: str) -> User:
    """Fetch user information."""  # user_id not mentioned
    return get_user(user_id)

# Good: Parameter mentioned
@mcp.tool()
def fetch_user(user_id: str) -> User:
    """Fetch user information by user_id."""
    return get_user(user_id)
```

---

## E105: Free Text Propagation

**Category**: Schema & Contract | **Detection**: Static Analysis

Free-text output is used by another tool. This is unsafe without constraints.

**Causes**:

- Tool outputs unconstrained string (no enum, no pattern)
- Output is used as input to another tool

**Why this is fatal**: The LLM passes sentences instead of data. This is the most common real-world failure in tool chaining.

**Fix**: Add enum values, regex pattern, or structure the output as an object with typed fields.

```python
# Bad: Free text propagation
def get_status() -> str:  # Unconstrained string
    return "active"

def update_user(status: str) -> User:  # E105: free text -> tool
    return update_user_status(status)

# Good: Constrained output
def get_status() -> str:
    """Get user status.

    Returns:
        One of: "active", "inactive", "pending"
    """
    return "active"
```

---

## E106: Output Not Guaranteed

**Category**: Schema & Contract | **Detection**: Static Analysis

Output of tool is not guaranteed, but is used by downstream tools without fallback.

**Causes**:

- Output field is optional (`required: false`)
- Output field is nullable (`nullable: true`)
- Downstream tool requires the field but upstream does not guarantee it

**Why this is fatal**: Silent null propagation. Hard-to-debug runtime errors when the field is missing.

**Fix**: Make the upstream output field required, or add fallback handling in the downstream tool.

```python
# Bad: Output not guaranteed
def get_user() -> User:
    return User(id="123", name="John", email=None)  # email optional

def send_email(email: str) -> None:  # E106: requires email
    send(email)

# Good: Guaranteed output
def get_user() -> User:
    return User(id="123", name="John", email="john@example.com")
```

---

## E107: Circular Dependency

**Category**: Schema & Contract | **Detection**: Static Analysis

Circular dependency detected between tools. Execution becomes undefined.

**Causes**:

- Tool A depends on Tool B, and Tool B depends on Tool A (directly or indirectly)
- Dependency graph contains a cycle

**Why this is fatal**: LLMs cannot reason about cycles. Execution becomes undefined. Infinite loops are possible.

**Fix**: Break the cycle by removing or restructuring dependencies.

```python
# Bad: Circular dependency
def process_data(data: str) -> str:
    result = validate_data(data)  # Calls validate_data
    return transform(result)

def validate_data(data: str) -> str:
    result = process_data(data)  # E107: Calls process_data (circular)
    return validate(result)

# Good: No cycle
def process_data(data: str) -> str:
    validated = validate_data(data)
    return transform(validated)

def validate_data(data: str) -> str:
    return validate(data)  # No circular call
```

---

## E108: Implicit User Input

**Category**: Schema & Contract | **Detection**: Static Analysis

Tool depends on implicit user context with no explicit source.

**Causes**:

- Tool expects user data (name, email, location) with no explicit tool providing it
- Relies on conversation context or memory

**Why this is fatal**: Relies on hallucinated context. No reliable source of data. Tool fails when context is missing.

**Fix**: Create an explicit tool to provide the user data.

```python
# Bad: Implicit user input
def send_email(email: str) -> None:  # E108: email has no explicit source
    send(email)

# Good: Explicit source
def get_user_email(user_id: str) -> str:
    return get_user(user_id).email

def send_email(email: str) -> None:
    send(email)
```

---

## E109: Non-Serializable Output

**Category**: Schema & Contract | **Detection**: Static Analysis

Output of tool is not serializable. Breaks MCP contract.

**Causes**:

- Output contains functions
- Output contains class instances
- Output contains unsupported types (`undefined`, `symbol`, `bigint`)

**Why this is fatal**: Breaks MCP contract. Breaks recording and replay. Cannot be transmitted over the protocol.

**Fix**: Change output type to serializable types. Convert objects to plain dictionaries.

```python
# Bad: Non-serializable
@mcp.tool()
def get_handler() -> Callable:  # E109: function is not serializable
    return lambda x: x + 1

# Good: Serializable
@mcp.tool()
def get_handler() -> dict:
    return {"type": "increment", "value": 1}
```

---

## E110: Tool Ambiguity

**Category**: Schema & Contract | **Detection**: Static Analysis

Multiple tools match the same intent. LLM tool selection is ambiguous.

**Causes**:

- Two or more tools have overlapping descriptions
- Tools have overlapping schemas
- No clear differentiator between tools

**Why this is fatal**: Tool selection becomes nondeterministic. Agent behavior changes across runs and models.

**Fix**: Make descriptions more distinct. Differentiate schemas.

```python
# Bad: Ambiguous tools
@mcp.tool()
def get_user(user_id: str) -> User:
    """Get user."""

@mcp.tool()
def fetch_user(user_id: str) -> User:
    """Get user."""  # E110: Same description, same schema

# Good: Distinct tools
@mcp.tool()
def get_user_by_id(user_id: str) -> User:
    """Get user by unique identifier."""

@mcp.tool()
def get_user_by_email(email: str) -> User:
    """Get user by email address."""
```

---

## E200: Input Validation Failed

**Category**: Input Validation | **Detection**: Runtime (Test Execution)

Tool input does not match declared input schema. Tool does not handle invalid inputs gracefully.

**Causes**:

- Missing required fields
- Invalid field types (e.g., string instead of number)
- Values outside allowed ranges
- Pattern or enum violations

**Why this is fatal**: Tool contract is inaccurate. Can cause runtime errors in production.

**Fix**: Fix input validation to handle edge cases gracefully. Update input schema to match actual validation.

```yaml
tests:
  - name: 'test_invalid_input'
    input:
      user_id: 123 # Wrong type (should be string)
    expect:
      error:
        type: input_validation
        details:
          field: user_id
```

---

## E300: Output Validation Failed

**Category**: Output Validation | **Detection**: Runtime (Test Execution)

Tool output does not match declared output schema.

**Causes**:

- Missing required output fields
- Invalid output types
- Schema drift between implementation and contract

**Why this is fatal**: Downstream tools cannot consume output. Breaks tool chaining.

**Fix**: Ensure output matches declared schema. Update implementation to match contract.

```yaml
tests:
  - name: 'test_invalid_output'
    input:
      user_id: '123'
    expect:
      error:
        type: output_validation
```

---

## E301: Output Explosion

**Category**: Output Validation | **Detection**: Runtime (Test Execution)

Tool output exceeds declared size limit. Large outputs overwhelm LLM context and break agent reasoning.

**Causes**:

- Tool returns more data than declared
- No pagination or filtering
- Tool fetches all records instead of a subset

**Why this is fatal**: Large outputs overwhelm LLM context. Indicates a design issue -- pagination or filtering is needed.

**Fix**: Reduce output size by paginating results. Add filters to limit data. Update contract limit if output size is legitimate.

```yaml
guarantees:
  max_output_size: 10kb

tests:
  - name: 'test_output_too_large'
    input:
      query: 'fetch all records'
    expect:
      error:
        type: output_explosion
```

---

## E400: Tool Execution Failed

**Category**: Execution | **Detection**: Runtime (Test Execution)

Tool raises an exception during execution. Tool should handle errors gracefully instead of crashing.

**Causes**:

- Unhandled exceptions
- External API failures
- Resource exhaustion
- Missing error handling

**Why this is fatal**: Tool crashes instead of handling errors gracefully. Breaks agent reliability.

**Fix**: Fix tool implementation errors. Add proper error handling and validation.

```yaml
tests:
  - name: 'test_api_failure'
    input:
      location: 'InvalidLocation12345XYZ'
    expect:
      error:
        type: execution_error
```

---

## E403: Unbounded Execution

**Category**: Execution | **Detection**: Runtime (Test Execution)

Tool execution timed out or failed to terminate. Tool may hang indefinitely.

**Causes**:

- Infinite loops
- Missing timeouts
- Slow operations without limits
- Blocking calls that never return

**Why this is fatal**: Tool may hang indefinitely, breaking agent reliability.

**Fix**: Add timeouts. Fix infinite loops. If the tool legitimately takes longer, declare `max_execution_time` in the contract.

```yaml
guarantees:
  max_execution_time: 5s

tests:
  - name: 'test_timeout'
    input:
      query: 'infinite loop'
    expect:
      error:
        type: unbounded_execution
```

---

## E500: Side Effect Detected

**Category**: Behavioral | **Detection**: Runtime (Test Execution)

Tool attempted filesystem write to project files. Tools should not mutate project state.

**Causes**:

- Tool writes to files outside temp directory
- Tool modifies project state
- Tool creates or deletes project files

**Why this is fatal**: Tools should not mutate project state. Breaks isolation and testability.

**Fix**: Remove filesystem writes. Write only to temp directory.

```yaml
tests:
  - name: 'test_side_effect_detected'
    input:
      data: 'test data'
    expect:
      error:
        type: side_effect
```

---

## E600: Unexpected Test Result

**Category**: Test Framework | **Detection**: Runtime (Test Execution)

Test expectation does not match actual result. Test case is incorrect or tool behavior changed.

**Causes**:

- Test expects success but tool fails
- Test expects error but tool succeeds
- Expected error type does not match actual error
- Tool behavior changed but test was not updated

**Why this is fatal**: Test cases are incorrect. Indicates contract drift.

**Fix**: Update test expectations to match actual behavior, or fix tool if behavior is incorrect.

```yaml
tests:
  - name: 'test_should_succeed'
    input:
      user_id: '123'
    expect:
      output_schema: User
    # But tool actually fails -> E600
```

---

## See Also

- [Warning Reference](/testing/warning-reference/) -- All warning codes explained
- [Writing Test Cases](/testing/writing-test-cases/) -- Detailed contract authoring guide
- [Test Configuration](/testing/test-configuration/) -- Timeouts, limits, and per-tool overrides
