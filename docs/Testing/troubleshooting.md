---
title: 'Troubleshooting'
description: 'Common test issues and how to resolve them in Syrin'
weight: '6'
---

# Troubleshooting

This guide addresses common issues that may arise when testing MCP tools with Syrin and provides guidance on how to resolve them.

## Tool Not Found

### Error

```
E000: Tool Not Found
Tool "fetch_user" not found in the MCP server
```

### Causes

- The tool contract exists, but the tool is not registered in the MCP server
- Tool name mismatch between contract and server implementation
- The tool is in a different server file than configured
- Server script path is incorrect

### Solutions

1. **Verify Tool Registration**

   Check that the tool is registered in your MCP server:

   ```python
   # server.py
   @mcp.tool()
   def fetch_user(user_id: str) -> User:
       # Tool implementation
   ```

2. **Check Tool Name Match**

   Ensure tthe ool name in cthe ontract matches server:

   ```yaml
   # tools/fetch_user.yaml
   tool: fetch_user # Must match @mcp.tool() function name
   ```

3. **Verify Server Script Path**

   Check `syrin.yaml` configuration:

   ```yaml
   script: 'python server.py' # Correct path
   ```

4. **Check Server File Location**

   If tool is in a different file, update configuration:

   ```yaml
   script: 'python mcp/tools.py' # Correct file path
   ```

## Timeout Issues

### Error

```
E403: Unbounded Execution
Tool execution timed out
```

### Causes

- Tool execution exceeds declared `max_execution_time`
- Tool has infinite loop
- Tool performs slow operations without limits
- Global timeout too restrictive

### Solutions

1. **Increase Execution Time**

   Update contract with appropriate timeout:

   ```yaml
   guarantees:
     max_execution_time: 60s # Increase if tool legitimately takes longer
   ```

2. **Optimize Tool Performance**
   - Remove unnecessary operations
   - Add caching for repeated operations
   - Optimize database queries
   - Reduce API call overhead

3. **Check for Infinite Loops**

   Review tool implementation for:
   - Missing loop termination conditions
   - Recursive calls without base cases
   - Blocking operations that never return

4. **Increase Global Timeout**

   Update `syrin.yaml`:

   ```yaml
   check:
     timeout_ms: 60000 # 60 seconds
   ```

## Side Effect Detection

### Error

```
E500: Side Effect Detected
Tool attempted filesystem write to project files
```

### Causes

- Tool writes to files outside temp directory
- Tool modifies project state
- Tool creates or deletes project files
- Tool updates configuration files

### Solutions

1. **Use Temp Directory**

   Write only to temp directory:

   ```python
   import tempfile

   @mcp.tool()
   def create_file(data: str) -> str:
       with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
           f.write(data)
           return f.name  # Returns temp file path
   ```

2. **Update Side Effects Guarantee**

   If tool legitimately needs filesystem access:

   ```yaml
   guarantees:
     side_effects: filesystem # Allow temp directory writes
   ```

3. **Remove Project File Writes**

   Remove any writes to project files:

   ```python
   # ❌ Bad: Writes to project
   with open('project/config.json', 'w') as f:
       f.write(data)

   # ✅ Good: Writes to temp
   with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
       f.write(data)
   ```

## Output Size Exceeded

### Error

```
E301: Output Explosion
Tool output exceeds declared size limit
```

### Causes

- Tool returns more data than declared
- No pagination or filtering
- Output size limit too small
- Tool fetches all records instead of subset

### Solutions

1. **Increase Output Size Limit**

   Update contract if limit is too restrictive:

   ```yaml
   guarantees:
     max_output_size: 1mb # Increase if legitimate
   ```

2. **Implement Pagination**

   Add pagination to limit output:

   ```python
   @mcp.tool()
   def fetch_users(page: int = 1, page_size: int = 10) -> List[User]:
       offset = (page - 1) * page_size
       return get_users(offset=offset, limit=page_size)
   ```

3. **Add Filters**

   Add filters to reduce output:

   ```python
   @mcp.tool()
   def fetch_users(active_only: bool = True) -> List[User]:
       if active_only:
           return get_active_users()
       return get_all_users()
   ```

4. **Limit Data Returned**

   Return only necessary fields:

   ```python
   @mcp.tool()
   def fetch_users(summary: bool = True) -> List[User]:
       if summary:
           return get_user_summaries()  # Only id and name
       return get_full_users()  # All fields
   ```

## Input Validation Failures

### Error

```
E200: Input Validation Failed
Field "user_id" - Invalid type
```

### Causes

- Test input doesn't match schema
- Missing required fields
- Invalid field types
- Values outside allowed ranges

### Solutions

1. **Fix Test Input**

   Ensure test input matches schema:

   ```yaml
   tests:
     - name: test_valid_input
       input:
         user_id: '123' # Correct type (string)
       expect:
         output_schema: User
   ```

2. **Update Schema**

   If schema is incorrect, update it:

   ```python
   class FetchUserRequest(BaseModel):
       user_id: str  # Ensure type matches
   ```

3. **Add Input Validation**

   Add validation in tool implementation:

   ```python
   @mcp.tool()
   def fetch_user(user_id: str) -> User:
       if not user_id or not user_id.isalnum():
           raise ValueError("Invalid user_id format")
       return get_user(user_id)
   ```

## Output Validation Failures

### Error

```
E300: Output Validation Failed
Output doesn't match declared schema
```

### Causes

- Tool output doesn't match schema
- Missing required output fields
- Invalid output types
- Schema drift between implementation and contract

### Solutions

1. **Fix Tool Output**

   Ensure output matches schema:

   ```python
   @mcp.tool()
   def fetch_user(user_id: str) -> User:
       user = get_user(user_id)
       return User(
           id=user.id,
           name=user.name,
           email=user.email
       )  # Matches User schema
   ```

2. **Update Schema**

   If schema is incorrect, update it:

   ```python
   class User(BaseModel):
       id: str
       name: str
       email: str
   ```

3. **Check Contract Schema Reference**

   Ensure contract references correct schema:

   ```yaml
   contract:
     output_schema: User # Must match actual schema name
   ```

## Connection Issues

### Error

```
Connection failed
Cannot connect to MCP server
```

### Causes

- MCP server not running
- Incorrect server URL or script path
- Network connectivity issues
- Server startup errors

### Solutions

1. **Verify Server is Running**

   For HTTP transport, ensure server is running:

   ```bash
   # Check if server is running
   curl http://localhost:3000/health
   ```

2. **Check Configuration**

   Verify `syrin.yaml` settings:

   ```yaml
   transport: 'http'
   mcp_url: 'http://localhost:3000' # Correct URL
   ```

3. **Test Server Manually**

   Test server connection:

   ```bash
   # For stdio
   python server.py

   # For HTTP
   curl http://localhost:3000
   ```

4. **Check Server Logs**

   Review server logs for errors:

   ```bash
   python server.py 2>&1 | tee server.log
   ```

## Memory Issues

### Error

```
Memory limit exceeded
Tool execution exceeded memory limit
```

### Causes

- Tool uses too much memory
- Memory leaks in tool implementation
- Processing large datasets
- Global memory limit too restrictive

### Solutions

1. **Increase Memory Limit**

   Update configuration:

   ```yaml
   check:
   ```

2. **Optimize Memory Usage**
   - Process data in chunks
   - Use generators instead of lists
   - Release resources promptly
   - Avoid loading entire datasets

3. **Fix Memory Leaks**

   Review tool for:
   - Unclosed file handles
   - Unreleased resources
   - Growing data structures

## See Also

- [Test Command](/testing/test-command/)
- [Test Results](/testing/test-results/)
- [Error Rules Documentation](/errors/)
