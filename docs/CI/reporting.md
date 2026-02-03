---
title: 'Reporting Results'
description: 'How to report and visualize CI results'
weight: 10
---

## Reporting Results

Learn how to report and visualize Syrin validation results in your CI platform.

## GitHub Actions Annotations

Annotate PRs with error messages:

```yaml
- name: Annotate Results
  run: |
    if [ -f analysis.json ]; then
      jq -r '.tools[] | select(.status == "error") | "::error file=\(.name).yaml::\(.issues[0].message)"' analysis.json
    fi

    if [ -f test-results.json ]; then
      jq -r '.toolResults[] | select(.passed == false) | "::error::Tool \(.toolName) failed tests"' test-results.json
    fi
```

## GitLab CI Reports

Use GitLab's built-in reporting:

```yaml
syrin-validation:
  artifacts:
    reports:
      junit: test-results.xml # Convert JSON to JUnit format
```

## Custom Reporting Script

Create a custom reporting script:

```bash
#!/bin/bash
# report-syrin-results.sh

if [ -f analysis.json ]; then
  echo "## Static Analysis Results"
  echo ""
  ERRORS=$(jq '.summary.errors // 0' analysis.json)
  WARNINGS=$(jq '.summary.warnings // 0' analysis.json)
  echo "- Errors: $ERRORS"
  echo "- Warnings: $WARNINGS"
  echo ""
fi

if [ -f test-results.json ]; then
  echo "## Test Results"
  echo ""
  VERDICT=$(jq -r '.verdict // "fail"' test-results.json)
  TOOLS_TESTED=$(jq '.toolsTested // 0' test-results.json)
  TOOLS_PASSED=$(jq '.toolsPassed // 0' test-results.json)
  echo "- Verdict: $VERDICT"
  echo "- Tools Tested: $TOOLS_TESTED"
  echo "- Tools Passed: $TOOLS_PASSED"
  echo ""
fi
```

## JSON Result Structure

### Analysis Results

```json
{
  "summary": {
    "errors": 0,
    "warnings": 2,
    "toolsAnalyzed": 10
  },
  "tools": [
    {
      "name": "fetch_user",
      "status": "warning",
      "issues": [
        {
          "code": "W102",
          "message": "Missing examples for user-facing inputs",
          "severity": "warning"
        }
      ]
    }
  ]
}
```

### Test Results

```json
{
  "verdict": "pass",
  "toolsTested": 10,
  "toolsPassed": 10,
  "toolsFailed": 0,
  "toolResults": [
    {
      "toolName": "fetch_user",
      "passed": true,
      "summary": {
        "totalExecutions": 5,
        "successfulExecutions": 5,
        "failedExecutions": 0
      }
    }
  ]
}
```

## See Also

- [CI Best Practices](/ci/best-practices/)
- [CI Workflows](/ci/workflows/)
- [Testing Documentation](/testing/)
