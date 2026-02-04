---
title: 'Global Setup'
description: 'Set up Syrin globally to use from any directory with shared LLM credentials'
weight: 1
---

## One Setup to Rule Them All

Global setup lets you use `syrin dev --exec` from any directory without creating project-specific config files. Your LLM credentials are stored once and shared across all projects.

## What It Creates

```bash
~/.syrin/
├── syrin.yaml    # Global config (LLM provider settings)
└── .env          # Global secrets (API keys)
```

## Step 1: Run Global Init

```bash
syrin init --global
```

![syrin init demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-init/init.gif)

You will be asked:

1. **Agent name** -- A label for your agent (e.g., your name or team name)
2. **LLM providers** -- Select which providers to configure (OpenAI, Claude, Ollama)
3. **For each provider:**
   - **API Key** -- Press Enter to accept the default env var name (e.g., `OPENAI_API_KEY`)
   - **Model Name** -- Press Enter to accept the default env var name (e.g., `OPENAI_MODEL_NAME`)
4. **Default provider** -- Choose which provider to use by default

**Accept the defaults.** The init prompts suggest env var names like `OPENAI_API_KEY`. These are the names Syrin will look up in your `.env` file. You will set the actual values in Step 2.

## Step 2: Set Up Your API Keys

The `syrin.yaml` created in Step 1 contains env var **names**, not actual keys. Now you need to create the `.env` file with actual values.

### Option A: Using `syrin config edit-env` (recommended)

```bash
syrin config edit-env --global
```

This opens `~/.syrin/.env` in your editor. Add your keys:

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-your-actual-key-here
OPENAI_MODEL_NAME=gpt-4-turbo

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
ANTHROPIC_MODEL_NAME=claude-sonnet-4-20250514

# Ollama (no API key needed)
OLLAMA_MODEL_NAME=llama3
```

Save and close.

### Option B: Create Manually

```bash
cat > ~/.syrin/.env << 'EOF'
# OpenAI
OPENAI_API_KEY=sk-proj-your-actual-key-here
OPENAI_MODEL_NAME=gpt-4-turbo

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
ANTHROPIC_MODEL_NAME=claude-sonnet-4-20250514

# Ollama
OLLAMA_MODEL_NAME=llama3
EOF
```

## Step 3: Verify

```bash
syrin doctor
```

You should see green checks for your LLM provider(s) and environment variables.

## What the Files Look Like

### `~/.syrin/syrin.yaml`

```yaml
version: '1.0'
project_name: 'GlobalSyrin'
agent_name: 'your-name'

llm:
  openai:
    API_KEY: 'OPENAI_API_KEY' # Env var NAME, not the actual key
    MODEL_NAME: 'OPENAI_MODEL_NAME' # Env var NAME, not "gpt-4-turbo"
    default: true
  claude:
    API_KEY: 'ANTHROPIC_API_KEY'
    MODEL_NAME: 'ANTHROPIC_MODEL_NAME'
    default: false
```

Notice: `API_KEY: "OPENAI_API_KEY"` is the **name of the environment variable**, not the actual secret. The actual key (`sk-proj-...`) lives in `~/.syrin/.env`. See [Secrets & Environment Variables](/setup/secrets-and-env/) for the full explanation.

### `~/.syrin/.env`

```bash
OPENAI_API_KEY=sk-proj-your-actual-key-here       # Actual secret
OPENAI_MODEL_NAME=gpt-4-turbo                      # Actual model name
```

## Using Global Config

With global config, provide transport details via CLI flags:

```bash
# HTTP transport -- connect to a running MCP server
syrin dev --exec --transport http --url http://localhost:8000/mcp

# stdio transport -- Syrin spawns the MCP server
syrin dev --exec --transport stdio --script "python server.py"

# Analyse without a project
syrin analyse --transport http --url http://localhost:8000/mcp

# List tools
syrin list --transport http --url http://localhost:8000/mcp
```

## What If I Also Have a Local Config?

Local config takes precedence over global config. If a project has its own `syrin.yaml`, Syrin uses that. Global config acts as a fallback for projects without local config.

For LLM providers, both are merged: local providers override global providers with the same name, and global providers not in local config are still available.

## See Also

- [Local Setup](/setup/local-setup/) -- Set up Syrin for a specific project
- [Secrets & Environment Variables](/setup/secrets-and-env/) -- Deep dive into the env pattern
- [syrin config](/commands/syrin-config/) -- Manage configuration from the CLI
