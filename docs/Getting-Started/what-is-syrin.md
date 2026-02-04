---
title: 'What Is Syrin?'
description: 'A CLI that validates, tests, and monitors MCP tool execution'
weight: 2
---

## What Is Syrin?

![Syrin Logo Dark Bg](/logo/syrin-logo-dark-bg.png)

Syrin is a **CLI tool that validates and tests MCP servers**. It sits between your LLM and your MCP tools, and answers three questions:

1. Are my tool definitions good enough for an LLM to use correctly?
2. Do my tools actually behave the way their contracts say they do?
3. What happens when an LLM interacts with my tools in real time?

## What It Does, Concretely

### Static Analysis (`syrin analyse`)

Syrin connects to your MCP server, reads every tool definition, and checks for problems -- without executing anything.

```bash
syrin analyse --transport http --url http://localhost:8000/mcp
```

It catches issues like:

- **E101**: Tool has no description -- the LLM cannot figure out when to use it
- **E102**: Required parameter is just `type: string` with no explanation -- the LLM will guess
- **E110**: Two tools have overlapping descriptions -- the LLM picks randomly
- **E107**: Tool A depends on Tool B, which depends on Tool A -- infinite loop

These are the kinds of problems that work fine in manual testing but break under real agent traffic.

### Contract Testing (`syrin test`)

Syrin executes your tools inside a sandbox and validates their behavior against contracts you write in YAML.

```bash
syrin test --tool fetch_user
```

It catches:

- **E500**: Tool wrote to the filesystem when its contract says `side_effects: none`
- **E301**: Tool returned 2MB of JSON when the contract says `max_output_size: 10kb`
- **E300**: Tool output does not match the declared output schema
- **E403**: Tool did not respond within the declared time limit

### Interactive Dev Mode (`syrin dev`)

Syrin lets you chat with your MCP server through an LLM and see exactly what happens at each step.

```bash
syrin dev --exec
```

![syrin dev demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-dev/dev.gif)

You type a natural language instruction. The LLM proposes a tool call. In preview mode, you see the proposal without executing it. In execute mode, Syrin runs the tool and shows the result.

This lets you compare how different LLMs (OpenAI, Claude, Ollama) interact with the same tools.

## How It Works

When you run `syrin dev --exec` and type "What is the weather in San Francisco?", here is what happens:

```
You type a question
  -> Syrin sends it to the LLM with your tool definitions
  -> LLM proposes: call get_weather(location="San Francisco")
  -> Syrin validates the proposal against tool contracts
  -> Syrin executes the tool via MCP
  -> Tool returns { temperature: 62, condition: "foggy" }
  -> Syrin records the entire sequence as events
  -> Result displayed to you
```

Every step is recorded as a typed, ordered event. Events are saved to `.syrin/events/` as JSONL files. You can inspect them later to understand exactly what happened.

## The Key Idea: LLM Proposes, Runtime Decides

In an MCP system without Syrin, the LLM calls tools directly. If it picks the wrong tool, passes bad parameters, or triggers an infinite loop, nothing stops it.

With Syrin:

| Component | Role                                                             |
| --------- | ---------------------------------------------------------------- |
| LLM       | Proposes which tool to call and with what parameters             |
| Syrin     | Validates the proposal, executes the tool, records what happened |
| MCP Tools | Do the actual work (read files, query APIs, etc.)                |

The LLM is advisory. Syrin is the authority.

## What Syrin Does Not Do

- It does not generate prompts or modify LLM behavior
- It does not replace your MCP server or tools
- It does not require changes to your existing code
- It does not run as a daemon or background service -- it is a CLI you run when you need it

## The Four Commands

| Command         | Purpose                                           | Needs Setup?     |
| --------------- | ------------------------------------------------- | ---------------- |
| `syrin list`    | See what tools/resources/prompts a server exposes | No               |
| `syrin analyse` | Static analysis of tool contracts                 | No               |
| `syrin test`    | Execute tools in sandbox, validate behavior       | Yes (local init) |
| `syrin dev`     | Interactive LLM-MCP session                       | Yes (LLM keys)   |

Two more utility commands: `syrin doctor` (validate config) and `syrin status` (project health overview).

## Next

- [Installation](/getting-started/installation/) -- Install Syrin globally or use npx
- [Setup](/setup/) -- Configure Syrin for your workflow
- [Quick Test Without Config](/guides/quick-test-without-config/) -- Try Syrin immediately
