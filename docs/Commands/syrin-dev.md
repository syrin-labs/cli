---
title: "syrin dev"
description: "Governed interactive development mode for testing MCP execution with real LLMs"
weight: "6"
---

# Rock 'n' Roll

Enter **governed interactive development mode** for MCP systems.

`syrin dev` is the primary interface for **understanding real MCP execution**. It allows you to interact with your MCP server using natural language while Syrin remains the execution authority.

This is not a chat playground.\
It is a **controlled execution environment** where every proposal, decision, and tool call is observable and enforceable.

This command answers the most important development question:

> What actually happens when an LLM interacts with my MCP server?

## Purpose

Most MCP issues do not surface in code review or unit tests.

They emerge when:

- An LLM proposes an unexpected tool called
- A tool behaves differently than assumed
- Execution order diverges across turns
- Context mutates invisibly

`syrin dev` exists to surface these behaviours **during development**, while execution is still inspectable and safe to interrupt.

## Usage

```bash
syrin dev [options]
```

## Options

| Flag                    | Description                                      | Default            |
| ----------------------- | ------------------------------------------------ | ------------------ |
| `--exec`                | Execute tool calls instead of previewing         | `false`            |
| `--llm <provider>`      | Override default LLM provider                    | From configuration |
| `--project-root <path>` | Syrin project root directory                     | Current directory  |
| `--save-events`         | Persist execution events to disk                 | `false`            |
| `--event-file <path>`   | Directory for event files                        | `.syrin/events`    |
| `--run-script`          | Spawn MCP server internally for HTTP transport   | `false`            |
| `--transport <type>`    | Transport type (stdio or http)                   | From configuration |
| `--mcp-url <url>`       | MCP server URL (required for http with global config) | From configuration |
| `--script <command>`    | Script command (required for stdio with global config) | From configuration |

**Global Options:**

| Flag        | Description                  |
| ----------- | ---------------------------- |
| `--quiet`   | Minimal output (errors only) |
| `--verbose` | Verbose output for debugging |

Flags override values defined in `syrin.yaml`.

## Execution Modes

`syrin dev` operates in two explicit modes.

### Preview Mode (Default)

Preview mode generates LLM proposals, but **does not execute tools**.

In this mode:

- Tool calls are displayed, not run
- Side effects are impossible
- Execution intent is visible

Preview mode exists to make reasoning about behaviour safe.

### Execute Mode

Enable execute mode explicitly:

```bash
syrin dev --exec
```

In execute mode:

- Tool calls are executed
- Side effects are real
- Execution events are recorded

Syrin will never execute tools unless this flag is present.

![Syrin Dev Logo](/images/commands/syrin-dev-logo.png)

## Interactive Session

Once started, `syrin dev` opens an interactive session.

You can:

- Issue natural language instructions
- Observe proposed tool calls
- Inspect execution results
- Iterate on behaviour in real time

All interactions pass through the Syrin runtime.\
Nothing bypasses execution governance.

## Chat Commands

The following commands are available inside dev mode.

| Command          | Behaviour                                  |
| ---------------- | ------------------------------------------ |
| `/tools`         | List tools exposed by the MCP server       |
| `/history`       | Show interaction history for the session   |
| `/save-json`     | Save the most recent tool result to a file |
| `/clear`         | Clear the current session context          |
| `/exit`, `/quit` | Exit dev mode                              |
| `Ctrl+C`         | Exit dev mode immediately                  |

These commands affect only the dev session.\
They do not modify configuration or runtime state.

## Large Response Handling

`syrin dev` is designed for real MCP outputs.

It handles large JSON responses automatically:

- Small responses are rendered fully
- Medium responses are paginated
- Large responses show structure only

This prevents the interface from becoming unusable while preserving access to execution data.

## Event Recording

When `--save-events` is enabled, Syrin records **execution events as they occur**.

Example structure:

```
.syrin/events/
├── 2024-01-01T10-00-00.json
├── 2024-01-01T10-05-00.json
```

Each event file contains:

- LLM proposals
- Validation decisions
- Tool execution results
- Errors and halts

These events are intended for **inspection, debugging, and analysis**.

Replay is not required to extract value from them.

## Transport Behaviour

### stdio Transport

The MCP server is spawned automatically.\
Syrin controls the process lifecycle directly.

### http Transport

By default, Syrin connects to an already running server.\
Use `--run-script` to allow Syrin to spawn the server internally.

## Common Workflows

### Safe Exploration

```bash
syrin dev
```

Inspect behaviour without executing tools.

### Debugging With Evidence

```bash
syrin dev --save-events
```

Capture execution facts for later inspection.

### Controlled Execution

```bash
syrin dev --exec
```

Execute real tools under runtime governance.

### Comparing LLM Behaviour

```bash
syrin dev --llm openai
syrin dev --llm claude
```

Observe how different models propose actions for the same context.

## Best Practices

1. Start in preview mode
2. Enable event recording early
3. Execute tools only after behaviour is understood
4. Clear history when assumptions change
5. Treat recorded events as first-class debugging artefacts

## Relationship to Other Commands

- `syrin init` establishes execution assumptions
- `syrin doctor` validates configuration correctness
- `syrin test` validates protocol compliance
- `syrin dev` exposes real execution behaviour

This is where MCP systems stop being theoretical and become observable.

## See Also

- [syrin test](/commands/test/)
- [syrin list](/commands/list/)
- [syrin doctor](/commands/doctor/)
- [Configuration](/configuration/)