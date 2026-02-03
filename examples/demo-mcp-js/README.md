# Demo MCP Server

A simple MCP server with intentional issues for demonstrating Syrin's capabilities.

## Quick Start

```bash
# Install dependencies
cd examples/demo-server
npm install

# Run Syrin analysis (from repo root)
cd ../..
syrin analyse --transport stdio --mcp-command "node examples/demo-server/server.js"

# Or use the included config
cd examples/demo-server
syrin analyse
```

## What Syrin Will Find

This demo server has intentional issues:

1. **Vague Descriptions**
   - `get_user`: "Gets a user" (not descriptive)
   - `process`: "Process" (extremely vague)

2. **Missing Parameter Descriptions**
   - `get_user.id` has no description
   - `send_notification.channel` enum has no description

3. **Overlapping Tools**
   - `get_user` and `fetch_user` do the same thing

## Using with Syrin Dev Mode

```bash
# Preview tool calls (no execution)
syrin dev --transport stdio --mcp-command "node examples/demo-server/server.js"

# Enable execution
syrin dev --exec --transport stdio --mcp-command "node examples/demo-server/server.js"
```

## Tools Available

| Tool                | Description                   |
| ------------------- | ----------------------------- |
| `get_user`          | Gets a user by ID             |
| `fetch_user`        | Fetches user data (duplicate) |
| `create_report`     | Creates a detailed report     |
| `send_notification` | Sends a notification          |
| `process`           | Generic processor             |
