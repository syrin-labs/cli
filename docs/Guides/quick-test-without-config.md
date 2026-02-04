---
title: 'Quick Test Without Config'
description: 'Use Syrin to inspect and analyse any MCP server without creating a project'
weight: 1
---

## Thirty Seconds or Your Money Back

You do not need `syrin init` to inspect an MCP server. Point Syrin at any running server and go.

## Prerequisites

- Node.js >= 20.12
- A running MCP server (HTTP) or an MCP server script (stdio)

No API keys needed. No config files needed.

## List Available Tools

See what tools, resources, and prompts a server exposes:

```bash
npx @syrin/cli list --transport http --url http://localhost:8000/mcp
```

![syrin list demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-list/list.gif)

## Analyse Tool Contracts

Run static analysis to catch issues in tool definitions:

```bash
npx @syrin/cli analyse --transport http --url http://localhost:8000/mcp
```

![syrin analyse demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-analyse/analyse.gif)

This checks for missing descriptions, vague parameters, overlapping tools, schema mismatches, and more -- without executing anything.

## Test Connection

Verify that Syrin can connect to the server and the MCP protocol handshake works:

```bash
npx @syrin/cli test --connection --transport http --url http://localhost:8000/mcp
```

![syrin test connection demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-test/test_connection.gif)

## Using stdio Transport

If your MCP server is a script (not a running HTTP server), use stdio transport:

```bash
# List tools
npx @syrin/cli list --transport stdio --script "python server.py"

# Analyse
npx @syrin/cli analyse --transport stdio --script "python server.py"
```

Syrin spawns the server process, communicates over stdin/stdout, and shuts it down when done.

## Pass Environment Variables to Your Server

If your MCP server needs environment variables:

```bash
npx @syrin/cli list --transport stdio --script "python server.py" --env "DB_HOST=localhost" --env "DB_PORT=5432"
```

## What You Cannot Do Without Config

These commands require `syrin init` (global or local):

| Command                           | Why                                                |
| --------------------------------- | -------------------------------------------------- |
| `syrin dev --exec`                | Needs LLM configuration (API keys, model name)     |
| `syrin test` (contract tests)     | Needs `syrin.yaml` + `tools/*.yaml` contract files |
| `syrin analyse` (without `--url`) | Needs transport config in `syrin.yaml`             |

Ready to set up? See [Setup](/setup/).

## Try With the Example Server

Want to try but do not have an MCP server? Use the included example:

```bash
git clone https://github.com/Syrin-Labs/cli.git
cd cli/examples/demo-mcp-py
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python server.py --mode http --port 8000 &

# Now try Syrin
npx @syrin/cli list --transport http --url http://localhost:8000/mcp
npx @syrin/cli analyse --transport http --url http://localhost:8000/mcp
```

## See Also

- [Setup](/setup/) -- Choose your setup path
- [Global Setup](/setup/global-setup/) -- For `syrin dev` from anywhere
- [Interactive Dev Session](/guides/interactive-dev-session/) -- Using `syrin dev --exec`
