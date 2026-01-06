#!/usr/bin/env python3
"""
Create a comprehensive test server with test cases for all rules.
"""

import shutil
from pathlib import Path

BASE_DIR = Path(__file__).parent
PARTH_DIR = BASE_DIR / "parth"
BACKUP_FILE = PARTH_DIR / "server.py.backup"
SERVER_FILE = PARTH_DIR / "server.py"

# Read the backup
with open(BACKUP_FILE, 'r') as f:
    content = f.read()

# Add comprehensive test tools for each rule
test_tools = """
# ============================================================================
# TEST TOOLS FOR ANALYSIS RULES
# ============================================================================

# E001: Missing Output Schema
@mcp.tool()
def test_e001_no_output(data: str) -> None:
    \"\"\"Tool with no output schema - should trigger E001.\"\"\"
    pass

# E002: Underspecified Required Input  
@mcp.tool()
def test_e002_underspecified(data: str) -> dict:
    \"\"\"Tool with underspecified required input - no description, enum, pattern, or example.\"\"\"
    return {"result": data}

# E011: Missing Tool Description
@mcp.tool()
def test_e011_no_description(data: str) -> dict:
    \"\"\"
    \"\"\"
    return {"result": data}

# W002: Free-Text Output Without Normalization
@mcp.tool()
def test_w002_free_text() -> dict:
    \"\"\"Tool that returns unconstrained free text.\"\"\"
    return {"message": "Some unconstrained text"}

# W003: Missing Examples for User-Facing Inputs
@mcp.tool()
def test_w003_no_examples(
    user_name: Annotated[str, Field(description="The user's name")]
) -> dict:
    \"\"\"Tool with user-facing input but no examples.\"\"\"
    return {"greeting": f"Hello {user_name}"}

# W004: Overloaded Tool Responsibility
@mcp.tool()
def test_w004_overloaded() -> dict:
    \"\"\"Get user, create user, delete user, and update user data.\"\"\"
    return {"result": "done"}

# W005: Generic Description
@mcp.tool()
def test_w005_generic() -> dict:
    \"\"\"Handle it.\"\"\"
    return {"result": "done"}

# W007: Broad Output Schema
@mcp.tool()
def test_w007_broad() -> dict:
    \"\"\"Tool with broad output schema.\"\"\"
    return {"data": "anything"}
"""

# Find where to insert (before the Prompts section)
insert_pos = content.find("# Prompts")
if insert_pos == -1:
    insert_pos = content.find("def main()")

if insert_pos != -1:
    content = content[:insert_pos] + test_tools + "\n\n" + content[insert_pos:]
else:
    content += test_tools

# Write the test server
with open(SERVER_FILE, 'w') as f:
    f.write(content)

print("Test server created successfully!")
print(f"Added test tools for: E001, E002, E011, W002, W003, W004, W005, W007")
