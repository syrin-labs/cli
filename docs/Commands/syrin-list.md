---
title: 'syrin list'
description: 'Inspect and assert the declared execution surface of an MCP server under Syrin governance'
weight: '4'
---

## Hey MCP, What you got?

![syrin list demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-list/list.gif)

Inspect the **declared execution surface** of an MCP server under Syrin governance.

**Zero-config usage:** You can run `syrin list` without any project setup by providing `--transport` and `--url` flags directly. See [Quick Test Without Config](/guides/quick-test-without-config/).

`syrin list` connects to an MCP server and retrieves the capabilities the server explicitly exposes: tools, resources, and prompts. It does not infer behaviour, execute tools, or assume anything beyond what the server declares at the protocol level.

This command answers a precise question:

> What does this MCP server _actually_ expose for execution?

## Purpose

In MCP-based systems, **assumed capabilities are a liability**.

Many production failures originate from incorrect assumptions:

- A tool was expected but never exposed
- A resource template changed silently
- A prompt schema drifted over time

`syrin list` exists to replace assumptions with **runtime truth**.

It provides an authoritative, protocol-backed view of what the server is willing to expose at the moment of inspection.

## Usage

```bash
syrin list [type] [options]
```

**Alias:** `syrin ls`

## Options

| Flag                     | Description                                                 | Default            |
| ------------------------ | ----------------------------------------------------------- | ------------------ |
| `[type]`                 | Capability type to list: `tools`, `resources`, or `prompts` | `tools`            |
| `--transport <type>`     | Transport type: `http` or `stdio`                           | From configuration |
| `--url <url>`            | MCP URL for HTTP transport                                  | From configuration |
| `--script <script>`      | Execution command for stdio transport                       | From configuration |
| `--project-root <path>`  | Syrin project root directory                                | Current directory  |
| `--env <key=value>`      | Environment variable for stdio transport (repeatable)       | None               |
| `--auth-header <header>` | Authentication header for HTTP transport (repeatable)       | None               |

**Global Options:**

| Flag        | Description                  |
| ----------- | ---------------------------- |
| `--quiet`   | Minimal output (errors only) |
| `--verbose` | Verbose output for debugging |

Explicit flags override values defined in `syrin.yaml`.

## What syrin list Does

`syrin list` performs a **read-only capability inspection**.

It executes the following steps:

1. Establishes a connection using the configured transport
2. Performs the MCP protocol handshake
3. Requests declared server capabilities
4. Displays the results without interpretation or modification

It does not:

- Execute tools
- Run workflows
- Validate correctness of implementations

The output reflects **what the server declares**, not what it guarantees.

## Capability Types

### Tools

Tools represent executable actions exposed by the MCP server.

For each tool, Syrin displays:

- Name
- Description
- Parameter schema
- Required and optional arguments

Example output:

![Syrin List Tools](/images/commands/syrin-list-tools.png)

### Resources

Resources represent addressable data or endpoints exposed by the server.

For each resource, Syrin displays:

- URI template
- Description
- Mime type, if provided

Example output:

![Syrin List Resources](/images/commands/syrin-list-resources.png)

### Prompts

Prompts represent structured prompt templates exposed by the server.

For each prompt, Syrin displays:

- Name
- Description
- Argument schema

Example output:

![Syrin List Prompts](/images/commands/syrin-list-prompts.png)

## Examples

### List Tools (Default)

```bash
syrin list
```

or

```bash
syrin list tools
```

### List Resources

```bash
syrin list resources
```

### List Prompts

```bash
syrin list prompts
```

### Override Transport Explicitly

HTTP transport:

```bash
syrin list tools --transport http --url http://localhost:3000
```

stdio transport:

```bash
syrin list tools --transport stdio --script "python server.py"
```

## Use Cases

### Capability Discovery

Understand what an MCP server exposes before integration.

```bash
syrin list tools
syrin list resources
syrin list prompts
```

### Verification

Confirm that expected capabilities are actually declared.

```bash
syrin list tools | grep -i file
```

### Documentation

Generate up-to-date documentation directly from the server.

```bash
syrin list tools > tools.md
syrin list resources > resources.md
```

### Debugging

Determine whether unexpected behaviour is caused by:

- A missing capability
- An incorrect server configuration
- A faulty client-side assumption

## Exit Codes

| Code | Meaning                             |
| ---- | ----------------------------------- |
| `0`  | Capabilities retrieved successfully |
| `1`  | Connection or protocol error        |

## Relationship to Other Commands

- `syrin test` validates protocol compliance
- `syrin list` inspects declared capabilities
- `syrin dev` governs execution at runtime

Capability discovery does not imply execution correctness.\
Correctness is enforced only when execution is governed.

## See Also

- [syrin test](/commands/test/)
- [syrin doctor](/commands/doctor/)
- [syrin dev](/commands/dev/)
- [Configuration](/configuration/)
