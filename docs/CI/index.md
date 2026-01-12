---
title: "Continuous Integration"
description: "How Syrin helps you write safe MCPs through CI integration"
weight: 1
---

## Automate safety checks

Syrin is designed to integrate seamlessly into CI/CD pipelines, providing automated validation and safety checks for MCP tools before they reach production.

## Why CI Integration Matters

MCP tools are critical infrastructure for AI agents. Issues that slip through can cause:

- **Production Failures**: Tools that crash or hang
- **Security Vulnerabilities**: Tools that mutate project state
- **Agent Confusion**: Ambiguous or poorly defined tools
- **Cost Overruns**: Tools that produce excessive output

Syrin catches these issues **before** they reach production through automated testing and analysis.

## Documentation Sections

### [CI Platform Setup](/ci/setup/)

Complete setup guides for popular CI platforms:

- [GitHub Actions](/ci/setup/github-actions/)
- [GitLab CI](/ci/setup/gitlab-ci/)
- [CircleCI](/ci/setup/circleci/)

### [CI Best Practices](/ci/best-practices/)

Learn how to configure Syrin effectively in CI:

- Running analysis and tests
- Using strict mode
- Storing results
- Setting timeouts
- Failing fast on errors

### [How Syrin Helps](/ci/how-syrin-helps/)

Understand how Syrin makes your MCPs safer:

- Static analysis benefits
- Runtime testing benefits
- Error and warning detection
- Contract validation

### [CI Workflows](/ci/workflows/)

Real-world workflow examples:

- Pre-commit hooks
- Pull request checks
- Release validation

### [Reporting Results](/ci/reporting/)

How to report and visualize CI results:

- GitHub Actions annotations
- GitLab CI reports
- Custom reporting

## Quick Start

Add Syrin to your CI pipeline:

```bash
# Install Syrin
npm install -g @syrin/cli

# Run static analysis
syrin analyse --ci

# Run tests
syrin test --ci
```

## See Also

- [Testing Documentation](/testing/)
- [Error Rules Documentation](/errors/)
- [Warning Rules Documentation](/warnings/)
- [Writing Test Cases](/testing/writing-test-cases/) - Tool contract documentation
