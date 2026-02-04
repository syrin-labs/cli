---
title: 'Interactive Dev Session'
description: 'See exactly what your LLM proposes when it interacts with your MCP server'
weight: 2
---

## Watch Your LLM Think Out Loud

`syrin dev` opens an interactive session where you can see every tool call your LLM proposes, inspect parameters before they execute, and step through tool chains.

## What You Need

- Global or local init completed ([Setup](/setup/))
- LLM provider configured with valid API key
- An MCP server (running or script-based)

## Start a Session

![syrin dev demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-dev/dev.gif)

### Preview Mode (default -- safe)

```bash
syrin dev
```

The LLM proposes tool calls, but **nothing executes**. You see what the LLM wants to do without any side effects.

### Execute Mode

```bash
syrin dev --exec
```

Tool calls are actually executed against your MCP server. Use this when you are ready to test real behavior.

### With Global Config

When using global config, provide transport details:

```bash
# HTTP
syrin dev --exec --transport http --url http://localhost:8000/mcp

# stdio
syrin dev --exec --transport stdio --script "python server.py"
```

## Chat Commands

Inside the session, these commands are available:

| Command      | What It Does                       |
| ------------ | ---------------------------------- |
| `/tools`     | List available MCP tools           |
| `/history`   | Show conversation history          |
| `/save-json` | Save last tool result as JSON file |
| `/clear`     | Clear conversation history         |
| `/exit`      | End the session                    |

Type natural language to interact with your MCP server. For example:

```
> What is the weather in San Francisco?
```

The LLM will propose a tool call. In execute mode, Syrin runs it and shows the result. In preview mode, you see the proposed call without execution.

## Compare LLM Providers

Override the default provider per session:

```bash
# Use OpenAI
syrin dev --exec --llm openai

# Use Claude
syrin dev --exec --llm claude

# Use local Ollama
syrin dev --exec --llm ollama
```

This lets you compare how different models interact with the same tools.

## Save Events for Debugging

Record every event (tool proposals, executions, validation results) to disk:

```bash
syrin dev --exec --save-events
```

Events are written to `.syrin/events/<session-id>.jsonl`. Each line is a JSON object with a timestamp, event type, and payload.

## Common Issues

### "OPENAI_API_KEY is not set"

Your `.env` file is missing or does not contain the key. Fix:

```bash
syrin config edit-env          # local
syrin config edit-env --global  # or global
```

Add the missing key. See [Secrets & Environment Variables](/setup/secrets-and-env/).

### "No config found"

You need to run `syrin init` (local) or `syrin init --global` first. See [Setup](/setup/).

### "Connection refused" or "ECONNREFUSED"

Your MCP server is not running. Start it before running `syrin dev`:

```bash
# For HTTP transport, start the server first
python server.py --mode http --port 8000

# Then in another terminal
syrin dev --exec
```

For stdio transport, Syrin starts the server automatically using the `script` in your config.

### "Model not found"

The model name in your `.env` does not match what your provider supports. Check your provider's documentation for valid model names and update your `.env`.

## See Also

- [Setup](/setup/) -- Configure Syrin for dev mode
- [Secrets & Environment Variables](/setup/secrets-and-env/) -- Fix API key issues
- [syrin dev command reference](/commands/syrin-dev/) -- All flags and options
