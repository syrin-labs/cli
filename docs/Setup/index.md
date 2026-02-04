---
title: 'Setup'
description: 'Choose your setup path: global, local, or zero-config quick testing'
weight: 2
---

## Setup Is a Spectrum, Not a Ceremony

Not every use of Syrin requires a full project setup. Here is how to decide what you need.

## The Three Paths

### Zero-Config (no setup required)

Run commands directly against any MCP server. No `syrin init`, no config files.

```bash
# Inspect tools
npx @syrin/cli list --transport http --url http://localhost:8000/mcp

# Analyse tool contracts
npx @syrin/cli analyse --transport http --url http://localhost:8000/mcp

# Test connection
npx @syrin/cli test --connection --transport http --url http://localhost:8000/mcp
```

Best for: quick inspection, one-off analysis, evaluating a new MCP server.

### Global Setup

Set up Syrin once and use it from any directory. LLM credentials are shared across projects.

```bash
syrin init --global
syrin config edit-env --global
```

Best for: developers working with multiple MCP servers who want `syrin dev --exec` to work everywhere.

### Local Setup

Full project configuration. Everything in one place, tracked in git.

```bash
cd my-mcp-project
syrin init
syrin config edit-env
```

Best for: production projects that need tool contract testing, CI integration, and team collaboration.

## Which Commands Need What

| Command                               | No Setup | Global Init          | Local Init               |
| ------------------------------------- | -------- | -------------------- | ------------------------ |
| `syrin list --url <url>`              | Yes      | Yes                  | Yes                      |
| `syrin analyse --url <url>`           | Yes      | Yes                  | Yes                      |
| `syrin test --connection --url <url>` | Yes      | Yes                  | Yes                      |
| `syrin dev` (preview mode)            | --       | Yes                  | Yes                      |
| `syrin dev --exec`                    | --       | Yes (needs LLM keys) | Yes (needs LLM keys)     |
| `syrin test` (contract tests)         | --       | --                   | Yes (needs `tools/` dir) |
| `syrin analyse` (from config)         | --       | --                   | Yes                      |

**Key rule:** If you need `syrin dev --exec`, you need LLM configuration (global or local init). If you need contract testing, you need local init.

## Next Steps

- [Quick Test Without Config](/guides/quick-test-without-config/) -- Try Syrin in 30 seconds
- [Global Setup](/setup/global-setup/) -- One-time setup for all projects
- [Local Setup](/setup/local-setup/) -- Full project configuration
- [Secrets & Environment Variables](/setup/secrets-and-env/) -- How `syrin.yaml` and `.env` work together
