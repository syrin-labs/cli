# CHANGELOG

## v1.5.0

### Analysis Engine Improvements

**Focus:** Enable more analysis rules and improve schema handling

#### 1. **Fixed Dependency Confidence Ceiling (A1)**

- **Issue**: Dependency inference maxed out at ~0.73 confidence, but 5+ analysis rules required ≥0.8 to fire
- **Impact**: E103 (Type Mismatch), E105 (Free Text Propagation), E106 (Output Not Guaranteed), E107 (Circular Dependency), W105 (Optional as Required) were effectively disabled
- **Fix**: Lowered rule thresholds from 0.8 to 0.65 to match real-world confidence scores
- **Files**: E103, E105, E106, E107, W105 rule files

#### 2. **Enhanced Normalizer: oneOf/anyOf/allOf Support (A2-A3)**

- **Issue**: Normalizer ignored `oneOf`, `anyOf`, `allOf` - fundamental JSON Schema constructs
- **Impact**: Union types were silently dropped, losing critical schema information
- **Fix**: Extract and merge properties from all schema variants
- **Benefit**: Rules now understand complex schemas used by modern MCP servers

#### 3. **Enhanced Normalizer: Format Field Support (A4)**

- **Issue**: Normalizer ignored `format` field (`email`, `uri`, `date-time`, etc.)
- **Impact**: Constrained strings reported as unconstrained; rules produced false positives
- **Fix**: Extract and expose `format` field in FieldSpec
- **Benefit**: More accurate constraint detection for string fields

#### 4. **Enhanced Normalizer: Array Items Schema Support (A5)**

- **Issue**: Normalizer didn't handle array `items` schemas
- **Impact**: Array contents invisible to analysis rules
- **Fix**: Extract nested field specs from array item schemas
- **Benefit**: Rules can now understand complex array structures

#### 5. **Output Explosion Detection (T3)**

- **Status**: Already implemented and working in E301 rule
- **Verification**: Confirmed via test suite; BehaviorObserver correctly detects output size violations
- **Testing**: 674 tests pass including all behavioral detection tests

### Technical Details

**Files Modified:**

- `src/runtime/analysis/dependencies.ts` - Lowered threshold constant
- `src/runtime/analysis/types.ts` - Added `format` field to FieldSpec
- `src/runtime/analysis/normalizer.ts` - Enhanced with union type and format handling
- `src/runtime/analysis/rules/errors/e103-type-mismatch.ts` - Threshold update
- `src/runtime/analysis/rules/errors/e105-free-text-propagation.ts` - Threshold update
- `src/runtime/analysis/rules/errors/e106-output-not-guaranteed.ts` - Threshold update
- `src/runtime/analysis/rules/errors/e107-circular-dependency.ts` - Threshold update + test fix
- `src/runtime/analysis/rules/warnings/w105-optional-as-required.ts` - Threshold update

**Test Results:**

- All 674 tests pass (66 test files)
- Build: ✓ Passes
- Linting: ✓ Passes
- Formatting: ✓ Passes

### Known Limitations

**T1 (Side Effect Detection):**

- Cannot be implemented with current architecture (tools run in separate processes)
- `IOMonitor` is available but has no way to observe separate process side effects
- Workaround: Contract-based testing can validate side-effect guarantees through behavioral expectations

**T2 (Non-Determinism Detection):**

- Would require running each tool test multiple times and comparing outputs
- Deferred to future release; current architecture prioritizes single-pass testing

## v1.4.3

### Critical Bug Fixes

This hotfix release addresses 4 critical production bugs that were blocking public launch.

#### 1. **ESM Compatibility - `__dirname` Error**

- **Issue**: `src/utils/package-manager.ts` used `__dirname`, which doesn't exist in ESM modules
- **Impact**: `syrin update` and `syrin rollback` commands were completely broken
- **Fix**: Replaced with ESM-compatible approach using `import.meta.url` and `fileURLToPath`

#### 2. **Logger Output Stream**

- **Issue**: `log.error()` used `console.log` instead of `console.error`
- **Impact**: Error output couldn't be separated from normal output (Unix convention violation)
- **Fix**: Changed to properly output errors to stderr

#### 3. **Tool Result Conversation Role**

- **Issue**: Tool results were added to conversation history with `role: 'assistant'` instead of `role: 'tool'`
- **Impact**: Broke multi-turn tool calling; LLM couldn't distinguish its own responses from tool outputs
- **Fix**:
  - Updated `MessageRole` type to include `'tool'`
  - Changed all tool result messages to use correct `'tool'` role

#### 4. **OpenAI Deprecated API**

- **Issue**: OpenAI provider used deprecated `functions` parameter instead of modern `tools`
- **Impact**: Will fail when OpenAI removes deprecated API
- **Fix**:
  - Migrated from `functions` to `tools` parameter
  - Updated tool schema format to `{ type: 'function', function: {...} }`
  - Removed legacy `function_call` handling

## v1.4.2

### Improvements

- **Init** – Transport type (http/stdio) shown as checklist; no free-text input.
- **Status** – UI split into Local / Global; config, .env, project, and LLM providers per section; minimal styling aligned with doctor.
- **Analyse** – Errors and warnings numbered (CLI and CI); dependency graph edges numbered; CI uses logger for success/error.
- **Zero-config** – `syrin list`, `syrin analyse`, `syrin test --connection` work with `--url` or `--script` only; no local or global config required (dev still needs config for LLM).
- **Config** – `mcp_url` renamed to `url` in `syrin.yaml`; version kept; template comments cleaned (no "v1.3.0" labels); LLM keys must be env var names only.

### Documentation

- Docs and README updated for new behaviour and commands.

## v1.4.1

### Breaking Changes

1. **`--mcp-url` renamed to `--url`** - The `--mcp-url` flag in `syrin dev` has been renamed to `--url` for consistency across all commands.

### Improvements

1. **Updated Dependencies** - Upgraded all CLI dependencies to their latest versions.
2. **Updated README** - Restructured quickstart, added demo GIFs, and improved documentation for launch.

## v1.4.0

### Features

1. **Global Configuration Support** - Syrin can now be used from anywhere without project-specific configuration.
   - `syrin init --global` creates user-wide LLM configuration at `~/.syrin/syrin.yaml`
   - `syrin dev` works with global config using `--transport` and `--url`/`--script` flags
   - Global `.env` support at `~/.syrin/.env` for shared API keys
   - Configuration precedence: CLI flags > Local config > Global config > Defaults

2. **New `syrin status` Command** - Quick project health overview (like `git status`).
   - Shows configuration status (local/global)
   - Displays project details and LLM provider status
   - Shows environment file status
   - Provides suggested actions for unconfigured items

3. **New `syrin config` Command Suite** - Complete configuration management without editing YAML files.
   - `syrin config list` - List all configuration values
   - `syrin config get <key>` - Get a specific value
   - `syrin config set <key> <value>` - Set a configuration value
   - `syrin config edit` - Open config in editor
   - `syrin config edit-env` - Open .env file in editor
   - `syrin config set-default <provider>` - Set default LLM provider
   - `syrin config remove <provider>` - Remove an LLM provider

4. **Command Aliases** - Shorter alternatives for frequently used commands.
   - `syrin ls` → `syrin list`
   - `syrin doc` → `syrin doctor`
   - `syrin cfg` → `syrin config`

5. **Global CLI Flags** - New flags available on all commands.
   - `--quiet` / `-q` - Minimal output (errors only), perfect for CI/CD
   - `--verbose` - Verbose output for debugging

6. **Improved Checkbox UX** - Added hint text "SPACE to toggle, ENTER to confirm" in init prompts.

### Bug Fixes

1. **Dev Mode Validation Details** - Now shows which required parameter is missing when validation fails.
2. **`[object Object]` in Init Output** - Fixed logging bug that displayed object context incorrectly.
3. **Exit Code 0 for Help** - Running `syrin` with no arguments now exits with code 0 (was 1).
4. **Duplicate Error Messages** - Fixed duplicate error logging in command error handler.
5. **Wrong Env Source in Doctor** - Fixed environment variable priority (local .env now takes precedence over global .env for local context).

### Improvements

1. **Version Banner Consistency** - All commands now show version banner consistently.
2. **Unified Logger** - Consolidated `logger` and `log` into single `log` utility.
3. **Cleaner YAML Generation** - Improved whitespace handling in generated config files.
4. **Better Error Messages** - Standardized error formatting across all commands.
5. **Comprehensive Documentation** - Complete CLI reference with all commands, flags, and examples.

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
