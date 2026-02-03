---
title: "syrin config"
description: "Manage local and global Syrin configurations"
weight: "3"
---

## Manage Syrin Configuration

Manage both **local (project-specific)** and **global (user-wide)** Syrin configurations with a unified command interface.

`syrin config` provides a complete toolkit for configuration management without manually editing YAML files. It handles the complexity of opaque types, validation, and context detection so you can focus on your MCP server configuration.

## Why This Command Exists

Configuration management in Syrin involves:

- **Opaque types** that require factory functions
- **Context detection** between local and global configs
- **Validation** that must be bypassed during editing
- **Environment variable** coordination across multiple files

Manual editing is error-prone and tedious.

`syrin config` treats configuration as a **first-class operation**, not a file-editing task.

## Usage

```bash
syrin config <subcommand> [options]
```

**Alias:** `syrin cfg`

**Global Options:**

| Flag        | Description                  |
| ----------- | ---------------------------- |
| `--quiet`   | Minimal output (errors only) |
| `--verbose` | Verbose output for debugging |

```bash
# Using alias
syrin cfg list

# Quiet mode
syrin --quiet config set openai.model "gpt-4"
```

## Subcommands

### `syrin config set <key> <value> [--global]`

Set a configuration value in local or global config.

**Purpose**\
Update a single configuration value without opening an editor or understanding the full config structure.

**Examples:**

```bash
# Set local config values
syrin config set openai.model "gpt-4-turbo"
syrin config set claude.api_key "ANTHROPIC_API_KEY"
syrin config set agent_name "MyAgent"

# Set global config values
syrin config set openai.model "gpt-4" --global
syrin config set claude.api_key "ANTHROPIC_API_KEY" --global
syrin config set agent_name "GlobalAgent" --global
```

**Supported Keys:**

- `agent_name` - Agent name (string)
- `<provider>.api_key` - LLM provider API key environment variable name
  - Examples: `openai.api_key`, `claude.api_key`
- `<provider>.model` or `<provider>.model_name` - LLM provider model name
  - Examples: `openai.model`, `claude.model_name`, `ollama.model`

**Behavior:**

- Automatically detects local vs global context if flags are omitted
- Creates provider entries if they don't exist
- Applies factory functions for type safety
- Skips validation during set operations (validation occurs when config is used)

**Options:**

| Flag        | Description                    | Default |
| ----------- | ------------------------------ | ------- |
| `--global`  | Set value in global config     | Auto    |
| `--local`   | Set value in local config      | Auto    |

### `syrin config get <key> [--global]`

Retrieve a configuration value.

**Purpose**\
Quickly inspect configuration values without parsing YAML files.

**Examples:**

```bash
# Get from local config
syrin config get openai.model
syrin config get agent_name
syrin config get claude.api_key

# Get from global config
syrin config get openai.model --global
syrin config get agent_name --global
```

**Behavior:**

- Returns the raw value (environment variable name for API keys, model name for models)
- Exits with code 1 if key is not found
- Automatically detects context if flags are omitted

**Options:**

| Flag        | Description                    | Default |
| ----------- | ------------------------------ | ------- |
| `--global`  | Get value from global config   | Auto    |
| `--local`   | Get value from local config    | Auto    |

### `syrin config list [--global]`

List all configuration values in a readable format.

**Purpose**\
Get a quick overview of all configured settings without opening files.

**Examples:**

```bash
# List local config
syrin config list

# List global config
syrin config list --global
```

**Output Format:**

```txt
Agent Name: MyAgent
LLM Providers:
  openai:
    API Key: OPENAI_API_KEY
    Model: gpt-4-turbo
    Default: true
  claude:
    API Key: ANTHROPIC_API_KEY
    Model: claude-3-5-sonnet-20241022
    Default: false
```

**Options:**

| Flag        | Description                    | Default |
| ----------- | ------------------------------ | ------- |
| `--global`  | List global config             | Auto    |
| `--local`   | List local config              | Auto    |

### `syrin config show [--global]`

Display the full configuration file as YAML.

**Purpose**\
View the complete configuration structure, useful for understanding the full config state.

**Examples:**

```bash
# Show local config
syrin config show

# Show global config
syrin config show --global
```

**Note:** This is currently an alias for `syrin config list` but may display raw YAML in future versions.

**Options:**

| Flag        | Description                    | Default |
| ----------- | ------------------------------ | ------- |
| `--global`  | Show global config             | Auto    |
| `--local`   | Show local config              | Auto    |

### `syrin config edit [--global]`

Open the configuration file in your system editor.

**Purpose**\
Edit the full configuration file when you need to make multiple changes or understand the complete structure.

**Examples:**

```bash
# Edit local config
syrin config edit

# Edit global config
syrin config edit --global
```

**Editor Selection:**

The command respects your environment:

1. `EDITOR` environment variable (highest priority)
2. `VISUAL` environment variable
3. Platform default:
   - `nano` on Unix/macOS
   - `notepad` on Windows

**Behavior:**

- Creates the config file if it doesn't exist
- Opens the file in your editor
- Validates the file after you save and close
- Suggests running `syrin doctor` to validate changes

**Options:**

| Flag        | Description                    | Default |
| ----------- | ------------------------------ | ------- |
| `--global`  | Edit global config             | Auto    |
| `--local`   | Edit local config              | Auto    |

### `syrin config edit-env [--global]`

Open the environment file (`.env`) in your system editor.

**Purpose**\
Manage API keys and sensitive credentials in a dedicated environment file.

**Examples:**

```bash
# Edit local .env
syrin config edit-env

# Edit global .env (~/.syrin/.env)
syrin config edit-env --global
```

**File Locations:**

- **Local:** `./.env` (project root)
- **Global:** `~/.syrin/.env` (user home directory)

**Security:**

- File permissions are automatically set to `600` (read/write owner only)
- Files are created with secure permissions if they don't exist
- Never commit `.env` files to version control

**Template:**

When creating a new `.env` file, a template is provided with:

- Comments explaining usage
- Example variable names
- Security warnings

**Options:**

| Flag        | Description                    | Default |
| ----------- | ------------------------------ | ------- |
| `--global`  | Edit global .env               | Auto    |
| `--local`   | Edit local .env                | Auto    |

### `syrin config set-default <provider> [--global]`

Set the default LLM provider.

**Purpose**\
Change which LLM provider is used by default when multiple providers are configured.

**Examples:**

```bash
# Set default in local config
syrin config set-default claude

# Set default in global config
syrin config set-default openai --global
```

**Behavior:**

- Sets the specified provider as default
- Automatically sets all other providers to non-default
- Validates that the provider exists in config
- Only one provider can be default at a time

**Options:**

| Flag        | Description                    | Default |
| ----------- | ------------------------------ | ------- |
| `--global`  | Set default in global config   | Auto    |
| `--local`   | Set default in local config    | Auto    |

### `syrin config remove <provider> [--global]`

Remove an LLM provider from configuration.

**Purpose**\
Remove a provider you no longer need, cleaning up your configuration.

**Examples:**

```bash
# Remove from local config
syrin config remove claude

# Remove from global config
syrin config remove ollama --global
```

**Behavior:**

- Removes the provider from the config
- If removing the default provider, automatically sets another provider as default
- Cannot remove the last remaining provider (at least one is required)
- Validates that the provider exists before removal

**Restrictions:**

- Cannot remove the last LLM provider
- If removing the default provider, another provider is automatically set as default

**Options:**

| Flag        | Description                    | Default |
| ----------- | ------------------------------ | ------- |
| `--global`  | Remove from global config      | Auto    |
| `--local`   | Remove from local config       | Auto    |

## Context Detection

When `--global` or `--local` flags are omitted, `syrin config` automatically detects the appropriate context:

1. **Explicit flags** (highest priority)
   - `--global` → use global config
   - `--local` → use local config

2. **Auto-detection** (when no flags)
   - If `syrin.yaml` exists in current directory → use local config
   - Else if `~/.syrin/syrin.yaml` exists → use global config
   - Else → error (no config found)

This allows you to work seamlessly across projects without constantly specifying flags.

## Global Configuration

Global configuration enables **Syrin to work from any directory** without requiring a local `syrin.yaml` file.

### When Global Config is Used

Global config is automatically used when:

1. No local `syrin.yaml` exists in the current directory
2. You explicitly use the `--global` flag

### Global Config Structure

Global config is stored in `~/.syrin/syrin.yaml` and has a simplified structure:

```yaml
version: "1.0"
project_name: GlobalSyrin
agent_name: YourAgentName
llm:
  openai:
    API_KEY: OPENAI_API_KEY
    MODEL_NAME: gpt-4
    default: true
  claude:
    API_KEY: ANTHROPIC_API_KEY
    MODEL_NAME: claude-3-5-sonnet-20241022
    default: false
```

**Key Differences from Local Config:**

- No `transport`, `mcp_url`, or `script` fields
- `project_name` is always `GlobalSyrin`
- Focuses only on LLM provider configuration

### Using Global Config with `syrin dev`

When using global config, you must provide transport details via CLI flags:

```bash
# HTTP transport
syrin dev --exec --transport http --url http://localhost:8000/mcp

# stdio transport
syrin dev --exec --transport stdio --script "python server.py"
```

This allows quick testing from any directory without initializing a project.

### When to Use Global Config

- **Quick testing** from any directory
- **Shared API keys** across multiple projects
- **Default agent name** for all projects
- **Testing MCP servers** without project initialization
- **Personal development** workflows

## Configuration Precedence

When both local and global configs exist, values are merged with clear precedence:

1. **CLI Flags** (highest priority)
   - Override everything
   - Used for transport/URL/script when using global config

2. **Local `syrin.yaml`**
   - Project-specific settings
   - Overrides global for common providers

3. **Global `~/.syrin/syrin.yaml`**
   - User-wide defaults
   - Providers not in local config are still included

4. **Defaults** (lowest priority)
   - Fallback values when nothing is configured

**LLM Provider Merging:**

- Local provider settings override global for the same provider
- Global providers not present locally are still included
- Default provider is determined by local config if present, else global

## Environment Variables

API keys and model names can be set in multiple locations with clear precedence.

### Resolution Order

1. **`process.env`** (highest priority)
   - System environment variables
   - Set in current shell session

2. **Global `.env`** (`~/.syrin/.env`)
   - User-wide credentials
   - Shared across all projects

3. **Local `.env`** (`./.env`)
   - Project-specific credentials
   - Overrides global for same variable

### Environment Variable Names

**OpenAI:**
- `OPENAI_API_KEY` - API key
- `OPENAI_MODEL` - Model name

**Claude:**
- `ANTHROPIC_API_KEY` - API key
- `ANTHROPIC_MODEL` - Model name

**Ollama:**
- `OLLAMA_MODEL_NAME` - Model name (no API key needed)

### Example `.env` File

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-abc123...
OPENAI_MODEL=gpt-4-turbo

# Claude Configuration
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Ollama Configuration
OLLAMA_MODEL_NAME=llama2
```

### Security Best Practices

- **Never commit `.env` files** to version control
- Use **environment variable names** in config (not direct values)
- Set **file permissions to 600** (read/write owner only)
- Use **global `.env`** for shared credentials
- Use **local `.env`** for project-specific credentials

## Common Workflows

### Setting Up Global Config

```bash
# 1. Interactive setup
syrin init --global

# 2. Edit environment file
syrin config edit-env --global

# 3. Validate setup
syrin doctor
```

### Quick Testing from Any Directory

```bash
# 1. Ensure global config exists
syrin config list --global

# 2. Run with transport flags
syrin dev --transport http --url http://localhost:8000/mcp
```

### Managing Multiple Projects

```bash
# Project A: Use local config
cd project-a
syrin config set openai.model "gpt-4-turbo"
syrin config set claude.model "claude-3-opus"

# Project B: Use local config with different settings
cd project-b
syrin config set openai.model "gpt-3.5-turbo"
syrin config set-default claude

# Global: Shared defaults
syrin config set openai.model "gpt-4" --global
```

### Switching Default Provider

```bash
# Check current default
syrin config list

# Switch to Claude
syrin config set-default claude

# Verify change
syrin config list
```

## Error Handling

### No Config Found

**Error:**
```
No config found. Create a local config with `syrin init` or set up global config with `syrin init --global`.
```

**Resolution:**
- Create local config: `syrin init`
- Create global config: `syrin init --global`

### Invalid Key

**Error:**
```
Cannot set "invalid.key" in global config. Global config only supports "agent_name" and LLM provider settings.
```

**Resolution:**
- Use valid keys: `agent_name`, `<provider>.api_key`, `<provider>.model`
- For local config, use `syrin init` to set transport/URL/script

### Provider Not Found

**Error:**
```
LLM provider "invalid" not found in local config.
```

**Resolution:**
- Check available providers: `syrin config list`
- Add provider first: `syrin config set invalid.model "model-name"`

### Cannot Remove Last Provider

**Error:**
```
Cannot remove the last LLM provider. At least one provider is required.
```

**Resolution:**
- Add another provider first: `syrin config set <provider>.model "model-name"`
- Then remove the unwanted provider

## Exit Codes

| Code | Meaning                                    |
| ---- | ------------------------------------------ |
| `0`  | Command completed successfully              |
| `1`  | Error occurred (invalid key, missing config, etc.) |

Exit codes are stable and suitable for scripting and CI pipelines.

## When You Should Use This

- **After `syrin init`** - Fine-tune configuration
- **Before `syrin dev`** - Ensure correct settings
- **When switching projects** - Manage multiple configs
- **Setting up global defaults** - Personal development workflow
- **Quick configuration changes** - Without opening editors
- **Managing API keys** - Secure credential management

## Relationship to Other Commands

- **`syrin init`** - Creates local config structure
- **`syrin init --global`** - Creates global config structure
- **`syrin config`** - Manages existing configs
- **`syrin doctor`** - Validates configuration correctness
- **`syrin dev`** - Uses configuration at runtime

Configuration management is a prerequisite for reliable execution.

## See Also

- [syrin init](/commands/init/) - Initialize a new Syrin project
- [syrin doctor](/commands/doctor/) - Validate configuration
- [Configuration Guide](/configuration/) - Full configuration reference
