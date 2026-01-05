# Syrin

![Syrin Logo](/assets/syrin-logo-dark-bg.png)

[![npm version](https://badge.fury.io/js/%40ankan-ai%2Fsyrin.svg)](https://badge.fury.io/js/%40ankan-ai%2Fsyrin) [![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC) [![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

**Syrin is a runtime intelligence system for MCP servers.**

It helps developers **see, validate, and reason about MCP execution** before systems reach production.

Documentation: [https://docs.syrin.dev](https://docs.syrin.dev)

---

## The Problem

Building MCP servers today usually looks like this:

1. Define tools and prompts
2. Connect an LLM
3. Run the server
4. Hope execution behaves as expected

When things go wrong:

- Tools are called for unclear reasons
- Behaviour changes between runs
- Debugging relies on logs and guesswork
- Contract issues surface only after failures

Most problems are discovered **after** deployment.

---

## Installation

### Quick start

```bash
npx @ankan-ai/syrin init
```

### Global install

```bash
npm install -g @ankan-ai/syrin
```

### Local install (recommended for CI)

```bash
npm install @ankan-ai/syrin
```

Requirements:

- Node.js ≥ 18
- npm ≥ 9

---

## The Syrin Way

Syrin changes the workflow.

Instead of guessing how MCP behaves, you **inspect and validate it explicitly**.

**Before:**

```text
Write tools → Connect LLM → Run server → Debug via logs
```

**With Syrin:**

```text
Define tools
→ Analyse contracts
→ Validate protocol
→ Inspect behaviour interactively
→ Enable execution with confidence
```

Syrin does not replace MCP.  
It makes MCP systems understandable and testable.

---

## What Syrin Does

- Validates MCP protocol compliance
- Analyses tool contracts statically
- Lets you interact with MCP servers using real LLMs
- Shows which tools are proposed and why
- Prevents accidental execution by default
- Surfaces configuration and contract errors early

---

## Key Capabilities

### Static Tool Contract Analysis (`syrin analyse`)

LLMs rely entirely on tool contracts.  
If contracts are vague or incomplete, behaviour becomes unreliable.

`syrin analyse` inspects:

- Tool definitions
- Parameter schemas
- Description clarity
- Implicit dependencies between tools

This catches issues **before runtime**.

```bash
syrin analyse
```

This is especially useful in CI:

```bash
syrin analyse --ci
```

---

### Interactive Execution Inspection (`syrin dev`)

`syrin dev` provides a governed chat interface for MCP servers.

- Preview tool calls before execution
- Execute tools only when explicitly enabled
- Switch between LLM providers
- Inspect large tool outputs safely

```bash
syrin dev
```

Enable execution only when ready:

```bash
syrin dev --exec
```

---

### Protocol and Configuration Validation

Before running anything, Syrin validates assumptions.

```bash
syrin doctor
syrin test
```

These commands ensure:

- Configuration is valid
- Environment variables are set
- MCP protocol is followed correctly

---

## Typical Workflow

```bash
syrin init        # Initialise configuration
syrin doctor      # Validate setup
syrin analyse     # Check tool contracts
syrin test        # Validate MCP protocol
syrin dev         # Inspect behaviour interactively
```

This workflow is designed to catch issues **before production**.

---

## Commands Overview

| Command         | Purpose                                |
| --------------- | -------------------------------------- |
| `syrin init`    | Initialise a Syrin project             |
| `syrin doctor`  | Validate configuration and environment |
| `syrin analyse` | Static analysis of MCP tool contracts  |
| `syrin test`    | Validate MCP protocol compliance       |
| `syrin list`    | Inspect tools, resources, and prompts  |
| `syrin dev`     | Interactive execution inspection       |

Full documentation: [https://docs.syrin.dev/commands](https://docs.syrin.dev/commands)

---

## Configuration

Syrin uses a single configuration file:

```bash
.syrin/config.yaml
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

## Links

- Documentation: [https://docs.syrin.dev](https://docs.syrin.dev)
- GitHub: [https://github.com/ankan-labs/syrin](https://github.com/ankan-labs/syrin)
- Issues: [https://github.com/ankan-labs/syrin/issues](https://github.com/ankan-labs/syrin/issues)
- npm: [https://www.npmjs.com/package/@ankan-ai/syrin](https://www.npmjs.com/package/@ankan-ai/syrin)

---

## License

ISC License. See LICENSE for details.

Made with ❤️ by **Ankan AI Labs**.
