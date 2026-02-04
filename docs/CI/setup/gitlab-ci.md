---
title: 'GitLab CI Setup'
description: 'How to integrate Syrin with GitLab CI'
weight: 3
---

## GitLab CI Integration

Set up Syrin validation in your GitLab CI pipelines.

## Basic Pipeline

```yaml
stages:
  - validate

syrin-validation:
  stage: validate
  image: node:20
  before_script:
    - npm install -g @syrin/cli
    - npm install
  script:
    - syrin analyse --ci --json > analysis.json || true
    - syrin test --ci --json > test-results.json || true
  artifacts:
    when: always
    paths:
      - analysis.json
      - test-results.json
    expire_in: 1 week
  after_script:
    - |
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
script:
  - syrin analyse --ci --json > analysis.json || true
  - syrin test --ci --strict --json > test-results.json || true
```

## Variables

Configure Syrin behavior:

```yaml
variables:
  SYRIN_STRICT_MODE: 'true'
  SYRIN_TIMEOUT_MS: '60000'
```

## See Also

- [CI Best Practices](/ci/best-practices/)
- [CI Workflows](/ci/workflows/)
- [Reporting Results](/ci/reporting/)
