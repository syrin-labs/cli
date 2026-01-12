---
title: "LLM Providers"
description: "How Syrin configures and governs LLM providers for MCP execution"
weight: "3"
---

# Do My Job

Syrin supports multiple LLM providers for interacting with MCP servers.\
LLMs in Syrin are **proposal engines**, not execution authorities.

Every provider must be explicitly configured.\
If a provider is not declared, it cannot participate in execution.

This page explains how to configure, select, and reason about LLM providers in Syrin.

## Supported Providers

Syrin currently supports:

- **OpenAI** – GPT-4, GPT-3.5, and related models
- **Claude (Anthropic)** – Claude 3 family
- **Ollama** – Local models via Ollama

Each provider is configured independently and can be switched at runtime.

## How Syrin Uses LLMs

LLMs in Syrin:

- Propose actions and tool calls
- Generate natural language output
- Do not execute tools directly

All proposals pass through the Syrin runtime, which validates and governs execution.

This separation is intentional.

## OpenAI

### Configuration

```yaml
llm:
  openai:
    API_KEY: "OPENAI_API_KEY"
    MODEL_NAME: "OPENAI_MODEL"
    default: true
```

The values reference environment variable names, not secrets.

### Required Environment Variables

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4"
```

### Common Models

- `gpt-4`
- `gpt-4-turbo`
- `gpt-3.5-turbo`
- `gpt-3.5-turbo-16k`

### Usage

Use the default provider:

```bash
syrin dev
```

Override explicitly:

```bash
syrin dev --llm openai
```

## Claude (Anthropic)

### Configuration

```yaml
llm:
  claude:
    API_KEY: "ANTHROPIC_API_KEY"
    MODEL_NAME: "ANTHROPIC_MODEL"
    default: false
```

### Required Environment Variables

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
```

### Common Models

- `claude-3-5-sonnet-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

### Usage

```bash
syrin dev --llm claude
```

## Ollama

Ollama allows you to run models locally.

### Configuration Using Environment Variable

```yaml
llm:
  ollama:
    MODEL_NAME: "OLLAMA_MODEL_NAME"
    default: false
```

Environment variable:

```bash
export OLLAMA_MODEL_NAME="llama2"
```

### Configuration Using Direct Value

```yaml
llm:
  ollama:
    MODEL_NAME: "llama2"
    default: false
```

No environment variable is required when using a direct value.

### Common Models

Install models using Ollama:

```bash
ollama pull llama2
ollama pull mistral
ollama pull codellama
```

Frequently used models:

- `llama2`
- `mistral`
- `codellama`
- `phi`

### Requirements

- Ollama must be installed
- Ollama service must be running
- The model must be available locally

### Usage

```bash
syrin dev --llm ollama
```

## Multiple Providers

You may configure multiple providers simultaneously:

```yaml
llm:
  openai:
    API_KEY: "OPENAI_API_KEY"
    MODEL_NAME: "OPENAI_MODEL"
    default: true

  claude:
    API_KEY: "ANTHROPIC_API_KEY"
    MODEL_NAME: "ANTHROPIC_MODEL"
    default: false

  ollama:
    MODEL_NAME: "llama2"
    default: false
```

Switch providers at runtime:

```bash
syrin dev --llm openai
syrin dev --llm claude
syrin dev --llm ollama
```

## Default Provider

Exactly one provider should be marked as default:

```yaml
llm:
  openai:
    default: true
```

If no provider is marked as default, Syrin uses the first declared provider.

Ambiguous defaults are treated as configuration errors.

## Provider Selection Rules

Provider selection follows a strict order:

1. Command-line override (`--llm`)
2. Provider marked as default
3. First declared provider

Syrin does not guess.

## API Keys and Security

### Recommended Practices

- Never commit API keys to version control
- Always use environment variables for secrets
- Add `.env` files to `.gitignore`
- Use encrypted secrets in CI/CD systems
- Rotate keys regularly

### Example `.env` File

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

## Validation

Validate LLM configuration using:

```bash
syrin doctor
```

This checks:

- Provider definitions
- Required environment variables
- Default provider rules
- Provider availability

Execution will not proceed if validation fails.

## Common Issues

### API Key Not Found

Meaning\
The referenced environment variable is not set.

Resolution\
Export the variable or define it in `.env`.

### Invalid API Key

Meaning\
The key is incorrect or expired.

Resolution\
Generate a new key and update the environment.

### Model Not Found

Meaning\
The model name is invalid or unavailable.

Resolution\
Verify model availability and spelling.

### Ollama Connection Failed

Meaning\
Ollama service is not reachable.

Resolution\
Ensure Ollama is running and the model is installed.

## See Also

- [Configuration](/configuration/)
- [Transport Types](/configuration/transport/)
- [syrin dev](/commands/dev/)
- [syrin doctor](/commands/doctor/)
