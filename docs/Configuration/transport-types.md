---
title: 'Transport Types'
description: 'How Syrin connects to and governs MCP servers via stdio, and http transports'
weight: '2'
---

# What are the ways?

Syrin supports two transport types for connecting to MCP servers: **stdio** and **http**.

The transport defines **how execution enters the system**.\
It determines whether Syrin owns the server lifecycle or observes an already-running process.

Choosing the correct transport is not a preference choice.\
It is an execution model choice.

## stdio Transport

The `stdio` transport is used when an MCP server runs as a process and communicates through standard input and output.

In this mode, **Syrin owns the execution lifecycle**.

### Configuration

```yaml
transport: 'stdio'
script: 'python server.py'
```

### How It Works

1. Syrin spawns the MCP server using the configured `script`
2. All communication happens over stdin and stdout
3. Syrin monitors the process during execution
4. The process is terminated when Syrin exits or halts execution

This gives Syrin full visibility and control over execution boundaries.

### When to Use stdio

Use stdio when:

- Developing locally
- Running script-based MCP servers
- The server does not expose an HTTP endpoint
- You want Syrin to manage process lifecycle
- You want maximum execution visibility

This is the **recommended transport for development**.

### Examples

Python server:

```yaml
script: 'python server.py'
```

Node.js server:

```yaml
script: 'node index.js'
```

With arguments:

```yaml
script: 'node index.js --port 3000 --debug'
```

Absolute path:

```yaml
script: '/usr/local/bin/my-mcp-server'
```

Virtual environment:

```yaml
script: 'source venv/bin/activate && python server.py'
```

### Behaviour in Syrin Commands

- `syrin dev`\
  Spawns and manages the server process automatically
- `syrin test`\
  Spawns the server, validates protocol compliance, then terminates it
- `syrin list`\
  Spawns the server, inspects declared capabilities, then terminates it

### Process Management

With stdio transport, Syrin:

- Spawns the process
- Monitors health and exit state
- Captures execution events
- Terminates the process on exit or failure

This makes execution boundaries explicit.

## http Transport

The `http` transport is used when an MCP server exposes an HTTP endpoint.

In this mode, **Syrin does not own the server lifecycle**.

### Configuration

```yaml
transport: 'http'
mcp_url: 'http://localhost:3000'
```

### How It Works

1. Syrin connects to the MCP server via HTTP
2. Communication happens through HTTP requests
3. The server must already be running
4. Syrin does not start or stop the server

Execution is governed, but process lifecycle is external.

### When to Use http

Use http when:

- The MCP server is already running
- The server is deployed as a service
- The server is remote
- You are integrating with existing infrastructure
- You are operating in production environments

This transport is common in **production deployments**.

### Examples

Local server:

```yaml
mcp_url: 'http://localhost:3000'
```

Remote server:

```yaml
mcp_url: 'https://api.example.com/mcp'
```

With custom path:

```yaml
mcp_url: 'http://localhost:3000/mcp/v1'
```

With authentication:

```yaml
mcp_url: 'https://user:pass@api.example.com/mcp'
```

### Behaviour in Syrin Commands

- `syrin dev`\
  Connects to the running server\
  Use `--run-script` if you want Syrin to spawn it internally
- `syrin test`\
  Validates connectivity and protocol compliance
- `syrin list`\
  Connects to the server and inspects declared capabilities

### Server Requirements

When using http transport, the MCP server must:

- Be running before Syrin connects
- Expose a valid MCP endpoint
- Accept HTTP POST requests
- Return protocol-compliant JSON responses

Syrin does not attempt to correct server behaviour.

## Choosing a Transport

### Use stdio if:

- You are developing locally
- You want Syrin to manage the process
- You need maximum execution visibility
- The server is a script or binary

### Use http if:

- The server is already deployed
- The server is remote
- You are running in production
- Lifecycle is managed externally

The transport choice affects **how much execution control Syrin can exercise**.

## Switching Transports

### From stdio to http

1. Update configuration:

```yaml
transport: 'http'
mcp_url: 'http://localhost:3000'
```

2. Start the HTTP server
3. Validate configuration:

```bash
syrin doctor
```

4. Test connectivity:

```bash
syrin test
```

### From http to stdio

1. Update configuration:

```yaml
transport: 'stdio'
script: 'python server.py'
```

2. Ensure the script is executable
3. Validate configuration:

```bash
syrin doctor
```

4. Test execution:

```bash
syrin test
```

## Common Issues

### stdio Transport Issues

Script not found:

- Check the script path
- Ensure the script has execute permissions
- Verify the script is available in PATH

Process fails to start:

- Check script syntax
- Ensure dependencies are installed
- Inspect script logs

### http Transport Issues

Connection refused:

- Ensure the server is running
- Verify the URL is correct
- Check network connectivity

Timeouts:

- Verify server responsiveness
- Check firewall rules
- Inspect server logs

## Relationship to Execution

The transport defines **how execution enters Syrin**, not how it is interpreted.

- stdio maximises control and observability
- http integrates with existing infrastructure

Both are supported.\
Neither changes Syrin’s execution model.

## See Also

- [syrin doctor](/commands/doctor/)
- [syrin test](/commands/test/)
- [syrin dev](/commands/dev/)
- [Configuration Overview](/configuration/)
