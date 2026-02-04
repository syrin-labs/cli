---
title: 'Add Syrin to CI'
description: 'Run Syrin analysis and tests in your CI/CD pipeline'
weight: 4
---

## Let the Robots Do the Boring Part

Two commands keep your MCP server honest on every push: `syrin analyse --ci` and `syrin test --ci`.

## The Two Commands That Matter

```bash
# Static analysis -- catches contract issues without executing tools
syrin analyse --ci

# Contract testing -- executes tools in sandbox, validates behavior
syrin test --ci
```

Both exit with code `0` on success and `1` on failure.

## GitHub Actions (Copy-Paste)

Create `.github/workflows/syrin.yml`:

```yaml
name: Syrin MCP Validation

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  analyse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Syrin
        run: npm install -g @syrin/cli

      - name: Run Analysis
        run: syrin analyse --ci

  test:
    runs-on: ubuntu-latest
    needs: analyse
    env:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      OPENAI_MODEL: gpt-4-turbo
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Syrin
        run: npm install -g @syrin/cli

      - name: Start MCP Server
        run: |
          # Replace with your server start command
          python server.py --mode http --port 8000 &
          sleep 3

      - name: Run Tests
        run: syrin test --ci --strict
```

## Setting Environment Variables in CI

Syrin resolves env var names from `syrin.yaml` against the environment. In CI, set them as secrets.

**GitHub Actions:**

1. Go to repo Settings > Secrets and variables > Actions
2. Add `OPENAI_API_KEY` (or whichever provider you use)
3. Reference in workflow: `${{ secrets.OPENAI_API_KEY }}`

**GitLab CI:**

1. Go to Settings > CI/CD > Variables
2. Add `OPENAI_API_KEY` as a protected variable
3. It is available as `$OPENAI_API_KEY` in your pipeline

No `.env` file needed in CI. Syrin checks `process.env` first.

## Exit Codes

| Code | Meaning                     |
| ---- | --------------------------- |
| `0`  | All checks passed           |
| `1`  | One or more errors detected |

Use `--strict` with `syrin test` to treat warnings as errors:

```bash
syrin test --ci --strict
```

## JSON Output

For custom reporting or dashboarding:

```bash
syrin analyse --json > analysis-results.json
syrin test --json > test-results.json
```

## See Also

- [CI/CD Integration](/ci/) -- Full CI documentation (GitHub Actions, GitLab CI, CircleCI)
- [CI Best Practices](/ci/best-practices/) -- Caching, parallel execution, failure strategies
- [CI Reporting](/ci/reporting/) -- Custom reports and annotations
