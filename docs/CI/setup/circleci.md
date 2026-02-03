---
title: 'CircleCI Setup'
description: 'How to integrate Syrin with CircleCI'
weight: 4
---

## CircleCI Integration

Set up Syrin validation in your CircleCI workflows.

## Basic Configuration

```yaml
version: 2.1

jobs:
  validate:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - run:
          name: Install Syrin
          command: npm install -g @syrin/cli
      - run:
          name: Install Dependencies
          command: npm install
      - run:
          name: Run Static Analysis
          command: syrin analyse --ci --json > analysis.json
          no_output_timeout: 10m
      - run:
          name: Run Tests
          command: syrin test --ci --json > test-results.json
          no_output_timeout: 10m
      - store_artifacts:
          path: analysis.json
      - store_artifacts:
          path: test-results.json
      - run:
          name: Check Results
          command: |
            ERRORS=$(jq '.summary.errors // 0' analysis.json)
            if [ "$ERRORS" -gt 0 ]; then
              echo "❌ Static analysis found $ERRORS errors"
              exit 1
            fi

            VERDICT=$(jq -r '.verdict // "pass"' test-results.json)
            if [ "$VERDICT" != "pass" ]; then
              echo "❌ Tests failed"
              exit 1
            fi

workflows:
  version: 2
  validate:
    jobs:
      - validate
```

## With Strict Mode

Enable strict mode to treat warnings as errors:

```yaml
- run:
    name: Run Static Analysis
    command: syrin analyse --ci --strict --json > analysis.json
- run:
    name: Run Tests
    command: syrin test --ci --strict --json > test-results.json
```

## Environment Variables

Configure Syrin behavior:

```yaml
jobs:
  validate:
    environment:
      SYRIN_STRICT_MODE: 'true'
      SYRIN_TIMEOUT_MS: '60000'
```

## See Also

- [CI Best Practices](/ci/best-practices/)
- [CI Workflows](/ci/workflows/)
- [Reporting Results](/ci/reporting/)
