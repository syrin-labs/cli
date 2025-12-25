# Syrin Implementation Plan

## 1. High-Level Architecture

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    CLI Layer                            │
│  (Commands: init, inspect, test, list, dev)             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 Runtime Layer                           │
│  (State Machine, Workflow Engine, Validation)           │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Event System (Core)                        │
│  (Emitter, Store, Types, Payloads)                      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Adapter Layer                              │
│  (MCP Protocol Adapter, Transport Adapters)             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Transport Layer                            │
│  (stdio, HTTP, WebSocket)                               │
└─────────────────────────────────────────────────────────┘
```

### Core Principles Enforcement

1. **Runtime Authority**: All tool calls go through validation layer
2. **Event-First**: Every action emits an event before execution
3. **Determinism**: Event sequence is deterministic and replayable
4. **Language Agnostic**: Adapters handle language-specific concerns
5. **Project-Local**: Runtime owns process lifecycle

---

## 2. Project Structure

```
src/
├── cli/                          # CLI command implementations
│   ├── commands/
│   │   ├── init.ts              # Project initialization
│   │   ├── inspect.ts           # Configuration validation
│   │   ├── test.ts              # Connection testing
│   │   ├── list.ts              # Discovery commands
│   │   ├── dev.ts               # Dev mode execution
│   │   ├── version.ts           # Version display
│   │   └── update.ts            # Update mechanism
│   ├── prompts/                 # Interactive prompts
│   │   ├── init-prompt.ts
│   │   └── dev-prompt.ts
│   └── index.ts                 # CLI entry point
│
├── config/                       # Configuration management
│   ├── schema.ts                # Config schema validation
│   ├── loader.ts                # Config file loader
│   ├── validator.ts             # Config validation logic
│   └── types.ts                 # Config type definitions
│
├── events/                       # Event system (existing)
│   ├── emitter.ts               # ✅ Already implemented
│   ├── event-type.ts            # ⚠️ Needs expansion (36 types)
│   ├── payloads.ts              # ⚠️ Needs expansion (36 payloads)
│   ├── store.ts                 # ✅ Interface exists
│   ├── store/
│   │   ├── memory-store.ts      # In-memory implementation
│   │   ├── file-store.ts        # File-based persistence
│   │   └── index.ts
│   └── types.ts                 # ✅ Already implemented
│
├── runtime/                      # Runtime intelligence engine
│   ├── state-machine.ts         # Execution state machine
│   ├── workflow/
│   │   ├── engine.ts            # Workflow execution engine
│   │   ├── graph.ts             # Dependency graph
│   │   ├── step.ts              # Step execution logic
│   │   └── types.ts
│   ├── validation/
│   │   ├── tool-validator.ts    # Tool call validation
│   │   ├── guardrails.ts       # Guardrail enforcement
│   │   ├── loop-detector.ts    # Infinite loop detection
│   │   └── budget-tracker.ts   # Call budget tracking
│   ├── session/
│   │   ├── session-manager.ts   # Session lifecycle
│   │   ├── session.ts           # Session state
│   │   └── types.ts
│   └── index.ts
│
├── adapters/                     # Language/protocol adapters
│   ├── mcp/
│   │   ├── protocol.ts          # MCP protocol implementation
│   │   ├── message-handler.ts   # Message parsing/handling
│   │   ├── tool-registry.ts     # Tool discovery & registration
│   │   └── types.ts
│   └── llm/
│       ├── provider.ts          # LLM provider interface
│       ├── openai.ts            # OpenAI adapter
│       ├── claude.ts            # Claude adapter
│       ├── llama.ts            # Llama/Ollama adapter
│       └── types.ts
│
├── transport/                    # Transport layer implementations
│   ├── base.ts                  # Base transport interface
│   ├── stdio.ts                 # stdio transport
│   ├── http.ts                  # HTTP transport
│   ├── websocket.ts             # WebSocket transport (future)
│   └── types.ts
│
├── tool-registry/                # Tool management
│   ├── registry.ts              # Tool registry implementation
│   ├── discovery.ts             # Tool discovery logic
│   ├── validator.ts             # Tool schema validation
│   └── types.ts
│
├── context/                      # LLM context management
│   ├── builder.ts               # Context construction
│   ├── mutator.ts               # Context mutations
│   └── types.ts
│
├── testing/                      # Testing & assertions
│   ├── assertion-engine.ts     # Assertion evaluation
│   ├── replay.ts               # Event replay mechanism
│   └── types.ts
│
├── utils/                        # Shared utilities
│   ├── logger.ts                # Structured logging
│   ├── errors.ts                # Error types & handling
│   ├── process-manager.ts       # Process lifecycle management
│   └── validation.ts            # General validation helpers
│
├── types/                        # Type system (existing)
│   ├── ids.ts                   # ✅ Already implemented
│   ├── factories.ts             # ✅ Already implemented
│   └── opaque.ts                # ✅ Already implemented
│
└── index.ts                      # Main entry point
```

---

## 3. Core Components Design

### 3.1 Event System Expansion

**Current State**: 6 event types implemented
**Target State**: 36 event types across 10 categories

**Implementation Strategy**:

1. Expand `EventType` enum with all 36 types
2. Create payload interfaces for each event type
3. Organize payloads by category in separate files:
   - `payloads/session.ts`
   - `payloads/workflow.ts`
   - `payloads/llm.ts`
   - `payloads/validation.ts`
   - `payloads/tool.ts`
   - `payloads/transport.ts`
   - `payloads/registry.ts`
   - `payloads/testing.ts`
   - `payloads/diagnostics.ts`

**Event Store Implementations**:

- `MemoryStore`: In-memory for dev/testing
- `FileStore`: Persistent JSON/JSONL storage in `.syrin/events/`

### 3.2 Runtime State Machine

**State Definition**:

```typescript
enum ExecutionState {
  INIT,
  SESSION_STARTED,
  PROMPT_VARIANT_STARTED,
  CONTEXT_BUILT,
  LLM_PROPOSED,
  VALIDATION_STARTED,
  VALIDATION_PASSED,
  TOOL_EXECUTION_STARTED,
  TOOL_EXECUTION_COMPLETED,
  POST_TOOL_LLM,
  SESSION_COMPLETED,
  SESSION_HALTED,
}
```

**State Machine Rules**:

- Explicit transition validation
- No implicit state changes
- Event emission on every transition
- Rollback capability on invalid transitions

### 3.3 Workflow Engine

**Components**:

- **Graph Builder**: Constructs dependency graph from workflow definition
- **Step Executor**: Executes steps respecting dependencies
- **Dependency Resolver**: Validates dependencies before step execution

**Workflow Definition Format**:

```typescript
interface WorkflowDefinition {
  workflow_id: WorkflowID;
  steps: StepDefinition[];
  dependencies: Dependency[];
}
```

### 3.4 Validation & Guardrails

**Validation Pipeline**:

1. **Tool Call Validation**:
   - Schema validation (arguments match tool definition)
   - Permission checks
   - Resource availability

2. **Guardrails**:
   - Call budget enforcement
   - Loop detection (pattern matching on tool call sequences)
   - Rate limiting
   - Timeout enforcement

3. **Validation Events**:
   - `TOOL_CALL_VALIDATION_STARTED`
   - `TOOL_CALL_VALIDATION_PASSED`
   - `TOOL_CALL_VALIDATION_FAILED`

### 3.5 MCP Protocol Adapter

**Responsibilities**:

- Parse MCP protocol messages
- Handle initialization handshake
- Tool discovery via `tools/list`
- Resource discovery via `resources/list`
- Prompt discovery via `prompts/list`
- Message routing (requests/responses)

**MCP Message Types**:

- Initialize
- Tools/List
- Tools/Call
- Resources/List
- Resources/Read
- Prompts/List
- Prompts/Get

### 3.6 Transport Layer

**Base Interface**:

```typescript
interface Transport {
  initialize(): Promise<void>;
  send(message: MCPMessage): Promise<void>;
  receive(): Promise<MCPMessage>;
  onMessage(handler: (message: MCPMessage) => void): void;
  close(): Promise<void>;
}
```

**Implementations**:

- **StdioTransport**: Wraps child process stdio
- **HttpTransport**: HTTP client/server for MCP
- **WebSocketTransport**: WebSocket support (future)

### 3.7 LLM Provider Abstraction

**Provider Interface**:

```typescript
interface LLMProvider {
  generate(context: LLMContext): Promise<LLMResponse>;
  stream?(context: LLMContext): AsyncIterable<LLMChunk>;
}
```

**Implementations**:

- **OpenAIProvider**: OpenAI API integration
- **ClaudeProvider**: Anthropic API integration
- **LlamaProvider**: Local Ollama integration

### 3.8 Configuration System

**Config Schema** (using Zod for validation):

- Project metadata
- Transport configuration
- Script definitions
- LLM provider configurations
- Tool registry settings

**Config File Management**:

- Load from `.syrin/config.yaml`
- Validate against schema
- Provide helpful error messages
- Support environment variable interpolation

---

## 4. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Core event system and basic infrastructure

**Tasks**:

1. ✅ Expand event types to all 36 types
2. ✅ Create all payload interfaces
3. ✅ Implement FileStore for event persistence
4. ✅ Build configuration system (schema, loader, validator)
5. ✅ Create base error types and error handling
6. ✅ Set up structured logging

**Deliverables**:

- Complete event system
- Config system working
- Basic CLI structure

### Phase 2: CLI Commands (Week 2-3)

**Goal**: All CLI commands functional

**Tasks**:

1. Implement `syrin init` (interactive setup)
2. Implement `syrin inspect` (validation)
3. Implement `syrin test` (connection testing)
4. Implement `syrin list` (discovery commands)
5. Implement `syrin version` and `syrin update`
6. CLI argument parsing (use `commander` or `yargs`)

**Deliverables**:

- All CLI commands working
- Interactive prompts
- Validation feedback

### Phase 3: Transport Layer (Week 3-4)

**Goal**: Support stdio and HTTP transports

**Tasks**:

1. Implement base Transport interface
2. Implement StdioTransport
3. Implement HttpTransport
4. Transport event emission
5. Connection testing logic

**Deliverables**:

- Both transports working
- Connection testing functional

### Phase 4: MCP Protocol Adapter (Week 4-5)

**Goal**: Full MCP protocol support

**Tasks**:

1. MCP message parsing
2. Protocol handshake handling
3. Tool discovery implementation
4. Resource discovery implementation
5. Prompt discovery implementation
6. Message routing

**Deliverables**:

- MCP protocol fully supported
- Tool/resource/prompt discovery working

### Phase 5: Runtime Engine (Week 5-7)

**Goal**: State machine and workflow engine

**Tasks**:

1. State machine implementation
2. Session management
3. Workflow engine
4. Dependency resolution
5. Step execution logic

**Deliverables**:

- Runtime engine functional
- State transitions working
- Workflow execution working

### Phase 6: Validation & Guardrails (Week 7-8)

**Goal**: Runtime authority enforcement

**Tasks**:

1. Tool call validation
2. Loop detection algorithm
3. Call budget tracking
4. Guardrail enforcement
5. Validation event emission

**Deliverables**:

- All validation working
- Guardrails enforced
- Safety mechanisms active

### Phase 7: LLM Integration (Week 8-9)

**Goal**: Multi-LLM provider support

**Tasks**:

1. LLM provider abstraction
2. OpenAI integration
3. Claude integration
4. Llama/Ollama integration
5. Context building
6. Response parsing

**Deliverables**:

- All LLM providers working
- Context management functional

### Phase 8: Dev Mode (Week 9-10)

**Goal**: Interactive dev mode

**Tasks**:

1. Process management (spawn MCP server)
2. Interactive prompt loop
3. Real-time event display
4. Tool execution visualization
5. LLM response display
6. History navigation

**Deliverables**:

- Dev mode fully functional
- Interactive experience polished

### Phase 9: Testing & Assertions (Week 10-11)

**Goal**: Deterministic testing framework

**Tasks**:

1. Assertion engine
2. Event replay mechanism
3. Test execution
4. Assertion event emission

**Deliverables**:

- Testing framework working
- Assertions functional

### Phase 10: Polish & Documentation (Week 11-12)

**Goal**: Production readiness

**Tasks**:

1. Error message improvements
2. Performance optimization
3. Comprehensive error handling
4. Documentation
5. Example projects
6. Integration tests

**Deliverables**:

- Production-ready tool
- Complete documentation

---

## 5. Dependencies

### Core Dependencies

```json
{
  "dependencies": {
    // CLI
    "commander": "^11.0.0", // CLI argument parsing
    "inquirer": "^9.2.0", // Interactive prompts
    "chalk": "^5.3.0", // Terminal colors
    "ora": "^7.0.0", // Spinners

    // Configuration
    "js-yaml": "^4.1.0", // YAML parsing
    "zod": "^3.22.0", // Schema validation
    "dotenv": "^16.3.0", // Environment variables

    // HTTP/Transport
    "node-fetch": "^3.3.0", // HTTP client
    "ws": "^8.14.0", // WebSocket support

    // Process Management
    "execa": "^8.0.0", // Process execution
    "tree-kill": "^1.2.2", // Process termination

    // LLM Providers
    "openai": "^4.20.0", // OpenAI SDK
    "@anthropic-ai/sdk": "^0.20.0", // Claude SDK

    // Utilities
    "uuid": "^9.0.0", // UUID generation
    "date-fns": "^3.0.0", // Date utilities
    "lodash": "^4.17.21" // Utilities (if needed)
  },
  "devDependencies": {
    // Testing
    "vitest": "^1.0.0", // Test framework
    "@vitest/ui": "^1.0.0", // Test UI
    "tsx": "^4.7.0", // TypeScript execution

    // Type definitions
    "@types/node": "^20.10.0",
    "@types/inquirer": "^9.0.0",
    "@types/js-yaml": "^4.0.0",
    "@types/uuid": "^9.0.0",
    "@types/lodash": "^4.14.0"
  }
}
```

---

## 6. Testing Strategy

### Unit Tests

- Event system (emission, storage, retrieval)
- State machine transitions
- Validation logic
- Workflow engine
- Configuration parsing
- Transport implementations

### Integration Tests

- CLI commands end-to-end
- MCP protocol adapter
- LLM provider integrations
- Transport layer with real MCP servers
- Full execution flow

### Test Structure

```
tests/
├── unit/
│   ├── events/
│   ├── runtime/
│   ├── validation/
│   └── utils/
├── integration/
│   ├── cli/
│   ├── transport/
│   ├── mcp/
│   └── llm/
└── fixtures/
    ├── mcp-servers/
    └── configs/
```

### Testing Principles

- Test against events, not implementation details
- Deterministic test execution
- Mock external dependencies (LLM APIs, MCP servers)
- Test state machine transitions
- Test error scenarios

---

## 7. Error Handling Strategy

### Error Hierarchy

```typescript
// Base error
class SyrinError extends Error {
  code: string;
  event?: EventEnvelope; // Associated event if any
}

// Category errors
class ConfigurationError extends SyrinError {}
class TransportError extends SyrinError {}
class ValidationError extends SyrinError {}
class RuntimeError extends SyrinError {}
class AdapterError extends SyrinError {}
```

### Error Handling Principles

1. **Always emit events**: Errors should emit diagnostic events
2. **Graceful degradation**: Don't crash, emit `SESSION_HALTED`
3. **Error context**: Include relevant context in error messages
4. **Recovery**: Attempt recovery where possible
5. **User-friendly messages**: Technical details in logs, user-friendly in CLI

### Error Events

- `RUNTIME_ERROR`: Internal runtime failures
- `ADAPTER_ERROR`: Adapter-level failures
- `TRANSPORT_ERROR`: Transport failures
- `TOOL_EXECUTION_FAILED`: Tool execution failures
- `SESSION_HALTED`: Unrecoverable failures

---

## 8. Configuration Management

### Config Schema (Zod)

```typescript
const ConfigSchema = z.object({
  version: z.string(),
  project_name: z.string(),
  agent_name: z.string(),
  transport: z.enum(['stdio', 'http']),
  mcp_url: z.string().optional(),
  command: z.string().optional(),
  script: z.object({
    dev: z.string(),
    start: z.string(),
  }),
  llm: z.record(
    z.object({
      API_KEY: z.string(),
      MODEL_NAME: z.string(),
      default: z.boolean().optional(),
      provider: z.string().optional(),
      command: z.string().optional(),
    })
  ),
});
```

### Config Loading Strategy

1. Load from `.syrin/config.yaml`
2. Validate against schema
3. Interpolate environment variables
4. Provide helpful validation errors
5. Support config inheritance (future)

---

## 9. Best Practices & Patterns

### Code Organization

1. **Separation of Concerns**: Clear boundaries between layers
2. **Dependency Injection**: Use interfaces, not concrete implementations
3. **Immutable Events**: Events are append-only, never modified
4. **Type Safety**: Leverage TypeScript's type system fully
5. **Error Handling**: Explicit error types, no silent failures

### Performance Considerations

1. **Event Streaming**: Stream events to file, don't buffer all in memory
2. **Lazy Loading**: Load tool registry on demand
3. **Connection Pooling**: Reuse HTTP connections
4. **Async Operations**: All I/O operations async

### Security Considerations

1. **API Key Management**: Never log API keys
2. **Process Isolation**: Isolate MCP server processes
3. **Input Validation**: Validate all external inputs
4. **Sandboxing**: Consider sandboxing tool execution (future)

### Maintainability

1. **Documentation**: JSDoc for all public APIs
2. **Examples**: Example projects and use cases
3. **Logging**: Structured logging with levels
4. **Versioning**: Semantic versioning for releases

---

## 10. Key Design Decisions

### 1. Event Store Format

**Decision**: JSONL (JSON Lines) format
**Rationale**:

- Append-only, easy to stream
- Human-readable
- Easy to parse line-by-line
- Supports large event streams

### 2. Configuration Format

**Decision**: YAML
**Rationale**:

- Human-readable
- Supports comments
- Common in dev tools
- Easy to edit

### 3. CLI Framework

**Decision**: Commander.js
**Rationale**:

- Mature and stable
- Good TypeScript support
- Extensible
- Well-documented

### 4. Schema Validation

**Decision**: Zod
**Rationale**:

- TypeScript-first
- Runtime validation
- Type inference
- Good error messages

### 5. Process Management

**Decision**: execa
**Rationale**:

- Better than child_process
- Promise-based
- Cross-platform
- Good stdio handling

---

## 11. Future Considerations

### Phase 11+ (Post-MVP)

1. **WebSocket Transport**: Full WebSocket support
2. **UI Dashboard**: Web-based event viewer
3. **Event Replay**: Full execution replay from events
4. **Distributed Execution**: Multi-server coordination
5. **Advanced Analytics**: Event pattern analysis
6. **Plugin System**: Extensible adapters
7. **Cloud Integration**: Remote execution support

---

## 12. Success Metrics

### Technical Metrics

- All 36 event types implemented
- All CLI commands functional
- Both transports working
- All LLM providers integrated
- State machine transitions validated
- Workflow engine functional

### Quality Metrics

- Test coverage > 80%
- Zero critical bugs
- All error scenarios handled
- Performance acceptable (< 100ms event emission overhead)

### User Experience Metrics

- Setup time < 5 minutes
- Clear error messages
- Helpful validation feedback
- Smooth dev mode experience

---

## Next Steps

1. **Review this plan** with the team
2. **Prioritize phases** based on requirements
3. **Set up project structure** (create directories)
4. **Install dependencies**
5. **Begin Phase 1** (Event system expansion)

---

## Questions to Resolve

1. **Event Storage**: File-based only, or also support database?
2. **Update Mechanism**: How to implement `syrin update`? (npm registry? GitHub releases?)
3. **Version Management**: How to track Syrin version? (package.json? separate version file?)
4. **Tool Sandboxing**: Should tool execution be sandboxed? (Phase 1 or later?)
5. **Multi-session**: Support multiple concurrent sessions? (Phase 1 or later?)
6. **Event Retention**: How long to keep events? (Configurable? Unlimited?)
