---
title: "Pre-Commit Hooks"
description: "Using Syrin in pre-commit hooks"
weight: 7
---

## Pre-Commit Hooks

Run quick checks before commits to catch issues early.

## Basic Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running Syrin static analysis..."
syrin analyse --ci || exit 1

echo "Running Syrin tests..."
syrin test --ci --tool $(git diff --name-only | grep tools/ | cut -d'/' -f2 | cut -d'.' -f1 | head -1) || exit 1
```

## Using pre-commit Framework

Install the pre-commit framework:

```bash
pip install pre-commit
```

Add to `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: syrin-analyse
        name: Syrin Static Analysis
        entry: syrin analyse --ci
        language: system
        pass_filenames: false
      
      - id: syrin-test
        name: Syrin Tests
        entry: syrin test --ci
        language: system
        pass_filenames: false
```

## Test Only Changed Tools

Test only tools that have changed:

```bash
#!/bin/bash
# .git/hooks/pre-commit

CHANGED_TOOLS=$(git diff --cached --name-only | grep 'tools/.*\.yaml$' | sed 's|tools/||' | sed 's|\.yaml||')

if [ -z "$CHANGED_TOOLS" ]; then
  echo "No tool contracts changed"
  exit 0
fi

for tool in $CHANGED_TOOLS; do
  echo "Testing tool: $tool"
  syrin test --ci --tool "$tool" || exit 1
done
```

## See Also

- [CI Best Practices](/ci/best-practices/)
- [Pull Request Checks](/ci/workflows/pull-requests/)
- [Release Validation](/ci/workflows/releases/)
