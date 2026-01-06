#!/bin/bash
# Test script to verify all analysis rules work correctly

set -e

cd "$(dirname "$0")"
PARTH_DIR="parth"
VENV_PATH="$PARTH_DIR/.venv"

# Activate virtual environment if it exists
if [ -d "$VENV_PATH" ]; then
    source "$VENV_PATH/bin/activate"
fi

# Build the project first
echo "Building project..."
npm run build > /dev/null 2>&1

# Function to test a rule
test_rule() {
    local rule_id=$1
    local test_name=$2
    local expected_errors=$3
    local expected_warnings=$4
    
    echo ""
    echo "=========================================="
    echo "Testing $rule_id: $test_name"
    echo "=========================================="
    
    # Run analyse and capture output
    local output=$(timeout 5 node dist/cli/index.js analyse --transport stdio --script "python3 $PARTH_DIR/server.py --mode stdio" --json 2>&1 || true)
    
    # Parse JSON output
    local errors=$(echo "$output" | python3 -c "import sys, json; data=json.load(sys.stdin) if sys.stdin.read() else {}; print(len(data.get('errors', [])))" 2>/dev/null || echo "0")
    local warnings=$(echo "$output" | python3 -c "import sys, json; data=json.load(sys.stdin) if sys.stdin.read() else {}; print(len(data.get('warnings', [])))" 2>/dev/null || echo "0")
    
    # Check if rule is in errors or warnings
    local rule_found=""
    if [ "$errors" -gt 0 ] || [ "$warnings" -gt 0 ]; then
        rule_found=$(echo "$output" | python3 -c "import sys, json; data=json.load(sys.stdin) if sys.stdin.read() else {}; diags = data.get('diagnostics', []); print('yes' if any(d.get('code') == '$rule_id' for d in diags) else 'no')" 2>/dev/null || echo "no")
    fi
    
    if [ "$rule_found" = "yes" ]; then
        echo "✓ Rule $rule_id detected correctly"
        return 0
    else
        echo "✗ Rule $rule_id NOT detected"
        echo "Expected: errors=$expected_errors, warnings=$expected_warnings"
        echo "Got: errors=$errors, warnings=$warnings"
        echo "$output" | head -50
        return 1
    fi
}

# Test each rule
echo "Starting rule tests..."
echo ""

# Note: We'll need to modify server.py for each test case
# For now, let's just test the current server and see what rules trigger

echo "Testing current server configuration..."
timeout 5 node dist/cli/index.js analyse --transport stdio --script "python3 $PARTH_DIR/server.py --mode stdio" --json 2>&1 | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"Verdict: {data.get('verdict', 'unknown')}\")
    print(f\"Errors: {len(data.get('errors', []))}\")
    print(f\"Warnings: {len(data.get('warnings', []))}\")
    print(\"\\nErrors:\")
    for e in data.get('errors', []):
        print(f\"  {e.get('code')}: {e.get('message', '')[:80]}\")
    print(\"\\nWarnings:\")
    for w in data.get('warnings', []):
        print(f\"  {w.get('code')}: {w.get('message', '')[:80]}\")
except Exception as e:
    print(f\"Error parsing output: {e}\")
    print(sys.stdin.read())
" || echo "Analysis failed or timed out"

echo ""
echo "Test complete!"
