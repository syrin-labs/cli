---
title: 'How Syrin Helps Write Safe MCPs'
description: 'Understanding how Syrin makes your MCP tools safer'
weight: 6
---

## How Syrin Helps Write Safe MCPs

Syrin provides comprehensive validation and safety checks that catch issues before they reach production.

## 1. Static Analysis (`syrin analyse`)

Catches issues **before** execution:

- **Schema Errors**: Missing output schemas, type mismatches
- **Contract Issues**: Underspecified inputs, circular dependencies
- **Best Practices**: Generic descriptions, missing examples

**Benefits**:

- Fast feedback (no execution required)
- Catches structural issues early
- Prevents runtime failures

## 2. Runtime Testing (`syrin test`)

Validates actual tool behavior:

- **Side Effects**: Detects filesystem writes to project files
- **Output Validation**: Ensures output matches schema
- **Execution Limits**: Validates timeouts and output size limits

**Benefits**:

- Catches behavioral issues
- Validates actual tool execution
- Ensures tools meet contracts

## 3. Comprehensive Error Detection

Syrin detects 20+ error types:

- **E100-E110**: Schema and contract errors
- **E200**: Input validation errors
- **E300-E301**: Output validation errors
- **E400-E403**: Execution errors
- **E500**: Behavioral errors
- **E600**: Test framework errors

## 4. Warning Detection

Syrin identifies 12+ warning types:

- **W100-W110**: Schema and contract warnings
- **W300-W301**: Output validation warnings

## 5. Contract Validation

Ensures tools match their contracts:

- Input/output schema validation
- Guarantee enforcement (side effects, limits)
- Dependency verification
- Test expectation matching

## Safety Benefits

### Prevents Production Failures

- Catches tools that crash or hang
- Validates timeout limits
- Ensures proper error handling

### Prevents Security Issues

- Detects filesystem mutations
- Validates side effect declarations
- Ensures isolation

### Prevents Agent Confusion

- Validates tool descriptions
- Ensures schema completeness
- Catches ambiguous tool definitions

### Prevents Cost Overruns

- Validates output size limits
- Catches output explosions
- Ensures efficient tool design

## See Also

- [Error Reference](/testing/error-reference/)
- [Warning Reference](/testing/warning-reference/)
- [Writing Test Cases](/testing/writing-test-cases/) - Tool contract documentation
- [Testing Documentation](/testing/)
