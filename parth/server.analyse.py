#!/usr/bin/env python3
"""
Parth - Example MCP Server
Supports both HTTP and stdio transports based on command-line arguments.
Uses FastMCP for simplified server setup.
"""

import sys
import argparse
import asyncio
import random
import os
import time
from typing import Annotated
from pydantic import BaseModel, Field
from fastmcp import FastMCP
from tools.analyse.models import (
    TestE300Input,
    TestE300ExpectedOutput,
    TestE500Input,
    TestE500Output,
    TestE501Input,
    TestE501Output,
)

# Create MCP server instance using FastMCP
mcp = FastMCP("Parth")

# ============================================================================
# TEST TOOLS FOR ANALYSIS RULES
# ============================================================================
# These test tools are organized into three sections:
# 1. ERROR RULES - Tools that trigger error-level diagnostics
# 2. WARNING RULES - Tools that trigger warning-level diagnostics
# 3. DEPENDENCY-RELATED RULES - Tools that test dependency inference and chaining
# ============================================================================


# ============================================================================
# SECTION 1: ERROR RULES
# ============================================================================
# These tools test error-level analysis rules (E100-E110).
# Errors are blocking issues that prevent safe tool usage.
# ============================================================================

# ERROR E100: Missing Output Schema
# SEEDED ISSUE: Tool has no return type annotation, so no output schema is defined.
#               Downstream tools cannot safely consume its output.
# FIX: Add a return type annotation (e.g., -> dict, -> BaseModel, -> str)
@mcp.tool()
def test_e100_no_output(data: str):
    """Tool with no output schema - should trigger E100."""
    pass

# ERROR E102: Underspecified Required Input
# SEEDED ISSUE: Required parameter "data" has broad type (str) with no constraints
#               (no description, enum, pattern, or example). LLM may pass invalid values.
# FIX: Add constraints: Field(description="...", examples=["..."], enum=[...], or pattern="...")
@mcp.tool()
def test_e002_underspecified(data: str) -> dict:
    """Tool with underspecified required input."""
    return {"result": data}

# ERROR E110: Hard Tool Ambiguity
# SEEDED ISSUE: Two tools (test_e005_tool_one, test_e005_tool_two) have overlapping descriptions
#               and schemas with no clear differentiator. Tool selection becomes nondeterministic.
# FIX: Differentiate tools by making descriptions and schemas more distinct.
#      Add unique identifiers or specific use cases to each tool.
@mcp.tool()
def test_e005_tool_one(data: Annotated[str, Field(description="Input data")]) -> dict:
    """Process data and return result."""
    return {"result": data}

@mcp.tool()
def test_e005_tool_two(data: Annotated[str, Field(description="Input data")]) -> dict:
    """Process data and return result."""
    return {"result": data}

# ERROR E104: Required Input Not Mentioned in Description
# SEEDED ISSUE: Required parameter "data" is not referenced in the tool description.
#               LLM may not know the parameter exists or matters.
# FIX: Mention the parameter in the tool description (e.g., "Process the data parameter").
# NOTE: This error is also triggered by test_e100_no_output, test_e011_no_description,
#       test_w003_no_examples, and test_w001_tool_b for their respective parameters.

# ERROR E108: Tool Depends on User Input Indirectly
# SEEDED ISSUE: Parameter "user_name" has no explicit source tool providing it.
#               Tool depends on implicit user context (conversation/memory) with no explicit source.
# FIX: Create an explicit tool to provide "user_name", or ensure it's clearly documented as user input.
# NOTE: This is tested in test_w003_no_examples (see WARNING RULES section).

# ERROR E101: Missing Tool Description
# SEEDED ISSUE: Tool has empty or whitespace-only docstring. LLM cannot understand its purpose.
# FIX: Add a clear and concise description explaining what the tool does, its inputs, and outputs.
@mcp.tool()
def test_e011_no_description(data: str) -> dict:
    """
    """
    return {"result": data}

# ============================================================================
# SECTION 2: WARNING RULES
# ============================================================================
# These tools test warning-level analysis rules (W100-W109).
# Warnings are non-blocking issues that may cause problems but don't prevent usage.
# ============================================================================

# WARNING W101: Free-Text Output Without Normalization
# SEEDED ISSUE: Output field "message" is unconstrained string (no description, enum, or pattern).
#               Consider normalizing output to improve composability.
# FIX: Add constraints: Field(description="...", enum=[...], or pattern="...")
# WARNING W109: Tool Output Not Reusable
# SEEDED ISSUE: Output is tailored only for natural language (field name "message" suggests display-only).
#               Not structured for reuse, limits composability with other tools.
# FIX: Add structured output fields (objects/arrays) to improve composability with other tools.
class TestW002Response(BaseModel):
    """Response for W101 test."""
    message: str = Field()  # No description, enum, or pattern

@mcp.tool()
def test_w002_free_text() -> TestW002Response:
    """Tool that returns unconstrained free text."""
    return TestW002Response(message="Some unconstrained text")

# WARNING W102: Missing Examples for User-Facing Inputs
# SEEDED ISSUE: Parameter "user_name" has description but no examples. LLM accuracy may be reduced.
# FIX: Add examples to Field: Field(description="...", examples=["John", "Jane"])
# NOTE: Also triggers ERROR E108 (Tool Depends on User Input Indirectly)
@mcp.tool()
def test_w003_no_examples(
    user_name: Annotated[str, Field(description="The user's name")]
) -> dict:
    """Tool with user-facing input but no examples."""
    return {"greeting": f"Hello {user_name}"}

# WARNING W103: Overloaded Tool Responsibility
# SEEDED ISSUE: Tool description mentions multiple responsibilities (get, create, delete, update).
#               Tool appears to handle multiple unrelated tasks.
# FIX: Split into multiple focused tools, each handling a single responsibility.
# WARNING W108: Hidden Side Effects
# SEEDED ISSUE: Tool description suggests mutation (create, delete, update) but schema doesn't
#               reflect state changes (no success status, created ID, etc.).
# FIX: Update output schema to reflect state changes (e.g., add success status, created ID, etc.).
@mcp.tool()
def test_w004_overloaded() -> dict:
    """Get user, create user, delete user, and update user data."""
    return {"result": "done"}

# WARNING W104: Generic Description
# SEEDED ISSUE: Tool description "Handle it." is too generic and lacks specificity.
# FIX: Make description more specific with concrete nouns and actions
#      (e.g., "Get weather data for a location" instead of "Handle it").
@mcp.tool()
def test_w005_generic() -> dict:
    """Handle it."""
    return {"result": "done"}

# WARNING W106: Broad Output Schema
# SEEDED ISSUE: Output schema is an object with no properties defined (dict return type).
#               Schema is too broad and doesn't specify structure.
# FIX: Define a proper BaseModel with Field specifications, or define properties in the schema.
@mcp.tool()
def test_w007_broad() -> dict:
    """Tool with broad output schema."""
    return {"data": "anything"}

# WARNING W107: Multiple Entry Points for Same Concept
# SEEDED ISSUE: Multiple tools (test_w008_get_location, test_w008_ask_location, test_w008_find_location)
#               all ask for the same concept "location" as required input. Conflicting sources of truth.
# FIX: Consolidate location collection into a single tool to avoid conflicting sources of truth.
@mcp.tool()
def test_w008_get_location(location: Annotated[str, Field(description="User location")]) -> dict:
    """Get user location."""
    return {"location": location}

@mcp.tool()
def test_w008_ask_location(location: Annotated[str, Field(description="User location")]) -> dict:
    """Ask user for their location."""
    return {"location": location}

@mcp.tool()
def test_w008_find_location(location: Annotated[str, Field(description="Location to find")]) -> dict:
    """Find location."""
    return {"location": location}

# ============================================================================
# SECTION 3: RUNTIME TESTING TOOLS (v1.3.0)
# ============================================================================
# These tools test runtime behavioral rules (E300-E600) for tool-level validation.
# These are tested by syrin test command, not static analysis.
# ============================================================================

# ERROR E500: Side Effect Detected
# SEEDED ISSUE: Tool writes to filesystem outside temp directory
# FIX: Remove filesystem writes or write only to temp directory

@mcp.tool()
def test_e500_side_effect(data: str) -> TestE500Output:
    """Tool that writes to project files (should trigger E500)."""
    # Write to current working directory (project root) - this is a side effect
    # IOMonitor should detect this write as it's outside the temp directory
    output_file = os.path.join(os.getcwd(), 'test_output.txt')
    with open(output_file, 'w') as f:
        f.write(data)
    return TestE500Output(result="wrote to file", file=output_file)

# NOTE: E013 (Non-Deterministic Output) was removed. This tool is kept for reference.
# SEEDED ISSUE: Tool marked as deterministic=true but returns different outputs
# FIX: Remove sources of randomness or mark deterministic=false
@mcp.tool()
def test_e013_non_deterministic(data: str) -> dict:
    """Tool that returns random output (but marked deterministic=true in contract)."""
    # Returns random output - violates deterministic=true guarantee
    return {"result": random.randint(1, 1000), "data": data}

# ERROR E301: Output Explosion
# SEEDED ISSUE: Tool returns output exceeding max_output_size limit
# FIX: Limit output size or increase max_output_size in contract
@mcp.tool()
def test_e301_output_explosion(data: str) -> dict:
    """Tool that returns very large output (should trigger E301)."""
    # Return output exceeding 1kb limit (contract specifies max_output_size: 1kb)
    large_string = 'A' * 2000  # 2000 characters = ~2kb
    return {"result": large_string, "data": data}

# ERROR E501: Hidden Dependency
# SEEDED ISSUE: Tool calls another tool during execution without declaring dependency
# FIX: Add dependency declaration in contract guarantees.dependencies
# NOTE: Testing hidden dependencies requires actual MCP tool calls, which is complex
#       For now, we test this by declaring a dependency that doesn't exist (tested in order_food.yaml)
#       Or by not declaring a dependency that should be declared (requires MCP protocol monitoring)
@mcp.tool()
def test_e501_hidden_dependency(data: str) -> TestE501Output:
    """Tool that should declare a dependency but doesn't (E501 tested via contract expectations)."""
    # For testing, we'll use contract to test hidden dependencies
    # by checking if declared dependencies match actual tool calls
    # This requires MCP protocol monitoring which is handled by DependencyTracker
    return TestE501Output(result=data)

# ERROR E403: Unbounded Execution
# SEEDED ISSUE: Tool execution times out or hangs indefinitely
# FIX: Add timeouts, break infinite loops, optimize performance
@mcp.tool()
def test_e403_unbounded_execution(data: str) -> dict:
    """Tool that hangs indefinitely (should trigger E403 timeout)."""
    # Sleep for longer than declared timeout (5s in contract) - will timeout
    # Reduced from 35s to 6s for faster testing while still validating timeout detection
    time.sleep(6)  # Exceeds declared 5s timeout - will trigger E403
    return {"result": data}  # Never reached

# ERROR E300: Output Structure Validation
# SEEDED ISSUE: Tool output doesn't match declared output schema
# FIX: Fix output structure to match schema or update schema to match output
# NOTE: E300 is actually tested via contract tests with wrong schema expectations
#       FastMCP validates output at runtime, so actual mismatches are caught early
#       This tool returns valid output - E300 is tested in get_weather_wrong_schema test
@mcp.tool()
def test_e300_output_mismatch(data: str) -> TestE300ExpectedOutput:
    """Tool that returns valid output matching schema (E300 tested via wrong schema expectations in contracts)."""
    return TestE300ExpectedOutput(result=data, count=len(data))

# ERROR E400: Tool Execution Failed
# SEEDED ISSUE: Tool raises an exception during execution
# FIX: Handle errors gracefully, validate inputs, add error handling
@mcp.tool()
def test_e400_execution_error(data: str) -> dict:
    """Tool that raises an exception (should trigger E400)."""
    # Raise an exception - will trigger E400
    raise ValueError(f"Execution failed for data: {data}")

# ============================================================================
# SECTION 4: DEPENDENCY-RELATED RULES
# ============================================================================
# These tools test rules that require dependency inference between tools.
# Dependencies are inferred based on field name similarity, type compatibility,
# and description overlap. Rules require high-confidence dependencies (>=0.8).
# ============================================================================

# ERROR E103: Unsafe Tool Chaining (Type Mismatch)
# SEEDED ISSUE: test_e003_tool_a outputs "enabled" as integer, but test_e003_tool_b expects boolean.
#               Types are incompatible (integer -> boolean). Tool chains will break.
# FIX: Ensure output type matches input type, or modify the downstream tool to accept the source type.
# NOTE: Requires high-confidence dependency (>=0.8) to trigger. Dependency inference needs:
#       - Exact field name match (enabled -> enabled)
#       - Compatible types for dependency inference (but incompatible for rule check)
#       - Strong description overlap
class TestE003OutputA(BaseModel):
    """Output from tool A."""
    enabled: int = Field(description="Enabled flag as integer")

@mcp.tool()
def test_e003_tool_a() -> TestE003OutputA:
    """Tool A outputs enabled flag. Use enabled in test_e003_tool_b."""
    return TestE003OutputA(enabled=1)

@mcp.tool()
def test_e003_tool_b(enabled: Annotated[bool, Field(description="Enabled flag from test_e003_tool_a")]) -> dict:
    """Tool B uses enabled flag from test_e003_tool_a."""
    return {"result": enabled}

# ERROR E105: Unsafe Tool Chaining (Free Text Propagation)
# SEEDED ISSUE: test_e004_tool_a outputs unconstrained free text (no description, enum, or pattern).
#               This text is used by test_e004_tool_b. LLM may pass sentences instead of structured data.
# FIX: Constrain the output by adding enum values, regex pattern, or clear description of expected format.
# NOTE: Requires high-confidence dependency (>=0.8) to trigger.
class TestE4OutputA(BaseModel):
    """Output from tool A."""
    text: str = Field()  # No constraints - unconstrained free text (no description, enum, or pattern)

@mcp.tool()
def test_e004_tool_a() -> TestE4OutputA:
    """Retrieve text information for processing.
    
    Returns:
        TestE4OutputA with text field. Use the text field as input to test_e004_tool_b.
    """
    return TestE4OutputA(text="Some free text message")

@mcp.tool()
def test_e004_tool_b(text: Annotated[str, Field(description="Text from test_e004_tool_a for processing")]) -> dict:
    """Process text information from test_e004_tool_a.
    
    Args:
        text: Text data. Use test_e004_tool_a text field output.
    """
    return {"result": text}

# ERROR E106: Output Used Downstream but Not Guaranteed
# SEEDED ISSUE: test_e007_tool_a outputs nullable "data" field, but test_e007_tool_b requires it
#               without fallback. Silent null propagation can cause hard-to-debug failures.
# FIX: Make the output non-nullable, or ensure the downstream tool handles null values.
# NOTE: Requires high-confidence dependency (>=0.8) to trigger.
class TestE7OutputA(BaseModel):
    """Output from tool A."""
    data: str | None = Field(description="Nullable data", default=None)

@mcp.tool()
def test_e007_tool_a() -> TestE7OutputA:
    """Retrieve data information for processing.
    
    Returns:
        TestE7OutputA with data field. Use the data field as input to test_e007_tool_b.
    """
    return TestE7OutputA(data=None)

@mcp.tool()
def test_e007_tool_b(data: Annotated[str, Field(description="Data from test_e007_tool_a for processing")]) -> dict:
    """Process data information from test_e007_tool_a.
    
    Args:
        data: Data value. Use test_e007_tool_a data field output.
    """
    return {"output": data}

# ERROR E107: Circular Tool Dependency
# SEEDED ISSUE: Tool dependency graph contains a cycle: test_e008_tool_a -> test_e008_tool_b -> test_e008_tool_a.
#               LLMs cannot reason about cycles, execution becomes undefined.
# FIX: Break the cycle by removing one dependency or restructuring the tools.
# NOTE: Requires high-confidence dependencies (>=0.8) forming a cycle to trigger.
#       This test case successfully creates a circular dependency that is detected.
class TestE8OutputA(BaseModel):
    """Output from tool A."""
    token: str = Field(description="Token for tool B")

class TestE8OutputB(BaseModel):
    """Output from tool B."""
    token: str = Field(description="Token for tool A")  # Same field name creates cycle

@mcp.tool()
def test_e008_tool_a(token: Annotated[str, Field(description="Token value from test_e008_tool_b")]) -> TestE8OutputA:
    """Tool A outputs token value. Use token in test_e008_tool_b."""
    return TestE8OutputA(token=f"token_a_{token}")

@mcp.tool()
def test_e008_tool_b(token: Annotated[str, Field(description="Token value from test_e008_tool_a")]) -> TestE8OutputB:
    """Tool B outputs token value. Use token in test_e008_tool_a."""
    return TestE8OutputB(token=f"token_b_{token}")

# WARNING W100: Implicit Dependency
# SEEDED ISSUE: Medium-confidence dependency exists (test_w001_tool_a.user_id -> test_w001_tool_b.user_id)
#               but is not mentioned in test_w001_tool_b's description. Hidden dependency may cause issues.
# FIX: Mention the source tool in the description (e.g., "Use user_id from test_w001_tool_a").
# NOTE: Also triggers ERROR E104 (Required Input Not Mentioned in Description).
class TestW1OutputA(BaseModel):
    """Output from tool A."""
    user_id: str = Field(description="User identifier")

@mcp.tool()
def test_w001_tool_a() -> TestW1OutputA:
    """Tool A that outputs user_id."""
    return TestW1OutputA(user_id="123")

@mcp.tool()
def test_w001_tool_b(user_id: Annotated[str, Field(description="User ID")]) -> dict:
    """Get user details. (Doesn't mention test_w001_tool_a)."""
    return {"user": user_id}

# WARNING W105: Optional Input Used as Required Downstream
# SEEDED ISSUE: test_w006_tool_a outputs optional/nullable "value", but test_w006_tool_b requires it.
#               Hidden contract violation - optional source treated as required downstream.
# FIX: Make the source output non-nullable, or make the downstream input optional.
# NOTE: Requires high-confidence dependency (>=0.8) to trigger.
class TestW6OutputA(BaseModel):
    """Output from tool A."""
    value: str | None = Field(description="Optional value", default=None)

@mcp.tool()
def test_w006_tool_a() -> TestW6OutputA:
    """Retrieve value information for processing.
    
    Returns:
        TestW6OutputA with value field. Use the value field as input to test_w006_tool_b.
    """
    return TestW6OutputA(value=None)

@mcp.tool()
def test_w006_tool_b(value: Annotated[str, Field(description="Value from test_w006_tool_a for processing")]) -> dict:
    """Process value information from test_w006_tool_a.
    
    Args:
        value: Value data. Use test_w006_tool_a value field output.
    """
    return {"result": value}

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Parth MCP Server")
    parser.add_argument(
        "--mode",
        choices=["stdio", "http"],
        default="stdio",
        help="Transport mode: stdio or http (default: stdio)",
    )
    parser.add_argument(
        "--host",
        default="localhost",
        help="Host for HTTP mode (default: localhost)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port for HTTP mode (default: 8000)",
    )

    args = parser.parse_args()

    if args.mode == "stdio":
        print("Starting Parth MCP server in stdio mode", file=sys.stderr)
        mcp.run(transport="stdio")
    else:
        print(f"Starting Parth MCP server in HTTP mode on http://{args.host}:{args.port}/mcp", file=sys.stderr)
        asyncio.run(mcp.run_http_async(transport="http", host=args.host, port=args.port, path="/mcp", json_response=True))


if __name__ == "__main__":
    main()
