#!/bin/bash
# Test script to systematically verify each analysis rule

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_FILE="$SCRIPT_DIR/parth/server.analyse.py"
VENV_PYTHON="$SCRIPT_DIR/parth/.venv/bin/python"

echo "=== Testing Syrin Analysis on server.analyse.py ==="
echo ""

# Run analysis and capture JSON output
OUTPUT=$(timeout 15 node "$SCRIPT_DIR/dist/index.js" analyse \
  --transport stdio \
  --script "$VENV_PYTHON $SERVER_FILE --mode stdio" \
  --json 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "❌ Analysis command failed"
  exit 1
fi

# Parse JSON and extract rule coverage
ERROR_CODES=$(echo "$OUTPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
error_codes = sorted(set(d.get('code') for d in data.get('diagnostics', []) if d.get('severity') == 'error'))
warning_codes = sorted(set(d.get('code') for d in data.get('diagnostics', []) if d.get('severity') == 'warning'))
print('ERRORS:', ','.join(error_codes))
print('WARNINGS:', ','.join(warning_codes))
print('TOTAL_ERRORS:', data.get('errors', 0))
print('TOTAL_WARNINGS:', data.get('warnings', 0))
print('DEPENDENCIES:', len(data.get('dependencies', [])))
print('HIGH_CONF_DEPS:', len([d for d in data.get('dependencies', []) if d.get('confidence', 0) >= 0.8]))
" 2>/dev/null)

echo "$ERROR_CODES"
echo ""

# Expected rules
EXPECTED_ERRORS=("E001" "E002" "E005" "E006" "E009" "E011")
EXPECTED_WARNINGS=("W001" "W002" "W003" "W004" "W005" "W007" "W008" "W009" "W010")

# Rules that require dependencies (may not trigger due to dependency inference limitation)
DEPENDENCY_RULES=("E003" "E004" "E007" "E008" "W006")

echo "=== Rule Coverage ==="
echo ""
echo "Expected Error Rules: ${EXPECTED_ERRORS[*]}"
echo "Expected Warning Rules: ${EXPECTED_WARNINGS[*]}"
echo "Dependency-based Rules (may not trigger): ${DEPENDENCY_RULES[*]}"
echo ""

# Check each expected rule
echo "=== Detailed Rule Status ==="
for rule in "${EXPECTED_ERRORS[@]}" "${EXPECTED_WARNINGS[@]}"; do
  COUNT=$(echo "$OUTPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
count = sum(1 for d in data.get('diagnostics', []) if d.get('code') == '$rule')
print(count)
" 2>/dev/null)
  
  if [ "$COUNT" -gt 0 ]; then
    echo "✓ $rule: $COUNT issue(s) detected"
  else
    if [[ " ${DEPENDENCY_RULES[@]} " =~ " ${rule} " ]]; then
      echo "⚠ $rule: Not detected (requires high-confidence dependency >=0.8)"
    else
      echo "✗ $rule: NOT DETECTED"
    fi
  fi
done

echo ""
echo "=== Dependency Analysis ==="
DEPS_INFO=$(echo "$OUTPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
deps = data.get('dependencies', [])
print(f'Total dependencies inferred: {len(deps)}')
if deps:
    high_conf = [d for d in deps if d.get('confidence', 0) >= 0.8]
    med_conf = [d for d in deps if 0.6 <= d.get('confidence', 0) < 0.8]
    print(f'High-confidence (>=0.8): {len(high_conf)}')
    print(f'Medium-confidence (0.6-0.8): {len(med_conf)}')
    if high_conf:
        print('\\nHigh-confidence dependencies:')
        for d in sorted(high_conf, key=lambda x: x.get('confidence', 0), reverse=True)[:5]:
            print(f\"  {d.get('fromTool')}.{d.get('fromField')} -> {d.get('toTool')}.{d.get('toField')} ({d.get('confidence', 0):.3f})\")
else:
    print('No dependencies inferred.')
    print('\\nNOTE: Dependency inference requires:')
    print('  - Name similarity (weight: 0.4) - exact match = 0.4')
    print('  - Type compatibility (weight: 0.3) - exact match = 0.09, compatible = 0.06')
    print('  - Description overlap (weight: 0.3) - max = 0.3')
    print('  - Maximum possible confidence = 0.4 + 0.09 + 0.3 = 0.79')
    print('  - Rules require >= 0.8, so dependency-based rules may not trigger')
" 2>/dev/null)

echo "$DEPS_INFO"
echo ""
echo "=== Test Complete ==="
