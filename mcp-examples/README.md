# MCP Server Examples

This directory contains example MCP servers in different languages and transport types for testing Syrin.

## Available Servers

1. **http-ts** - TypeScript HTTP/SSE MCP server (port 8000)
2. **stdio-ts** - TypeScript stdio MCP server
3. **stdio-py** - Python stdio MCP server
4. **http-py** - Python HTTP MCP server (port 8001)
5. **stdio-go** - Go stdio MCP server
6. **http-go** - Go HTTP/SSE MCP server (port 8002)

## Tool Dependencies

Each server implements **3rd-degree tool dependencies** where tools must be called in sequence:

### Pattern for All Servers:
- **Tool 1**: Creates initial state/token/session (must be called first)
- **Tool 2**: Requires output from Tool 1 (cannot work without Tool 1)
- **Tool 3**: Requires output from Tool 2 (cannot work without Tool 2)

To call Tool 3, you must:
1. Call Tool 1 → get identifier
2. Call Tool 2 with identifier from Tool 1 → get another identifier
3. Call Tool 3 with identifier from Tool 2 → complete workflow

### Example Workflow:

**TypeScript HTTP Server:**
- `step1_create_session` → returns `session_id`
- `step2_process_data` → requires `session_id`, returns `processed_id`
- `step3_finalize_result` → requires `processed_id`, completes workflow

**TypeScript Stdio Server:**
- `step1_initialize` → returns `init_token`
- `step2_validate` → requires `init_token`, returns `validation_code`
- `step3_execute` → requires `validation_code`, completes workflow

**Python Stdio Server:**
- `step1_setup` → returns `setup_id`
- `step2_transform` → requires `setup_id`, returns `transform_id`
- `step3_complete` → requires `transform_id`, completes workflow

**Python HTTP Server:**
- `step1_authenticate` → returns `auth_token`
- `step2_process` → requires `auth_token`, returns `process_token`
- `step3_finalize` → requires `process_token`, completes workflow

**Go Stdio Server:**
- `step1_generate_token` → returns `token`
- `step2_generate_code` → requires `token`, returns `code`
- `step3_execute` → requires `code`, completes workflow

**Go HTTP Server:**
- `step1_create_key` → returns `key_id`
- `step2_create_operation` → requires `key_id`, returns `operation_id`
- `step3_complete` → requires `operation_id`, completes workflow

## Quick Start

Each server includes:
- **Tools** (with 3rd-degree dependencies)
- **Prompts** (code review, documentation, optimization, etc.)
- **Resources** (server info, greetings, status)

Refer to each server's README for specific setup and usage instructions.

## Testing with Syrin

You can test these servers with Syrin using:

```bash
# For HTTP servers
syrin test --transport=http --url http://localhost:8000/mcp
syrin list tools --url http://localhost:8000/mcp

# For stdio servers
syrin test --transport=stdio --command "node mcp-examples/stdio-ts/dist/index.js"
```

## Notes

- TypeScript servers use the official `@modelcontextprotocol/sdk`
- Python servers use simplified JSON-RPC implementations
- Go servers use the official `github.com/modelcontextprotocol/go-sdk`
- Each server implements basic tools, prompts, and resources for testing purposes
- All tools are designed with clear dependency chains for testing complex workflows
