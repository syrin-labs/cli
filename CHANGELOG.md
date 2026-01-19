# CHANGELOG

## v1.3.3

### Bugs

1.
2.

## v1.3.2

### Breaking Changes

1. **Config File Location Changed** - The configuration file has been moved from `.syrin/config.yaml` to `syrin.yaml` at the project root. This is the first breaking change in Syrin.
   - When running `syrin init`, the config file will now be created as `syrin.yaml` in the project root
   - Existing projects using `.syrin/config.yaml` will need to migrate their config file to the new location
   - The `.syrin` directory is still used for events, dev history, and data files

### Features

1. **Tool-Level Structural Safety Validation (`syrin test`)** - New default behavior for `syrin test` command that validates tool contracts through sandboxed execution.

2. **New Behavioral Error Rules**:
   - **E500: Side Effect Detected** - Tool attempts filesystem writes to project files
   - **E301: Output Explosion** - Tool output exceeds declared size limit
   - **E403: Unbounded Execution** - Tool execution timed out or failed to terminate

3. **New Behavioral Warning Rules (W021-W023)**:
   - **W110: Weak Schema** - Contract schema is too loose or doesn't match MCP tool schema
   - **W300: High Entropy Output** - Tool output has high entropy (random, unpredictable)
   - **W301: Unstable Defaults** - Tool behavior changes significantly with default values

4. **Enhanced `syrin test` Command**:
   - **Default Mode**: Tool validation (new default behavior)
   - **Connection Testing**: Available via `--connection` flag (legacy behavior)
   - **Options**: `--tool`, `--strict`, `--json`, `--ci`
   - **Strict Mode**: `--strict` flag treats warnings as errors
   - **JSON Output**: `--json` flag for CI integration
   - **CI Mode**: `--ci` flag for CI Mode.

5. **Configuration Enhancements**:
   - New `check` section in `syrin.yaml` for tool validation configuration

### Improvements

1. **Performance**: Process reuse strategy significantly reduces overhead when testing many tools (100+ tools in 1-3 minutes)
2. **Safety**: Network calls are allowed but monitored for side effects and non-determinism (does not block legitimate API calls)
3. **Flexibility**: Supports both contract-defined tests and synthetic input generation from schemas
4. **Developer Experience**: Clear error messages with suggestions for fixing issues

## v1.2.2

### Bug Fixes

1. **Updated STDIO test using script** - Fixed CLI test when script was passed

## Features

1. **Env Support for CLI** - Support for multiple ENV variables using (`--env`) for script in CLI
2. **Auth Header Support for CLI** - Support for multiple auth headers using (`--auth-header`) for URL in CLI

## v1.2.1

### Bug Fixes (Critical)

1. **CLI Not Working After Global Install** - Fixed critical issue where syrin commands produced no output when installed globally via npm.

## v1.2.0

### Features

1. **Static Tool Contract Analysis (`syrin analyse`)** - New command to perform static analysis on MCP tool contracts, catching issues before runtime.
2. **Comprehensive Analysis Rules** - 20 analysis rules (10 errors, 10 warnings) covering critical issues like missing output schemas, type mismatches, and circular dependencies.
3. **CI Integration Support** - Added `--ci` flag for continuous integration pipelines with appropriate exit codes.
4. **JSON Output Format** - Added `--json` flag to output analysis results in JSON format.
5. **Dependency Graph Visualization** - Added `--graph` flag to visualize tool dependencies.
6. **Tool Dependency Inference** - Automatic detection and analysis of implicit dependencies between MCP tools.

### Bug Fixes

1. **ESM Main Entry Point Detection** - Fixed issue where `run()` function was being called when the module was imported programmatically.
2. **Hardcoded Version in MCP Connection** - Fixed issue where `syrin test` always displayed "syrin v1.0.0" instead of the actual current version.

## v1.1.0

### Features

1. **Event-Driven Chat Visibility** - Real-time event updates in chat UI to increase visibility of testing operations and tool executions.
2. **Update Command** - Added `syrin update` command to update Syrin to the latest version.
3. **Large JSON File Saving** - Added `/save-json` command to save large tool result JSON files for testing and analysis.

### Optimizations

1. **Code Optimizations** - Moved gradient colors array outside map callback, simplified welcome message builder, and refactored version checking with centralized package name constant.

### UI

1. **Chat UI Performance** - Revamped chat UI to eliminate lag and improve responsiveness.

## v1.0.0

1. Complete CLI Toolset - Interactive commands for initialization (`syrin init`), health checks (`syrin doctor`), protocol testing (`syrin test`), discovery (`syrin list`), and interactive development mode (`syrin dev`)
2. Multi-LLM Provider Support - Seamless integration with OpenAI, Claude (Anthropic), and Ollama, including automatic Ollama service management and model downloading
3. Full MCP Protocol Support - Complete Model Context Protocol implementation with tool calling, resource discovery, prompt discovery, and protocol validation
4. Safe Development Environment - Preview mode by default to prevent accidental tool execution, with optional execution mode and comprehensive event tracking for debugging
5. Flexible Configuration System - YAML-based configuration with schema validation, environment variable support, and support for both HTTP and stdio transport types
6. Developer Experience - Interactive chat interface, command history, tool listing, automatic server spawning, and comprehensive error handling with clear feedback
7. Production Ready - TypeScript implementation with full type safety, npm package distribution, and complete documentation
