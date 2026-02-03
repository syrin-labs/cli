# Security Policy

## Supported Versions

We release patches for security issues in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Security Issue

**Please do not report security issues through public GitHub issues.**

If you discover a security issue, please report it by emailing **security@syrin.ai**.

Include the following in your report:

- Description of the issue
- Steps to reproduce (if applicable)
- Potential impact
- Any suggested fixes (optional)

## What to Expect

1. **Acknowledgment**: We will acknowledge receipt of your report within 48 hours.

2. **Assessment**: We will investigate and determine the severity and impact.

3. **Updates**: We will keep you informed of our progress.

4. **Resolution**: Once resolved, we will notify you and discuss public disclosure timing.

5. **Credit**: We are happy to credit reporters in our release notes (unless you prefer to remain anonymous).

## Scope

This security policy applies to:

- The `@syrin/cli` npm package
- The Syrin CLI tool and its dependencies
- The official documentation at [docs.syrin.dev](https://docs.syrin.dev)

## Out of Scope

- Third-party MCP servers connected via Syrin
- User-configured LLM provider credentials (these are your responsibility to secure)
- Issues in dependencies (please report these to the respective maintainers)

## Security Best Practices for Syrin Users

1. **Protect your API keys**: Use environment variables or the global `.env` file (`~/.syrin/.env`), never commit credentials to version control.

2. **Review tool contracts**: Before enabling `--exec` mode, understand what tools will be executed.

3. **Use sandboxed testing**: The `syrin test` command runs tools in isolated environments with resource limits.

4. **Keep Syrin updated**: Run `syrin update` regularly to get security patches.

## Security Features in Syrin

- **Execution disabled by default**: `syrin dev` requires explicit `--exec` flag
- **Sandboxed test execution**: Resource limits and process isolation
- **Contract validation**: Static analysis catches issues before runtime
- **Event audit trail**: All tool executions are logged to `.syrin/events/`
