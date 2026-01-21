# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Syrin** is a runtime intelligence system for MCP (Model Context Protocol) servers. It helps developers validate, test, and reason about MCP execution before production deployment through static analysis, contract-based testing, and interactive development environments.

## Development Commands

### Building and Running

```bash
# Build the project (TypeScript compilation + path alias resolution + template copy)
npm run build

# Run Syrin CLI locally (rebuilds and executes)
npm run syrin <command>

# Example: Run dev mode locally
npm run syrin dev --exec
```

### Testing

```bash
# Run all tests (watch mode)
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run specific test file
npm test -- src/runtime/dev/session.test.ts
```

### Code Quality

```bash
# Lint the codebase
npm run lint

# Lint and fix issues
npm run lint:fix

# Format code (Prettier)
npm run format

# Check formatting
npm run format:check

# Type check without building
npm run type-check
```

### Publishing

```bash
# Prepare for publish (runs build automatically)
npm run prepublishOnly
```

## High-Level Architecture

Syrin uses a **layered, event-driven architecture** with five primary layers:

### 1. CLI Command Layer (`/cli`)

Entry point using Commander.js. Commands map to handlers that orchestrate lower layers:
- `init`: Initialize project configuration
- `doctor`: Validate configuration and environment
- `dev`: Interactive LLM-MCP development environment
- `test`: Contract-based tool testing with sandboxing
- `analyse`: Static validation of MCP tool contracts
- `list`: Inspect tools, resources, and prompts
- `config`: Manage local/global configuration
- `update`/`rollback`: Version management

All commands use unified error handling via `command-error-handler.ts`.

### 2. Configuration Management (`/config`)

**Dual-layer configuration system:**
- **Local Config**: `syrin.yaml` in project root (all settings)
- **Global Config**: `~/.syrin/syrin.yaml` (LLM providers only)

**Key files:**
- `loader.ts`: Loads local config (project-specific)
- `global-loader.ts`: Loads global config (user-wide)
- `merger.ts`: Implements precedence (local > global > CLI flags)
- `schema.ts`: Zod validation for both config types
- `env-checker.ts`: Environment variable validation

**Precedence order:** CLI Flags > Local Config > Global Config > Defaults

### 3. Runtime Engines (`/runtime`)

Core processing subsystems:

#### MCP Client (`/runtime/mcp`)
- Manages connections to MCP servers
- `manager.ts`: HTTPMCPClientManager and StdioMCPClientManager
- `client/base.ts`: Base functionality for tool discovery/execution
- `connection.ts`: Creates MCP client instances with transport setup

#### LLM Runtime (`/runtime/llm`)
- Abstracts multiple LLM providers (OpenAI, Claude, Ollama)
- `factory.ts`: Factory pattern for provider instantiation
- `LLMProvider` interface with unified `chat()` method
- Each provider normalizes tool calls to common format

#### Dev Mode (`/runtime/dev`)
- Interactive LLM-MCP development environment
- `session.ts`: Orchestrates LLM-MCP interactions with state management
- `repl.ts`: Interactive command loop with history
- `event-mapper.ts`: Maps MCP/LLM events to runtime event types
- `data-manager.ts`: Manages session state and conversation history

#### Analysis Engine (`/runtime/analysis`)
- Static validation of MCP tools
- `analyser.ts`: Main orchestrator running all rules
- **Pipeline**: load → normalize → index → infer dependencies → run rules
- **36 validation rules** (E000-E600 errors, W100-W301 warnings)
- Each rule extends `BaseRule` and implements semantic checks

#### Test Runtime (`/runtime/test`)
- Contract-based testing with sandboxing
- `orchestrator.ts`: Coordinates test execution
- `contract-loader.ts`: Loads tool test specifications from `tools/*.yaml`
- `behavior-observer.ts`: Detects side effects, non-determinism, output explosion
- `runner.ts`: Executes tools in isolated sandbox

#### Sandbox (`/runtime/sandbox`)
- Process isolation for tool execution
- `executor.ts`: Spawns and manages MCP server processes
- `io-monitor.ts`: Captures stdout/stderr with size/time limits
- Memory and timeout enforcement for safety

### 4. Event System (`/events`)

**Persistent, typed event streaming** throughout the application:

**Event Categories (36 types across 10 categories):**
- **A**: Session lifecycle (5 events)
- **B**: Workflow/steps (5 events)
- **C**: LLM context (2 events)
- **D**: LLM proposals (3 events) - non-authoritative
- **E**: Validation (5 events) - runtime authority
- **F**: Tool execution (3 events) - ground truth
- **G**: Transport (4 events)
- **H**: Registry (4 events)
- **I**: Testing (2 events)
- **J**: Diagnostics (3 events)

**Key components:**
- `emitter.ts`: `RuntimeEventEmitter` with auto-incrementing sequence numbers
- `store.ts`: Event persistence interface
  - `MemoryEventStore`: In-process storage
  - `FileEventStore`: JSONL files in `.syrin/events/<sessionId>.jsonl`
- `payloads/`: Typed payload definitions for each category

**Authority hierarchy:** LLM Proposals (non-authoritative) → Validation (authoritative) → Tool Execution (ground truth)

### 5. Presentation Layer (`/presentation`)

Separates UI concerns from business logic:
- `dev-ui.ts`: Formats tools, history, results for dev mode
- `analysis-ui.ts`: Diagnostics and dependency graph formatting
- `test-ui.ts`: Test result formatting
- `config-ui.ts`: Configuration display helpers
- `doctor-ui.ts`: Health check output
- `list-ui.ts`: Tool/resource listing formatting

## Key Architectural Patterns

### Opaque Types Pattern

Used throughout for type safety of IDs:

```typescript
type SessionID = Opaque<string, 'SessionID'>;
type EventID = Opaque<string, 'EventID'>;

// Factory functions prevent accidental string assignment
makeSessionID(value: string): SessionID
```

Benefits: Compile-time safety, prevents mixing IDs, self-documenting.

### Rule Engine Pattern (Analysis)

All validation rules extend `BaseRule`:

```typescript
abstract class BaseRule {
  abstract check(ctx: AnalysisContext): Diagnostic[]
}
```

- Rules registered in `rules/index.ts` as `ALL_RULES` array
- Orchestrator loops through rules, catches failures
- Result: Decoupled, pluggable validation system

### Factory Pattern

Centralizes dependency construction:
- `createLLMProvider()`: Maps provider name → class instantiation
- `createMCPClientManager()`: HTTP vs Stdio transport selection

### Subscriber Pattern (Events)

```typescript
EventEmitter.subscribe(callback): UnsubscribeFn
```

Enables UI updates without tight coupling. Supports both sync and async subscribers.

### Command Structure Pattern

Each command follows:
1. Load/merge config
2. Resolve transport
3. Connect to MCP/create session
4. Run core logic
5. Format output (CLI/JSON/CI modes)
6. Close connection safely
7. Exit with appropriate code

## Important Code Conventions

### Path Aliases

Use `@/` for imports instead of relative paths:

```typescript
import { loadConfig } from '@/config/loader';
import { RuntimeEventEmitter } from '@/events/emitter';
```

Configured in `tsconfig.json` and resolved by `tsc-alias` during build.

### Event Emission Pattern

Always emit events for significant actions:

```typescript
eventEmitter.emit('TOOL_EXECUTION_STARTED', {
  toolName,
  input,
  timestamp: Date.now()
});
```

Use typed event names from `event-type.ts` and typed payloads from `payloads/`.

### Error Handling

Use custom error types from `utils/errors.ts`:
- `ConfigurationError`: Config validation failures
- `EventStoreError`: Event persistence issues

All commands wrapped by `command-error-handler.ts` for consistent error UX.

### Testing Conventions

- Test files: `*.test.ts` co-located with source files
- Use Vitest with `describe`/`it`/`expect`
- Test helper files: `__test-helpers__.ts`
- Coverage target: Focus on runtime engines and command logic

## Data Flow Examples

### `syrin dev` Flow

```
User runs: syrin dev --exec
→ Load local+global config (merger.ts)
→ Create EventEmitter with FileEventStore
→ Create MCPClientManager (HTTP or Stdio)
→ Create LLMProvider from config
→ Create DevSession (session.ts)
→ Start InteractiveREPL

User types query
→ REPL sends to DevSession.processInput()
→ LLMProvider.chat(history, tools)
→ Emit: LLM_CONTEXT_BUILT, LLM_PROPOSED_TOOL_CALL
→ MCPClientManager.executeTool() → Emit: TOOL_EXECUTION_*
→ Emit: VALIDATION_*, SESSION_COMPLETED
→ ChatUI formats and displays results
→ Events persisted to .syrin/events/{sessionId}.jsonl
```

### `syrin analyse` Flow

```
User runs: syrin analyse
→ Load config, resolve transport
→ Connect to MCP server
→ analyseTools(client):
  → loadMCPTools()
  → normalizeTools()
  → buildIndexes()
  → inferDependencies()
  → runRules() [40+ rules]
→ displayAnalysisResult(result, { json?, ci?, graph? })
→ Exit with code 0 (pass) or 1 (fail)
```

### `syrin test` Flow

```
User runs: syrin test --tool <name>
→ Load config
→ TestOrchestrator.runTests()
→ loadAllContracts() from tools/*.yaml
→ For each contract:
  → SandboxExecutor.execute()
  → BehaviorObserver tracks side effects
  → validateOutputStructure()
  → runContractTests()
  → Generate Diagnostics (E200-E600)
→ displayTestResults()
→ Verdict (pass/pass-with-warnings/fail)
```

## Integration Points

### Config → Runtime
Config provides transport type, credentials, LLM defaults. Schema validation ensures valid state before runtime initialization.

### Runtime → Events
Every significant action emits typed events. Events provide complete audit trail. Test/analysis failures generate diagnostic events.

### Events → Presentation
Event formatters in presentation layer support multiple output modes (CLI, JSON, CI). ChatUI subscribes to events for real-time updates.

### MCP ↔ LLM ↔ Validation
MCP provides tools → LLM proposes tool calls → Validation checks calls before execution → Events record decision authority chain.

## Tool Contract Testing (v1.3.0+)

Tool contracts define behavioral guarantees in `tools/<tool-name>.yaml`:

```yaml
version: 1
tool: fetch_user

contract:
  input_schema: FetchUserRequest
  output_schema: User

guarantees:
  side_effects: none
  max_output_size: 10kb
```

Testing validates:
- Side effects detection
- Output size limits
- Non-determinism
- Schema compliance
- Hidden dependencies

## Configuration Management (v1.4.0+)

### Global vs Local Config

**Global Config** (`~/.syrin/syrin.yaml`):
- LLM providers only
- Shared across projects
- User-wide defaults

**Local Config** (`syrin.yaml`):
- Complete configuration (transport, MCP connection, LLM)
- Project-specific
- Overrides global settings

### Config Command Usage

```bash
# Set up global configuration
syrin config setup --global

# Set API keys in global .env
syrin config edit-env --global

# Set provider settings
syrin config set openai.model "gpt-4-turbo" --global

# View config
syrin config list --global
```

## Development Tips

### Adding New Commands

1. Create command handler in `src/cli/commands/<name>.ts`
2. Implement command logic using existing patterns
3. Add unit tests in `src/cli/commands/<name>.test.ts`
4. Register command in `src/cli/index.ts`
5. Add presentation formatter in `src/presentation/<name>-ui.ts` if needed

### Adding New Analysis Rules

1. Create rule file in `src/runtime/analysis/rules/<category>/`
2. Extend `BaseRule` class
3. Implement `check(ctx: AnalysisContext): Diagnostic[]`
4. Add rule to `ALL_RULES` in `src/runtime/analysis/rules/index.ts`
5. Add tests in co-located `.test.ts` file

### Adding New LLM Providers

1. Create provider class in `src/runtime/llm/<provider>.ts`
2. Implement `LLMProvider` interface
3. Add factory case in `src/runtime/llm/factory.ts`
4. Update config schema in `src/config/schema.ts`
5. Add environment variable to `env-checker.ts`
6. Add tests in `src/runtime/llm/<provider>.test.ts`

### Working with Events

- Always emit events for state changes
- Use typed event names from `event-type.ts`
- Create typed payloads in `payloads/` if needed
- Subscribe to events in UI layer for real-time updates
- Events are persisted to `.syrin/events/` for audit trails

## Common Gotchas

1. **Path Resolution**: Always use `@/` aliases, never relative paths beyond parent directory
2. **Template Copying**: Run `npm run build` after modifying `syrin.template.yaml` (manual copy step)
3. **Event Sequence**: Event emitter auto-increments sequence numbers per session
4. **Config Merging**: Local LLM config overrides global's default provider but keeps other global providers
5. **Transport Resolution**: Stdio spawns process, HTTP connects to existing server
6. **Opaque Types**: Use factory functions (`makeSessionID`), never cast strings directly
7. **Error Codes**: E100-E600 for errors, W100-W300 for warnings (strict mode converts warnings to errors)

## Documentation

- Main docs: https://docs.syrin.dev
- Commands: `docs/Commands/`
- Configuration: Referenced in README.md
- Tool Contracts: `docs/tool-contracts.md`
