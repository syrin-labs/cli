# Error Code System Design

Inspired by HTTP status codes, this document defines a categorized error and warning code system for MCP tool validation.

## Design Principles

1. **Categorized by problem domain** - Similar to HTTP codes (1xx, 2xx, 3xx, 4xx, 5xx)
2. **Room for expansion** - Each category has ranges (e.g., E10x, E11x, E12x)
3. **No renumbering** - Codes remain stable even when new codes are added
4. **Semantic meaning** - Code ranges indicate error category

## Error Code Categories

### 0xx: Configuration & Setup Errors

**Range: E000-E009**
Errors related to configuration, setup, and tool discovery.

- **E000**: Tool Not Found (tool not registered in MCP server)
- **E001-E009**: Reserved for future configuration errors
  - Potential: Invalid configuration, missing dependencies, server connection issues

### 1xx: Schema & Contract Errors (Static Analysis)

**Range: E100-E199**
Errors found during static analysis of tool contracts/schemas.

- **E100**: Missing Output Schema
- **E101**: Missing Tool Description
- **E102**: Underspecified Required Input
- **E103**: Type Mismatch (schema inconsistencies)
- **E104**: Parameter Not In Description
- **E105**: Free Text Propagation (unsafe text handling)
- **E106**: Output Not Guaranteed
- **E107**: Circular Dependency
- **E108**: Implicit User Input
- **E109**: Non-Serializable
- **E110**: Tool Ambiguity
- **E111-E199**: Reserved for future schema/contract errors
  - Potential: Invalid JSON schema, missing examples, schema versioning issues

### 2xx: Input Validation Errors

**Range: E200-E299**
Errors detected during input validation at runtime.

- **E200**: Input Validation Failed (general)
- **E201**: Missing Required Input
- **E202**: Invalid Input Type
- **E203**: Input Out Of Range
- **E204-E299**: Reserved for future input validation errors
  - Potential: Pattern mismatch, enum violation, constraint violations

### 3xx: Output Validation Errors

**Range: E300-E399**
Errors detected during output validation at runtime.

- **E300**: Output Validation Failed (general)
- **E301**: Output Explosion (size exceeds limit)
- **E302**: Invalid Output Schema
- **E303**: Missing Expected Output
- **E304-E399**: Reserved for future output validation errors
  - Potential: Output format violations, missing fields, type mismatches

### 4xx: Execution Errors

**Range: E400-E499**
Errors that occur during tool execution (crashes, timeouts, failures).

- **E400**: Tool Execution Failed (general)
- **E401**: Tool Timeout
- **E402**: Tool Crashed
- **E403**: Unbounded Execution (infinite loop detection)
- **E404-E499**: Reserved for future execution errors
  - Potential: Memory errors, resource exhaustion, network failures

### 5xx: Behavioral Errors (Side Effects & Dependencies)

**Range: E500-E599**
Errors related to tool behavior, side effects, and dependencies.

- **E500**: Side Effect Detected
- **E501**: Hidden Dependency (tool calls other tools without declaring)
- **E502**: Output Not Reusable
- **E503-E599**: Reserved for future behavioral errors
  - Potential: State mutations, external API calls, caching issues

### 6xx: Test & Validation Framework Errors

**Range: E600-E699**
Errors in the test framework or validation process itself.

- **E600**: Unexpected Test Result (test expectation mismatch)
- **E601-E699**: Reserved for future test framework errors
  - Potential: Test configuration errors, assertion failures, test execution issues

### 7xx: Reserved for Future Use

**Range: E700-E799**
Reserved for future error categories.

### 8xx: Reserved for Future Use

**Range: E800-E899**
Reserved for future error categories.

### 9xx: Reserved for Future Use

**Range: E900-E999**
Reserved for future error categories.

## Warning Code Categories

### 0xx: Configuration & Setup Warnings

**Range: W000-W099**
Warnings related to configuration and setup.

- **W000-W099**: Reserved for future configuration warnings

### 1xx: Schema & Contract Warnings (Static Analysis)

**Range: W100-W199**
Warnings found during static analysis of tool contracts/schemas.

- **W100**: Implicit Dependency
- **W101**: Free Text Without Normalization
- **W102**: Missing Examples
- **W103**: Overloaded Responsibility
- **W104**: Generic Description
- **W105**: Optional As Required
- **W106**: Broad Output Schema
- **W107**: Multiple Entry Points
- **W108**: Hidden Side Effects
- **W109**: Output Not Reusable
- **W110**: Weak Schema
- **W111-W199**: Reserved for future schema warnings
  - Potential: Deprecated fields, schema complexity, documentation quality

### 2xx: Input Validation Warnings

**Range: W200-W299**
Warnings during input validation.

- **W200-W299**: Reserved for future input validation warnings

### 3xx: Output Validation Warnings

**Range: W300-W399**
Warnings during output validation.

- **W300**: High Entropy Output (may indicate randomness/non-determinism)
- **W301**: Unstable Defaults
- **W302-W399**: Reserved for future output validation warnings

### 4xx-9xx: Reserved for Future Use

**Range: W400-W999**
Reserved for future warning categories.

## Migration Mapping

### Current Errors → New Codes

| Current | New  | Name                     | Category          |
| ------- | ---- | ------------------------ | ----------------- |
| E000    | E000 | Tool Not Found           | Configuration     |
| E001    | E100 | Missing Output Schema    | Schema/Contract   |
| E002    | E102 | Underspecified Input     | Schema/Contract   |
| E003    | E103 | Type Mismatch            | Schema/Contract   |
| E004    | E105 | Free Text Propagation    | Schema/Contract   |
| E005    | E110 | Tool Ambiguity           | Schema/Contract   |
| E006    | E104 | Parameter Not In Desc    | Schema/Contract   |
| E007    | E106 | Output Not Guaranteed    | Schema/Contract   |
| E008    | E107 | Circular Dependency      | Schema/Contract   |
| E009    | E108 | Implicit User Input      | Schema/Contract   |
| E010    | E109 | Non-Serializable         | Schema/Contract   |
| E011    | E101 | Missing Tool Description | Schema/Contract   |
| E012    | E500 | Side Effect Detected     | Behavioral        |
| E013    | E301 | Output Explosion         | Output Validation |
| E014    | E501 | Hidden Dependency        | Behavioral        |
| E015    | E403 | Unbounded Execution      | Execution         |
| E016    | E300 | Output Validation Failed | Output Validation |
| E017    | E200 | Input Validation Failed  | Input Validation  |
| E018    | E400 | Tool Execution Failed    | Execution         |
| E019    | E600 | Unexpected Test Result   | Test Framework    |

### Current Warnings → New Codes

| Current | New  | Name                      | Category          |
| ------- | ---- | ------------------------- | ----------------- |
| W001    | W100 | Implicit Dependency       | Schema/Contract   |
| W002    | W101 | Free Text Without Norm    | Schema/Contract   |
| W003    | W102 | Missing Examples          | Schema/Contract   |
| W004    | W103 | Overloaded Responsibility | Schema/Contract   |
| W005    | W104 | Generic Description       | Schema/Contract   |
| W006    | W105 | Optional As Required      | Schema/Contract   |
| W007    | W106 | Broad Output Schema       | Schema/Contract   |
| W008    | W107 | Multiple Entry Points     | Schema/Contract   |
| W009    | W108 | Hidden Side Effects       | Schema/Contract   |
| W010    | W109 | Output Not Reusable       | Schema/Contract   |
| W021    | W110 | Weak Schema               | Schema/Contract   |
| W022    | W300 | High Entropy Output       | Output Validation |
| W023    | W301 | Unstable Defaults         | Output Validation |

## Benefits

1. **Stable codes** - No renumbering needed when adding new errors
2. **Category clarity** - Code range indicates error type
3. **Future-proof** - Each category has room for 100 codes (E100-E199, etc.)
4. **Semantic grouping** - Related errors grouped together
5. **HTTP-like structure** - Familiar pattern for developers
