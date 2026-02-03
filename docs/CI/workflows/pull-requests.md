---
title: 'Pull Request Checks'
description: 'Setting up Syrin validation for pull requests'
weight: 8
---

## Pull Request Checks

Comprehensive validation on pull requests ensures code quality before merging.

## GitHub Actions PR Workflow

```yaml
name: PR Validation

on:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install and Run Syrin
        run: |
          npm install -g @syrin/cli
          npm install
          syrin analyse --ci --strict
          syrin test --ci --strict
```

## GitLab CI Merge Request Pipeline

```yaml
syrin-pr-validation:
  stage: validate
  only:
    - merge_requests
  image: node:18
  before_script:
    - npm install -g @syrin/cli
    - npm install
  script:
    - syrin analyse --ci --strict
    - syrin test --ci --strict
```

## Test Only Changed Tools

Test only tools modified in the PR:

```yaml
- name: Get Changed Tools
  id: changed-tools
  run: |
    CHANGED=$(git diff --name-only origin/${{ github.base_ref }} | grep 'tools/.*\.yaml$' | sed 's|tools/||' | sed 's|\.yaml||' | jq -R -s -c 'split("\n")[:-1]')
    echo "tools=$CHANGED" >> $GITHUB_OUTPUT

- name: Test Changed Tools
  if: steps.changed-tools.outputs.tools != '[]'
  run: |
    for tool in $(echo '${{ steps.changed-tools.outputs.tools }}' | jq -r '.[]'); do
      syrin test --ci --tool "$tool"
    done
```

## See Also

- [CI Best Practices](/ci/best-practices/)
- [Pre-Commit Hooks](/ci/workflows/pre-commit/)
- [Release Validation](/ci/workflows/releases/)
