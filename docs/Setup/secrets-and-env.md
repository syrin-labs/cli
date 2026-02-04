---
title: 'Secrets & Environment Variables'
description: 'How Syrin separates configuration from secrets using syrin.yaml and .env files'
weight: 3
---

## The Two-File Tango: Why Your Secrets Stay Safe

Syrin uses a deliberate two-file pattern to keep your configuration safe to commit while your secrets stay private.

## The Core Idea

```bash
syrin.yaml (safe to commit)           .env (NEVER commit)
--------------------------            --------------------
API_KEY: "OPENAI_API_KEY"     --->    OPENAI_API_KEY=sk-proj-abc123...
MODEL_NAME: "OPENAI_MODEL"   --->    OPENAI_MODEL=gpt-4-turbo
```

- `syrin.yaml` stores **environment variable names** (references)
- `.env` stores **actual secret values**
- At runtime, Syrin reads the name from `syrin.yaml`, then looks up the value from `.env`

This means `syrin.yaml` can be committed to git. Your API keys never appear in version control.

## Why This Design?

1. **Git safety** -- `syrin.yaml` contains zero sensitive data. Push it to any repo without worry.
2. **Multi-environment** -- Same `syrin.yaml`, different `.env` files for dev/staging/prod.
3. **Team-friendly** -- Everyone shares the same config structure, uses their own API keys.

## How It Works at Runtime

When you run `syrin dev --exec`, here is what happens:

1. Syrin reads `syrin.yaml` and finds `API_KEY: "OPENAI_API_KEY"`
2. It treats `"OPENAI_API_KEY"` as an **environment variable name**
3. It resolves the actual value using this priority order:
   - **Shell environment** (`process.env`) -- highest priority
   - **Local `.env`** (`./.env` in your project) -- checked second
   - **Global `.env`** (`~/.syrin/.env`) -- fallback

Syrin enforces this pattern at the schema level. The value in `syrin.yaml` **must** be `UPPER_SNAKE_CASE` (like `OPENAI_API_KEY`). If you accidentally put an actual API key (like `sk-proj-abc123`), Syrin will reject it with this error:

```
API_KEY and MODEL_NAME must be env var names from .env
(e.g. OPENAI_API_KEY, OPENAI_MODEL_NAME), not direct values.
```

## The Two .env Locations

### Global: `~/.syrin/.env`

Shared across all projects. Created with `syrin config edit-env --global`.

```bash
# ~/.syrin/.env
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4-turbo
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-20250514
OLLAMA_MODEL_NAME=llama3
```

### Local: `./.env`

Project-specific. Overrides global values for the same variable. Created with `syrin config edit-env`.

```bash
# ./.env (in your project root)
OPENAI_API_KEY=sk-proj-project-specific-key
OPENAI_MODEL=gpt-4o
```

### Resolution Order

When both files exist:

```
1. Shell environment (export OPENAI_API_KEY=...)     <-- wins
2. Local .env (./.env)                               <-- checked second
3. Global .env (~/.syrin/.env)                       <-- fallback
```

If you have `OPENAI_API_KEY` in both global and local `.env`, the **local** value wins.

## Complete Example

Here is a full working setup with three files:

### `syrin.yaml` (committed to git)

```yaml
version: '1.0'
project_name: 'my-mcp-project'
agent_name: 'dev-agent'
transport: 'http'
url: 'http://localhost:8000/mcp'

llm:
  openai:
    API_KEY: 'OPENAI_API_KEY' # <-- This is the env var NAME
    MODEL_NAME: 'OPENAI_MODEL' # <-- Not the actual model string
    default: true
  claude:
    API_KEY: 'ANTHROPIC_API_KEY'
    MODEL_NAME: 'ANTHROPIC_MODEL'
    default: false
```

### `~/.syrin/.env` (global, never committed)

```bash
# Shared API keys across all projects
OPENAI_API_KEY=sk-proj-abc123def456...
OPENAI_MODEL=gpt-4-turbo
ANTHROPIC_API_KEY=sk-ant-api03-xyz789...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

### `./.env` (local, never committed)

```bash
# Project-specific overrides
OPENAI_MODEL=gpt-4o   # Override global model for this project
```

**Result:** This project uses `gpt-4o` (local override) with the global API key.

## Setting Up Your .env Files

### Method 1: Using `syrin config edit-env` (recommended)

```bash
# Edit local .env (opens in your $EDITOR)
syrin config edit-env

# Edit global .env
syrin config edit-env --global
```

This creates the file if it does not exist and opens it in your editor with a template.

### Method 2: Manual Creation

**Global .env:**

```bash
mkdir -p ~/.syrin
cat > ~/.syrin/.env << 'EOF'
# Syrin Global Environment Variables
# These are shared across all projects

# OpenAI
OPENAI_API_KEY=your-openai-key-here
OPENAI_MODEL=gpt-4-turbo

# Anthropic (Claude)
ANTHROPIC_API_KEY=your-anthropic-key-here
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Ollama (local, no API key needed)
OLLAMA_MODEL_NAME=llama3
EOF
```

**Local .env:**

```bash
cat > .env << 'EOF'
# Project-specific environment variables
OPENAI_API_KEY=your-project-specific-key
OPENAI_MODEL=gpt-4o
EOF
```

### Method 3: Shell Environment (ephemeral)

```bash
export OPENAI_API_KEY=sk-proj-abc123...
export OPENAI_MODEL=gpt-4-turbo
syrin dev --exec
```

Values only last for the current shell session.

## Managing Config with `syrin config`

The `syrin config` commands manage `syrin.yaml` -- they set the **env var name**, not the secret value.

```bash
# Set which env var name to use for OpenAI API key
syrin config set openai.api_key "MY_CUSTOM_API_KEY_VAR"
# Result in syrin.yaml: API_KEY: "MY_CUSTOM_API_KEY_VAR"
# You would then set MY_CUSTOM_API_KEY_VAR=sk-proj-... in your .env

# Set which env var name to use for model
syrin config set openai.model "MY_OPENAI_MODEL"
# Result in syrin.yaml: MODEL_NAME: "MY_OPENAI_MODEL"

# View current config (shows env var names, not secrets)
syrin config list

# Get a specific value
syrin config get openai.api_key
# Output: OPENAI_API_KEY

# Change default provider
syrin config set-default claude

# All commands support --global flag
syrin config set openai.model "OPENAI_MODEL" --global
syrin config list --global
```

## Common Mistakes

| Mistake                                                                | What Happens                                              | Fix                                                       |
| ---------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| Put actual API key in `syrin.yaml` (e.g., `API_KEY: "sk-proj-abc..."`) | Schema validation rejects it -- not UPPER_SNAKE_CASE      | Use the env var name instead: `API_KEY: "OPENAI_API_KEY"` |
| Forgot to create `.env` after `syrin init`                             | `syrin dev --exec` fails with "OPENAI_API_KEY is not set" | Run `syrin config edit-env` and add your keys             |
| Wrong env var name in `syrin.yaml`                                     | Runtime error: "MY_TYPO_KEY is not set"                   | Check the name matches your `.env` file exactly           |
| Committed `.env` to git                                                | Secrets exposed in version control                        | Add `.env` to `.gitignore`, rotate your keys              |
| Different env var name in yaml vs .env                                 | Key resolves to empty/missing                             | Ensure the name in `syrin.yaml` matches the key in `.env` |

## Validation

Run `syrin doctor` to verify everything is connected:

```bash
syrin doctor
```

It checks:

- `syrin.yaml` exists and is valid
- Each env var name in `syrin.yaml` resolves to a value
- `.env` file exists (warns if missing)
- LLM provider can be instantiated

## CI/CD Environments

In CI, there is no `.env` file. Set environment variables directly:

**GitHub Actions:**

```yaml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  OPENAI_MODEL: gpt-4-turbo
```

**GitLab CI:**

```yaml
variables:
  OPENAI_API_KEY: $OPENAI_API_KEY # Set in GitLab CI/CD Variables
  OPENAI_MODEL: 'gpt-4-turbo'
```

Syrin checks `process.env` first, so CI environment variables work without any `.env` file.

## See Also

- [Global Setup](/setup/global-setup/) -- Set up Syrin for use from any directory
- [Local Setup](/setup/local-setup/) -- Set up Syrin for a specific project
- [syrin config](/commands/syrin-config/) -- Full config command reference
- [syrin doctor](/commands/syrin-doctor/) -- Validate your configuration
