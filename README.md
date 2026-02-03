# Syrin

![Syrin Logo](/assets/syrin-logo-dark-bg.png)

[![npm version](https://badge.fury.io/js/%40syrin%2Fsyrin.svg)](https://badge.fury.io/js/%40syrin%2Fsyrin) [![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC) [![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.12.0-brightgreen)](https://nodejs.org/) [![CI](https://github.com/Syrin-Labs/cli/actions/workflows/ci.yml/badge.svg)](https://github.com/Syrin-Labs/cli/actions/workflows/ci.yml)

## Stop Silent Failures in AI Tool Calls

Your AI agent just called the same tool 47 times with identical parameters.
Your logs look fine. You're silently burning $200 in tokens.

**Syrin catches these failures before production.**

---

## What Is This?

Syrin is a development toolkit for [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) servers — the standard way AI agents call external tools.

**Without Syrin:**

```txt
Tool called 47x          →  No visibility
$200 burned              →  Silent failure
Logs look "fine"         →  Debug for hours
```

**With Syrin:**

```txt
Loop detected at call #3 →  Execution halted
Full event trace         →  See exactly what happened
Contract validated       →  Catch issues before runtime
```

---

## What Syrin Catches

**Tool Loops** — Model proposes the same tool repeatedly with no progress

**Wrong Tool Selection** — Similar names, overlapping schemas, ambiguous descriptions cause silent misbehavior

**Silent Failures** — Tool throws an error but execution continues with broken state

**Contract Mismatches** — Input/output schemas don't align between chained tools

**Hidden Dependencies** — Tools assume state that doesn't exist

Documentation: [https://docs.syrin.dev](https://docs.syrin.dev)

---

## See It In Action

### Catching Contract Issues (`syrin analyse`)

![syrin analyse demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-analyse/analyse.gif)

### Interactive Development (`syrin dev`)

![syrin dev demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-dev/dev.gif)

### Sandboxed Tool Testing (`syrin test`)

![syrin test tool demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-test/test_tool.gif)

### Connection Test (`syrin test --connection`)

![syrin test connection demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-test/test_connection.gif)

### Project Setup (`syrin init`)

![syrin init demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-init/init.gif)

### Inspect Tools (`syrin list`)

![syrin list demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-list/list.gif)

---

## Try It in 2 Minutes

```bash
# Install globally
npm install -g @syrin/cli

# Check your environment
syrin doctor

# Analyze an MCP server (HTTP)
syrin analyse --transport http --url http://localhost:8000/mcp

# Interactive dev mode with execution
syrin dev --exec --transport http --url http://localhost:8000/mcp
```

Or initialize a project with local config:

```bash
npx @syrin/cli init
syrin doctor
syrin analyse
```

Requirements: Node.js >= 20.12, npm >= 9

---

## Core Commands

| Command | What It Does |
|---------|--------------|
| `syrin analyse` | Static analysis — catches contract issues before runtime |
| `syrin dev` | Interactive mode — see exactly what your LLM proposes |
| `syrin test` | Contract testing — validate tools in sandboxed execution |
| `syrin doctor` | Environment check — validate config and connections |
| `syrin list` | Inspect tools, resources, and prompts from your server |

---

## Global Configuration

Syrin supports both **local** (project-specific) and **global** (user-wide) configurations. This allows you to:

- Use Syrin from any directory without initializing a project
- Share LLM API keys across multiple projects
- Set default agent names and LLM providers globally

### Quick Setup

```bash
# Set up global configuration
syrin config setup --global

# Set API keys in global .env
syrin config edit-env --global

# Use Syrin from any directory
syrin dev --exec --transport http --url http://localhost:8000/mcp
```

### Configuration Management

```bash
# View global config
syrin config list --global

# Set global LLM provider
syrin config set openai.model "gpt-4-turbo" --global

# Set default provider
syrin config set-default claude --global
```

See the [Configuration Guide](docs/Commands/syrin-config.md) for more details.

## Key Capabilities

### `syrin analyse` — Find Problems Before They Hit Production

**The Problem:** Your LLM picks the wrong tool, or calls tools with missing parameters. You only find out after deployment when users report broken behavior.

**The Solution:** Static analysis of your tool contracts catches issues before any code runs.

```bash
syrin analyse           # Check all tool contracts
syrin analyse --ci      # Exit code 1 on errors (for CI pipelines)
syrin analyse --strict  # Treat warnings as errors
```

**What it catches:**
- Vague or missing tool descriptions
- Parameters without descriptions (LLMs guess wrong)
- Overlapping tools that confuse model selection
- Schema mismatches between chained tools
- Circular dependencies

---

### `syrin dev` — See What Your LLM Actually Does

**The Problem:** Your LLM calls tools, but you can't see *why* it chose that tool, what parameters it's sending, or what happens between steps. You're debugging blind.

**The Solution:** An interactive environment where you see every tool proposal before it executes.

```bash
syrin dev         # Preview mode (no execution)
syrin dev --exec  # Enable execution when ready
```

**What you get:**
- See exactly which tool the LLM wants to call and why
- Inspect parameters before they're sent
- Step through tool chains one call at a time
- Full event trace of every decision

---

### `syrin test` — Validate Tools in Isolation

**The Problem:** A tool works fine in manual testing, but in production it has side effects you didn't expect, returns massive outputs that blow your context window, or behaves differently on repeated calls.

**The Solution:** Sandboxed execution that validates each tool against its behavioral contract.

```bash
syrin test                 # Test all tools
syrin test --tool fetch_user  # Test specific tool
syrin test --strict        # Warnings become errors
syrin test --json          # JSON output for CI
```

**What it catches:**
- Unexpected side effects (file writes, network calls)
- Non-deterministic outputs
- Output size explosions
- Hidden dependencies on external state
- Contract violations

---

### `syrin doctor` — Validate Your Setup

**The Problem:** Something's misconfigured, but you're not sure what. API keys? Transport settings? MCP connection?

**The Solution:** A single command that checks everything.

```bash
syrin doctor              # Check config, env, connections
syrin test --connection   # Test MCP connection only
```

---

## Tool Contracts

Define behavioral guarantees for your tools in `tools/<tool-name>.yaml` files:

```yaml
version: 1
tool: fetch_user

contract:
  input_schema: FetchUserRequest
  output_schema: User

guarantees:
  side_effects: none
  max_output_size: 10kb
```

See [Tool Contracts Documentation](./docs/tool-contracts.md) for details.

## Configuration

Syrin uses a single configuration file:

```bash
syrin.yaml
```

This file defines:

- Transport type (`stdio` or `http`)
- MCP server connection
- Allowed LLM providers

Configuration reference: [https://docs.syrin.dev/configuration](https://docs.syrin.dev/configuration)

---

## Transport Support

- **stdio** – Syrin manages the MCP server process (recommended for development)
- **http** – Syrin connects to an existing server (common in production)

Transport documentation: [https://docs.syrin.dev/configuration/transport](https://docs.syrin.dev/configuration/transport)

---

## LLM Providers

Supported providers:

- OpenAI
- Claude (Anthropic)
- Ollama (local models)

LLMs propose actions.  
Syrin governs execution.

Provider configuration: [https://docs.syrin.dev/configuration/llm](https://docs.syrin.dev/configuration/llm)

---

## Community

- [Discord](https://discord.gg/j8GUvHybSa) — Ask questions, share feedback
- [GitHub Discussions](https://github.com/Syrin-Labs/cli/discussions) — Feature ideas, show & tell
- [Documentation](https://docs.syrin.dev) — Full guides and API reference

---

## Links

- Documentation: [https://docs.syrin.dev](https://docs.syrin.dev)
- GitHub: [https://github.com/Syrin-Labs/cli](https://github.com/Syrin-Labs/cli)
- Issues: [https://github.com/Syrin-Labs/cli/issues](https://github.com/Syrin-Labs/cli/issues)
- npm: [https://www.npmjs.com/package/@syrin/cli](https://www.npmjs.com/package/@syrin/cli)

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting PRs.

For security issues, please see our [Security Policy](SECURITY.md).

---

## License

ISC License. See [LICENSE](LICENSE) for details.

Made with care by **Syrin Labs**.
