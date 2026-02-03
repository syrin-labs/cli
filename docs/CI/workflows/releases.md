---
title: 'Release Validation'
description: 'Full validation before releases'
weight: 9
---

## Release Validation

Full validation before releases ensures production readiness.

## GitHub Actions Release Workflow

```yaml
name: Release Validation

on:
  push:
    tags:
      - 'v*'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Full Validation
        run: |
          npm install -g @syrin/cli
          npm install
          syrin analyse --ci --strict --json > analysis.json
          syrin test --ci --strict --json > test-results.json

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: validation-results
          path: |
            analysis.json
            test-results.json
```

## GitLab CI Release Pipeline

```yaml
syrin-release-validation:
  stage: validate
  only:
    - tags
  image: node:18
  before_script:
    - npm install -g @syrin/cli
    - npm install
  script:
    - syrin analyse --ci --strict --json > analysis.json
    - syrin test --ci --strict --json > test-results.json
  artifacts:
    paths:
      - analysis.json
      - test-results.json
    expire_in: 1 month
```

## CircleCI Release Workflow

```yaml
release-validation:
  docker:
    - image: cimg/node:18.0
  steps:
    - checkout
    - run: npm install -g @syrin/cli
    - run: npm install
    - run: syrin analyse --ci --strict --json > analysis.json
    - run: syrin test --ci --strict --json > test-results.json
    - store_artifacts:
        path: analysis.json
    - store_artifacts:
        path: test-results.json
```

## See Also

- [CI Best Practices](/ci/best-practices/)
- [Pre-Commit Hooks](/ci/workflows/pre-commit/)
- [Pull Request Checks](/ci/workflows/pull-requests/)
