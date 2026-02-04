---
title: 'Local Setup'
description: 'Initialize Syrin in your project for full configuration and tool contract testing'
weight: 2
---

## Make This Project Bulletproof

Local setup gives you full Syrin configuration inside your project: transport settings, LLM providers, tool contracts, and event tracking -- all version-controlled.

## What It Creates

```bash
my-project/
├── syrin.yaml         # Project config (transport, LLM settings)
├── .env               # Project secrets (API keys) -- gitignored
└── .syrin/            # Runtime data -- gitignored
    ├── events/        # Execution event logs
    ├── data/          # Exported tool results
    └── .dev-history   # Chat history
```

## Step 1: Run Init

```bash
cd my-mcp-project
syrin init
```

![syrin init demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-init/init.gif)

You will be asked:

1. **Project name** -- Name for your project
2. **Agent name** -- Label for your agent
3. **Transport type** -- `stdio` (Syrin spawns the server) or `http` (connect to running server)
4. **MCP URL** -- (HTTP only) Server URL, e.g., `http://localhost:8000/mcp`
5. **Script command** -- Command to start your MCP server, e.g., `python server.py`
6. **LLM providers** -- Select which providers to enable
7. **For each provider** -- API key env var name and model env var name (accept the defaults)
8. **Default provider** -- Which provider to use by default

**Accept the defaults for env var names.** The actual API keys go in `.env` (Step 2).

## Step 2: Set Up Your Environment

### If You Already Have Global Config

Your global `~/.syrin/.env` keys are automatically inherited. You can skip this step unless you need project-specific overrides.

To override a global key for this project:

```bash
syrin config edit-env
```

Add only the values you want to override:

```bash
# .env -- overrides global values for this project only
OPENAI_MODEL=gpt-4o
```

### If You Do NOT Have Global Config

You must create a local `.env` with your API keys:

```bash
syrin config edit-env
```

Add your keys:

```bash
# .env
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4-turbo

# Or for Claude
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

## Step 3: Verify

```bash
syrin doctor
```

Green checks mean everything is configured. If something is missing, `syrin doctor` tells you exactly what to fix.

## The Generated `syrin.yaml`

Here is a complete annotated example:

```yaml
version: '1.0'

project_name: 'my-mcp-project'
agent_name: 'dev-agent'

# Transport: "stdio" (Syrin spawns server) or "http" (connect to running server)
transport: 'stdio'

# For stdio: command to start your MCP server
script: 'python server.py'

# For http: URL of your running MCP server
# url: "http://localhost:8000/mcp"

llm:
  openai:
    API_KEY: 'OPENAI_API_KEY' # Env var NAME -- not the actual key
    MODEL_NAME: 'OPENAI_MODEL' # Env var NAME -- not "gpt-4-turbo"
    default: true
  claude:
    API_KEY: 'ANTHROPIC_API_KEY'
    MODEL_NAME: 'ANTHROPIC_MODEL'
    default: false
```

The `API_KEY` and `MODEL_NAME` values are **environment variable names**, not secrets. The actual values come from your `.env` file. See [Secrets & Environment Variables](/setup/secrets-and-env/) for why.

## Quick Workflow (Copy-Paste)

```bash
# Full setup from scratch
cd my-mcp-project
syrin init
syrin config edit-env        # Add your API keys
syrin doctor                 # Verify everything works

# Start using Syrin
syrin list                   # See available tools
syrin analyse                # Check tool contracts
syrin dev --exec             # Interactive dev session with execution
```

## Adding Tool Contracts

To use `syrin test`, create contract files in a `tools/` directory:

```bash
mkdir tools
```

Create `tools/your-tool-name.yaml`:

```yaml
version: 1
tool: your_tool_name

contract:
  input_schema: YourInputType
  output_schema: YourOutputType

guarantees:
  side_effects: none
  max_output_size: 10kb
```

Then run:

```bash
syrin test                      # Test all tools
syrin test --tool your_tool     # Test one tool
```

See [Test Your MCP Tools](/guides/test-your-mcp-tools/) for a complete walkthrough.

## Git Safety

**Commit these:**

- `syrin.yaml` -- Safe, contains no secrets
- `tools/*.yaml` -- Tool contracts

**Gitignore these:**

- `.env` -- Contains actual API keys
- `.syrin/` -- Runtime data (events, history)

Your `.gitignore` should include:

```
.env
.env.*
.syrin/events
.syrin/.dev-history
.syrin/data
```

`syrin init` adds these entries automatically.

## See Also

- [Global Setup](/setup/global-setup/) -- Set up Syrin for use from any directory
- [Secrets & Environment Variables](/setup/secrets-and-env/) -- How the env pattern works
- [Interactive Dev Session](/guides/interactive-dev-session/) -- Using `syrin dev`
