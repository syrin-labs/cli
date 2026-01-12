---
title: "CI Best Practices"
description: "Best practices for using Syrin in CI/CD pipelines"
weight: 5
---

## CI Best Practices

Follow these best practices to get the most out of Syrin in your CI/CD pipelines.

## 1. Run Analysis and Tests Separately

Run static analysis first (faster), then tests (more comprehensive):

```bash
# Fast: Static analysis
syrin analyse --ci

# Comprehensive: Runtime tests
syrin test --ci
```

**Why**: Static analysis is faster and catches structural issues early. Tests are more comprehensive but take longer.

## 2. Use Strict Mode

Enable strict mode to catch warnings:

```bash
syrin analyse --ci --strict
syrin test --ci --strict
```

**Why**: Warnings indicate potential issues that should be addressed. Strict mode ensures they don't slip through.

## 3. Store Results as Artifacts

Save JSON results for later analysis:

```bash
syrin analyse --json > analysis.json
syrin test --json > test-results.json
```

**Why**: JSON results can be parsed programmatically, stored for historical analysis, and used for reporting.

## 4. Fail Fast on Errors

Exit immediately on errors:

```bash
syrin analyse --ci || exit 1
syrin test --ci || exit 1
```

**Why**: Don't waste CI time if there are blocking errors. Fail fast and fix issues immediately.

## 5. Set Appropriate Timeouts

Configure timeouts for long-running tests:

```yaml
# syrin.yaml
check:
  timeout_ms: 60000  # 60 seconds for CI
```

**Why**: CI environments may have different performance characteristics. Set timeouts based on your CI environment.

## 6. Use CI Mode

Always use `--ci` flag in CI environments:

```bash
syrin analyse --ci
syrin test --ci
```

**Why**: CI mode provides minimal output suitable for automated pipelines and proper exit codes.

## 7. Parallel Execution

Run analysis and tests in parallel when possible:

```yaml
jobs:
  analyse:
    runs-on: ubuntu-latest
    steps:
      - run: syrin analyse --ci
  
  test:
    runs-on: ubuntu-latest
    steps:
      - run: syrin test --ci
```

**Why**: Parallel execution reduces total CI time.

## 8. Cache Dependencies

Cache npm dependencies to speed up builds:

```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

**Why**: Faster builds mean faster feedback.

## See Also

- [CI Platform Setup](/ci/setup/)
- [CI Workflows](/ci/workflows/)
- [Reporting Results](/ci/reporting/)
