# CHANGELOG

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
