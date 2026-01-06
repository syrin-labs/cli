#!/usr/bin/env python3
"""
Test script to verify all analysis rules work correctly.
Creates test cases in parth/server.py and runs syrin analyse.
"""

import subprocess
import json
import sys
import os
import time
from pathlib import Path

BASE_DIR = Path(__file__).parent
PARTH_DIR = BASE_DIR / "parth"
SERVER_FILE = PARTH_DIR / "server.py"
BACKUP_FILE = PARTH_DIR / "server.py.backup"

def run_analyse():
    """Run syrin analyse and return the result."""
    try:
        result = subprocess.run(
            [
                "node", "dist/cli/index.js", "analyse",
                "--transport", "stdio",
                "--script", f"python3 {SERVER_FILE} --mode stdio",
                "--json"
            ],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0 and not result.stdout.strip():
            return None
            
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            return None
    except subprocess.TimeoutExpired:
        return None
    except Exception as e:
        print(f"Error running analyse: {e}")
        return None

def check_rule(result, rule_id):
    """Check if a rule is present in the analysis result."""
    if not result:
        return False
    
    diagnostics = result.get("diagnostics", [])
    for diag in diagnostics:
        if diag.get("code") == rule_id:
            return True
    return False

def create_test_server_for_rule(rule_id):
    """Create a test server file that should trigger a specific rule."""
    
    # Base server content with test tools for each rule
    test_tools = {
        "E001": """
@mcp.tool()
def test_e001_no_output():
    \"\"\"Tool with no output schema.\"\"\"
    return None
""",
        "E002": """
@mcp.tool()
def test_e002_underspecified(data: str) -> dict:
    \"\"\"Tool with underspecified required input.\"\"\"
    return {"result": data}
""",
        "E011": """
@mcp.tool()
def test_e011_no_description(data: str) -> dict:
    \"\"\"
    \"\"\"
    return {"result": data}
""",
    }
    
    # Read backup
    with open(BACKUP_FILE, 'r') as f:
        content = f.read()
    
    # Add test tool
    if rule_id in test_tools:
        # Find the last tool and add after it
        content += "\n\n# Test tool for " + rule_id + "\n"
        content += test_tools[rule_id]
    
    # Write to server file
    with open(SERVER_FILE, 'w') as f:
        f.write(content)

def test_rule(rule_id, rule_name):
    """Test a specific rule."""
    print(f"\n{'='*60}")
    print(f"Testing {rule_id}: {rule_name}")
    print(f"{'='*60}")
    
    # Create test server
    create_test_server_for_rule(rule_id)
    
    # Wait a bit for file system
    time.sleep(0.5)
    
    # Run analyse
    result = run_analyse()
    
    if result is None:
        print(f"✗ {rule_id}: Analysis failed or timed out")
        return False
    
    # Check if rule is detected
    found = check_rule(result, rule_id)
    
    if found:
        print(f"✓ {rule_id}: Rule detected correctly")
        # Show the diagnostic
        for diag in result.get("diagnostics", []):
            if diag.get("code") == rule_id:
                print(f"  Message: {diag.get('message', '')[:80]}")
        return True
    else:
        print(f"✗ {rule_id}: Rule NOT detected")
        print(f"  Verdict: {result.get('verdict', 'unknown')}")
        print(f"  Errors: {len(result.get('errors', []))}")
        print(f"  Warnings: {len(result.get('warnings', []))}")
        if result.get('errors') or result.get('warnings'):
            print("  Diagnostics found:")
            for diag in result.get("diagnostics", [])[:3]:
                print(f"    {diag.get('code')}: {diag.get('message', '')[:60]}")
        return False

def main():
    """Main test function."""
    print("Building project...")
    subprocess.run(["npm", "run", "build"], cwd=BASE_DIR, capture_output=True)
    
    # Restore backup first
    if BACKUP_FILE.exists():
        subprocess.run(["cp", str(BACKUP_FILE), str(SERVER_FILE)])
    
    # Test rules
    rules = [
        ("E001", "Missing Output Schema"),
        ("E002", "Underspecified Required Input"),
        ("E011", "Missing Tool Description"),
    ]
    
    results = {}
    for rule_id, rule_name in rules:
        results[rule_id] = test_rule(rule_id, rule_name)
    
    # Summary
    print(f"\n{'='*60}")
    print("Summary")
    print(f"{'='*60}")
    for rule_id, rule_name in rules:
        status = "✓ PASS" if results[rule_id] else "✗ FAIL"
        print(f"{status}: {rule_id} - {rule_name}")
    
    # Restore backup
    if BACKUP_FILE.exists():
        subprocess.run(["cp", str(BACKUP_FILE), str(SERVER_FILE)])
    
    return 0 if all(results.values()) else 1

if __name__ == "__main__":
    sys.exit(main())
