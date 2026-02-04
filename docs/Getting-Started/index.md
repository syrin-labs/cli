---
title: 'Getting Started'
description: 'Install Syrin and inspect your first MCP server in under a minute'
weight: 1
---

## Getting Started with Syrin

## What Is This?

**MCP** (Model Context Protocol) is how AI agents call external tools -- read files, query databases, hit APIs. If you are building or using an MCP server, your AI agent depends on those tool definitions being correct.

**Syrin** is a CLI that inspects, tests, and validates MCP tools. It catches problems like:

- Tool descriptions too vague for the LLM to pick the right one
- Missing or incorrect parameter schemas
- Tools that silently write to disk when they should not
- Output that explodes past what an LLM context can handle
- Circular dependencies between tools

Think of it as a **linter + test runner for MCP servers**. You point it at a server, it tells you what is broken.

## See It in Action

![syrin analyse demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-analyse/analyse.gif)

## Try It Right Now

You do not need an MCP server of your own. Use the included example:

```bash
git clone https://github.com/Syrin-Labs/cli.git
cd cli/examples/demo-mcp-py
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python server.py --mode http --port 8000 &
```

Now point Syrin at it:

```bash
# List what tools the server exposes
npx @syrin/cli list tools --transport http --url http://localhost:8000/mcp

# Analyse tool contracts for issues
npx @syrin/cli analyse --transport http --url http://localhost:8000/mcp
```

No API keys. No config files. No project setup.

Already have your own MCP server running? Point Syrin at it directly:

```bash
npx @syrin/cli analyse --transport http --url http://localhost:8000/mcp
```

If your server uses stdio instead of HTTP:

```bash
npx @syrin/cli analyse --transport stdio --script "python server.py"
```

## Install Globally

If you plan to use Syrin regularly:

```bash
npm install -g @syrin/cli
syrin --version
```

Now you can run `syrin` directly instead of `npx @syrin/cli`.

**Requirements:** Node.js >= 20.12 and npm >= 9. See [Installation](/getting-started/installation/) for all install options.

## What Can Syrin Do?

| Command         | What it does                                                              |
| --------------- | ------------------------------------------------------------------------- |
| `syrin list`    | Show what tools, resources, and prompts a server exposes                  |
| `syrin analyse` | Static analysis -- catch contract issues without executing tools          |
| `syrin test`    | Run tools in a sandbox and validate behavior against contracts            |
| `syrin dev`     | Interactive session -- watch an LLM interact with your tools in real time |

## What Do I Do Next?

| Goal                                  | Where to go                                                     |
| ------------------------------------- | --------------------------------------------------------------- |
| Inspect a server without any setup    | [Quick Test Without Config](/guides/quick-test-without-config/) |
| Set up Syrin for a project            | [Local Setup](/setup/local-setup/)                              |
| Use Syrin across all projects         | [Global Setup](/setup/global-setup/)                            |
| Watch an LLM interact with your tools | [Interactive Dev Session](/guides/interactive-dev-session/)     |
| Write contracts and test tools        | [Test Your MCP Tools](/guides/test-your-mcp-tools/)             |
| Add Syrin to CI                       | [Add Syrin to CI](/guides/add-syrin-to-ci/)                     |

## Learn More

- [What Is Syrin?](/getting-started/what-is-syrin/) -- The execution model and what Syrin governs
- [Why Syrin?](/getting-started/why-syrin/) -- The failure modes Syrin exists to solve
- [Setup](/setup/) -- Choose the right setup path for your workflow
