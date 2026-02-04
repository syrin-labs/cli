---
title: 'Warning Reference'
description: 'Every Syrin warning code in one place'
weight: 9
---

## Warnings: The Canary in the Coal Mine

Warnings are **non-blocking** -- they indicate issues that should be addressed but do not prevent tool usage. Use `--strict` with `syrin test` to treat warnings as errors.

```bash
syrin test --strict
```

## Quick Reference

| Code | Name                                       | Category          | Detection       |
| ---- | ------------------------------------------ | ----------------- | --------------- |
| W100 | Implicit Tool Dependency                   | Schema & Contract | Static Analysis |
| W101 | Free-Text Output Without Normalization     | Schema & Contract | Static Analysis |
| W102 | Missing Examples for User-Facing Inputs    | Schema & Contract | Static Analysis |
| W103 | Overloaded Tool Responsibility             | Schema & Contract | Static Analysis |
| W104 | Tool Description Too Generic               | Schema & Contract | Static Analysis |
| W105 | Optional Input Used as Required Downstream | Schema & Contract | Static Analysis |
| W106 | Output Schema Too Broad                    | Schema & Contract | Static Analysis |
| W107 | Multiple Entry Points for Same Concept     | Schema & Contract | Static Analysis |
| W108 | Hidden Side Effects                        | Schema & Contract | Static Analysis |
| W109 | Output Not Reusable                        | Schema & Contract | Static Analysis |
| W110 | Weak Schema                                | Schema & Contract | Runtime         |
| W300 | High Entropy Output                        | Output Validation | Runtime         |
| W301 | Unstable Defaults                          | Output Validation | Runtime         |

## Category Numbering

- **1xx**: Schema & Contract Warnings (Static Analysis)
- **3xx**: Output Validation Warnings (Runtime Testing)

---

## W100: Implicit Tool Dependency

**Category**: Schema & Contract | **Detection**: Static Analysis

Tool appears to depend on another tool, but the dependency is implicit.

**Causes**:

- Medium confidence dependency inferred (0.6-0.8)
- Dependency not stated explicitly in description
- Tool name tokens do not appear in description

**Impact**: LLM may not chain tools reliably. Hidden dependencies make execution unpredictable.

**Fix**: Mention the dependency tool in the description. Make dependencies explicit in the contract.

```python
# Warning: Implicit dependency
@mcp.tool()
def process_user_data(user_id: str) -> ProcessedData:
    """Process user data."""  # Does not mention fetch_user
    user = fetch_user(user_id)
    return process(user)

# Good: Explicit dependency
@mcp.tool()
def process_user_data(user_id: str) -> ProcessedData:
    """Process user data using fetch_user to retrieve user information."""
    user = fetch_user(user_id)
    return process(user)
```

---

## W101: Free-Text Output Without Normalization

**Category**: Schema & Contract | **Detection**: Static Analysis

Tool returns unconstrained free text. Consider normalizing output.

**Causes**:

- Output is string type with no enum values
- No regex pattern for validation
- No description explaining output format

**Impact**: Hard to reuse in other tools. Unpredictable output format.

**Fix**: Add enum values, regex pattern, or clear format description.

```python
# Warning: Unconstrained free text
@mcp.tool()
def get_status() -> str:
    return "active"

# Good: Constrained output
@mcp.tool()
def get_status() -> str:
    """Get user status.

    Returns:
        One of: "active", "inactive", "pending"
    """
    return "active"
```

---

## W102: Missing Examples for User-Facing Inputs

**Category**: Schema & Contract | **Detection**: Static Analysis

Tool accepts user-provided input but has no examples. LLM accuracy may be reduced.

**Causes**:

- Tool takes user-facing input (user, email, location, query)
- No example values provided in schema or description

**Impact**: LLM guessing increases error rate. Ambiguous input format.

**Fix**: Add example values to the input schema or description.

```python
# Warning: Missing examples
@mcp.tool()
def search_users(query: str) -> List[User]:
    """Search users by query."""
    return search(query)

# Good: Has examples
@mcp.tool()
def search_users(query: str) -> List[User]:
    """Search users by query.

    Args:
        query: Search query (e.g., "John Doe", "john@example.com")
    """
    return search(query)
```

---

## W103: Overloaded Tool Responsibility

**Category**: Schema & Contract | **Detection**: Static Analysis

Tool appears to handle multiple responsibilities. Tool selection becomes unstable.

**Causes**:

- Tool description contains multiple verbs (>3)
- Description has multiple intents (>2)
- Tool does multiple conceptual things

**Impact**: Tool selection becomes unstable. Hard to compose with other tools.

**Fix**: Split into multiple focused tools. Each tool should handle a single responsibility.

```python
# Warning: Overloaded responsibility
@mcp.tool()
def manage_user(user_id: str, action: str, data: dict) -> dict:
    """Get, create, update, or delete user data."""

# Good: Focused tools
@mcp.tool()
def get_user(user_id: str) -> User:
    """Get user by ID."""

@mcp.tool()
def create_user(data: dict) -> User:
    """Create a new user."""
```

---

## W104: Tool Description Too Generic

**Category**: Schema & Contract | **Detection**: Static Analysis

Description of tool is too generic. LLM cannot discriminate tools.

**Causes**:

- Description uses vague verbs (`get`, `handle`, `process`, `do`, `make`)
- No concrete nouns (weather, location, user, file)
- Description lacks specificity

**Impact**: LLM cannot discriminate tools. Similar tools become indistinguishable.

**Fix**: Make the description more specific. Include concrete nouns and specific action verbs.

```python
# Warning: Generic description
@mcp.tool()
def get_data(input: str) -> dict:
    """Get data."""

# Good: Specific description
@mcp.tool()
def get_weather(location: str) -> WeatherData:
    """Get weather data for a specific location."""
```

---

## W105: Optional Input Used as Required Downstream

**Category**: Schema & Contract | **Detection**: Static Analysis

Optional input is treated as required downstream. Hidden contract violation.

**Causes**:

- Source field is optional or nullable
- Target field is required
- Tool chaining assumes optional field is always present

**Impact**: Hidden contract violation. Runtime failures when optional field is missing.

**Fix**: Make the source field required if it is always needed, or make the target field optional.

```python
# Warning: Optional as required
def get_user() -> User:
    return User(id="123", email=None)  # email is optional

def send_email(email: str) -> None:  # email is required
    send(email)  # W105: optional -> required

# Good: Matching requirements
def get_user() -> User:
    return User(id="123", email="user@example.com")  # email required

def send_email(email: str) -> None:
    send(email)
```

---

## W106: Output Schema Too Broad

**Category**: Schema & Contract | **Detection**: Static Analysis

Output schema of tool is too broad. No contract enforcement.

**Causes**:

- Output type is `any`
- Output is object with no properties defined
- Schema lacks structure

**Impact**: No contract enforcement. Unpredictable output structure.

**Fix**: Specify concrete types instead of `any`. Define object properties.

```python
# Warning: Broad schema
@mcp.tool()
def get_data() -> Any:
    return {"anything": "goes"}

# Good: Specific schema
@mcp.tool()
def get_user() -> User:
    return User(id="123", name="John", email="john@example.com")
```

---

## W107: Multiple Entry Points for Same Concept

**Category**: Schema & Contract | **Detection**: Static Analysis

Multiple tools capture the same concept. Conflicting sources of truth.

**Causes**:

- Multiple tools ask for the same conceptual data (location, user_id, email)
- Tools have overlapping input fields
- No single source of truth

**Impact**: Conflicting sources of truth. Inconsistent tool usage.

**Fix**: Consolidate concept collection into a single tool.

```python
# Warning: Multiple entry points
@mcp.tool()
def get_weather(location: str) -> WeatherData:
    return fetch_weather(location)

@mcp.tool()
def get_forecast(place: str) -> ForecastData:  # W107: also asks for location
    return fetch_forecast(place)

# Good: Single entry point
@mcp.tool()
def get_location() -> Location:
    """Get user's current location."""
    return current_location()

@mcp.tool()
def get_weather(location: Location) -> WeatherData:
    return fetch_weather(location)
```

---

## W108: Hidden Side Effects

**Category**: Schema & Contract | **Detection**: Static Analysis

Tool appears to have side effects not reflected in schema. Execution surprises.

**Causes**:

- Tool name or description suggests mutation (`create`, `delete`, `update`)
- Schema does not reflect state changes
- No output indicating mutation occurred

**Impact**: Execution surprises. Hard to reason about tool behavior.

**Fix**: Update output schema to reflect state changes. Add success status or mutation confirmation.

```python
# Warning: Hidden side effects
@mcp.tool()
def create_user(data: dict) -> User:
    """Create a new user."""
    return User(id="123", name="John")

# Good: Schema reflects mutation
@mcp.tool()
def create_user(data: dict) -> CreateUserResult:
    """Create a new user.

    Returns:
        Result with success status and created user ID
    """
    user = create_user_internal(data)
    return CreateUserResult(success=True, user_id=user.id, user=user)
```

---

## W109: Output Not Reusable

**Category**: Schema & Contract | **Detection**: Static Analysis

Output of tool is not designed for reuse. Limits composability.

**Causes**:

- All outputs are natural language only (`message`, `response`, `text`)
- No structured output fields (objects or arrays)
- Output is only for display, not for tool chaining

**Impact**: Limits composability. Output cannot be used as input to other tools.

**Fix**: Add structured output fields alongside human-readable text.

```python
# Warning: Not reusable
@mcp.tool()
def get_status() -> str:
    return "User is active"  # Only natural language

# Good: Reusable output
@mcp.tool()
def get_status() -> StatusData:
    return StatusData(status="active", code=1, message="User is active")
```

---

## W110: Weak Schema

**Category**: Schema & Contract | **Detection**: Runtime (Test Execution)

Contract schema is too loose or does not match MCP tool schema structure.

**Causes**:

- Contract schema names do not match actual MCP tool schemas
- Schema structure differs between contract and implementation
- Contract is outdated

**Impact**: Loose schemas make validation less effective. Mismatch indicates contract needs update.

**Fix**: Update contract to match actual tool schema structure.

```yaml
# Warning: Schema mismatch
contract:
  input_schema: FetchUserRequest   # Does not match actual schema name
  output_schema: UserResponse      # Does not match actual schema name

# Good: Matching schemas
contract:
  input_schema: GetUserInput       # Matches actual schema
  output_schema: User              # Matches actual schema
```

---

## W300: High Entropy Output

**Category**: Output Validation | **Detection**: Runtime (Test Execution)

Tool output has high entropy, making it difficult for the LLM to reason about.

**Causes**:

- Output has random or unpredictable structure
- High variability in output format
- Non-deterministic output patterns
- Entropy score exceeds threshold (default: 0.7)

**Impact**: High entropy makes it hard for the LLM to reason about output. May indicate non-determinism.

**Fix**: Normalize output structure. Reduce randomness. Provide a more predictable output format.

```python
# Warning: High entropy
@mcp.tool()
def get_data() -> dict:
    return {
        "field1": random_string(),
        "field2": random_number(),
        "field3": random_object()
    }

# Good: Low entropy
@mcp.tool()
def get_data() -> DataResponse:
    return DataResponse(id="123", name="John", status="active")
```

---

## W301: Unstable Defaults

**Category**: Output Validation | **Detection**: Runtime (Test Execution)

Tool behavior changes significantly with default values, breaking agent expectations.

**Causes**:

- Default values change tool behavior dramatically
- Different defaults produce different outputs
- Defaults are not stable across runs

**Impact**: Defaults should be stable and predictable. Changing defaults breaks agent expectations.

**Fix**: Ensure default values are stable. Document default behavior clearly.

```python
# Warning: Unstable defaults
@mcp.tool()
def get_data(limit: int = None) -> List[Data]:
    if limit is None:
        limit = random.randint(10, 100)  # W301: Unstable default
    return fetch_data(limit)

# Good: Stable defaults
@mcp.tool()
def get_data(limit: int = 50) -> List[Data]:
    """Get data with limit (default: 50)."""
    return fetch_data(limit)
```

---

## See Also

- [Error Reference](/testing/error-reference/) -- All error codes explained
- [Writing Test Cases](/testing/writing-test-cases/) -- Detailed contract authoring guide
- [Test Configuration](/testing/test-configuration/) -- Timeouts, limits, and per-tool overrides
