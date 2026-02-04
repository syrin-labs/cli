---
title: 'GitHub Actions Setup'
description: 'How to integrate Syrin with GitHub Actions'
weight: 2
---

## GitHub Actions Integration

Set up Syrin validation in your GitHub Actions workflows.

## Basic Workflow

```yaml
name: Syrin Validation

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Syrin
        run: npm install -g @syrin/cli

      - name: Install Dependencies
        run: npm install

      - name: Run Static Analysis
        run: syrin analyse --ci --json > analysis.json
        continue-on-error: true

      - name: Run Tests
        run: syrin test --ci --json > test-results.json
        continue-on-error: true

      - name: Upload Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: syrin-results
          path: |
            analysis.json
            test-results.json

      - name: Check Results
        run: |
          if [ -f analysis.json ] && [ -s analysis.json ]; then
            ERRORS=$(jq '.summary.errors // 0' analysis.json)
            if [ "$ERRORS" -gt 0 ]; then
              echo "❌ Static analysis found $ERRORS errors"
              exit 1
            fi
          fi

          if [ -f test-results.json ] && [ -s test-results.json ]; then
            VERDICT=$(jq -r '.verdict // "pass"' test-results.json)
            if [ "$VERDICT" != "pass" ]; then
              echo "❌ Tests failed"
              exit 1
            fi
          fi
```

## With Strict Mode

Enable strict mode on tests to treat warnings as errors:

```yaml
- name: Run Static Analysis
  run: syrin analyse --ci --json > analysis.json

- name: Run Tests
  run: syrin test --ci --strict --json > test-results.json
```

## Environment Variables

Configure Syrin behavior:

```yaml
env:
  SYRIN_STRICT_MODE: 'true'
  SYRIN_TIMEOUT_MS: '60000'
```

## See Also

- [CI Best Practices](/ci/best-practices/)
- [CI Workflows](/ci/workflows/)
- [Reporting Results](/ci/reporting/)
