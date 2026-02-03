---
title: 'Tool Not Found (E000)'
description: 'Tool Not Found - Configuration & Setup error in Syrin'
weight: 1
---

## Lost in translation

**Category**: Configuration & Setup  
**Severity**: Error  
**Detection**: Runtime

**Description**:  
A tool contract exists, but the tool is not registered in the MCP server.

**What Causes It**:

- The tool contract file exists, but tool is not implemented in the server
- Tool name mismatch between contract and server implementation
- The tool is in a different server file than configured
- Server script path is incorrect

**How to Fix**:

- Verify the tool is registered in your MCP server script
- Ensure the tool name in the contract matches the tool name in the server
- Check that the `script` configuration in `syrin.yaml` points to the correct server file
- If the tool is in a different file, update the configuration

**Example**:

```yaml
# tools/fetch_user.yaml exists
tool: fetch_user

# But server.py doesn't register @mcp.tool() named "fetch_user"
```

## See Also

- [Error Rules Overview](/testing/errors/)
- [Warning Rules](/testing/warnings/)
- [Testing Documentation](/testing/)
- [Writing Test Cases](/testing/writing-test-cases/)
