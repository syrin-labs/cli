# Syrin Dev Mode Implementation Plan

## Overview

The `syrin dev` command provides an interactive development environment where developers can test MCP tools through natural language interactions with LLMs. This is the core feature that enables developers to see how their MCP tools perform in real-world scenarios.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI Layer (dev.ts)                        │
│  - Parse arguments (--exec, --llm)                          │
│  - Load config and resolve LLM provider                      │
│  - Initialize DevMode session                                │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Dev Mode Runtime (dev-mode.ts)                  │
│  - Interactive REPL with history                            │
│  - Conversation state management                             │
│  - Tool call orchestration                                   │
│  - Output formatting and logging                             │
│  - Event emission for stack traces                          │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌─────────▼──────────┐
│  MCP Client     │      │  LLM Provider     │
│  Manager        │      │  Abstraction      │
│  - Connection   │      │  - OpenAI         │
│  - Tool calls   │      │  - Claude         │
│  - Resources    │      │  - Ollama (local) │
└─────────────────┘      └───────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌─────────▼──────────┐
│  Event System  │      │  Event Store       │
│  - Emitter     │      │  - Memory Store    │
│  - Types       │      │  - File Store      │
│  - Payloads    │      │  - Replay          │
└─────────────────┘      └───────────────────┘
```

## Implementation Phases

### Phase 1: Core Infrastructure

#### 1.1 LLM Provider Abstraction (`src/runtime/llm/`)

**Purpose**: Create a unified interface for different LLM providers to enable easy switching and extension.

**Files**:

- `src/runtime/llm/types.ts` - Type definitions
- `src/runtime/llm/provider.ts` - Base provider interface
- `src/runtime/llm/openai.ts` - OpenAI implementation
- `src/runtime/llm/claude.ts` - Claude (Anthropic) implementation
- `src/runtime/llm/ollama.ts` - Ollama (local) implementation
- `src/runtime/llm/factory.ts` - Provider factory
- `src/runtime/llm/index.ts` - Exports

**Key Interfaces**:

```typescript
interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LLMResponse {
  content: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface LLMRequest {
  messages: LLMMessage[];
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: unknown;
  }>;
  temperature?: number;
  maxTokens?: number;
}

interface LLMProvider {
  chat(request: LLMRequest): Promise<LLMResponse>;
  supportsToolCalls(): boolean;
  getName(): string;
}
```

**Implementation Notes**:

- Use official SDKs: `openai` for OpenAI, `@anthropic-ai/sdk` for Claude
- For Ollama, use HTTP API calls to local endpoint (default: `http://localhost:11434`)
- Handle API key loading from environment variables (using existing `env-checker.ts`)
- Support streaming responses for better UX (optional enhancement)

#### 1.2 MCP Client Manager (`src/runtime/mcp/client-manager.ts`)

**Purpose**: Manage MCP client connections and tool execution lifecycle with event emission.

**Key Functions**:

- `connectToMCPServer(eventEmitter)` - Establish connection (HTTP or stdio)
  - Emit `TRANSPORT_INITIALIZED` on success
  - Emit `TRANSPORT_ERROR` on failure
- `getAvailableTools()` - List tools from MCP server
- `executeTool(name, args, eventEmitter)` - Execute a tool call
  - Emit `TRANSPORT_MESSAGE_SENT` before sending request
  - Emit `TRANSPORT_MESSAGE_RECEIVED` on response
  - Emit `TRANSPORT_ERROR` on errors
- `disconnect()` - Clean up connection

**Implementation Notes**:

- Reuse `getConnectedClient()` from `connection.ts` for HTTP
- For stdio transport, spawn process and manage stdio streams
- Handle tool execution errors gracefully
- Support both execution mode (actual execution) and preview mode (dry-run)
- Emit transport events for all MCP protocol interactions

#### 1.3 Interactive REPL (`src/runtime/dev/repl.ts`)

**Purpose**: Provide command-line interface with history, autocomplete, and navigation.

**Features**:

- Input prompt with customizable prefix
- Command history (up/down arrows)
- Multi-line input support
- Special commands (`/exit`, `/clear`, `/help`, `/tools`, `/history`)
- Ctrl+C handling for graceful exit

**Implementation**:

- Use `readline` interface from Node.js
- Store history in memory (optionally persist to file)
- Support ANSI colors for better UX

### Phase 2: Dev Mode Core

#### 2.1 Event System Integration

**Purpose**: Emit events at key points to enable stack traces, debugging, and event replay.

**Event Emission Points**:

1. **Session Lifecycle**:
   - `SESSION_STARTED` - When dev mode starts
   - `SESSION_COMPLETED` - When dev mode exits gracefully
   - `SESSION_HALTED` - When dev mode exits with error

2. **Transport Layer**:
   - `TRANSPORT_INITIALIZED` - When MCP connection established
   - `TRANSPORT_MESSAGE_SENT` - When sending messages to MCP
   - `TRANSPORT_MESSAGE_RECEIVED` - When receiving messages from MCP
   - `TRANSPORT_ERROR` - On transport errors

3. **LLM Interactions**:
   - `LLM_CONTEXT_BUILT` - Before sending to LLM (with tools, history)
   - `LLM_PROPOSED_TOOL_CALL` - When LLM proposes a tool call
   - `LLM_FINAL_RESPONSE_GENERATED` - When LLM generates final response
   - `POST_TOOL_LLM_PROMPT_BUILT` - After tool execution, before sending back to LLM

4. **Tool Execution**:
   - `TOOL_EXECUTION_STARTED` - When tool execution begins
   - `TOOL_EXECUTION_COMPLETED` - When tool execution succeeds
   - `TOOL_EXECUTION_FAILED` - When tool execution fails

5. **Validation**:
   - `TOOL_CALL_VALIDATION_STARTED` - Before validating tool call
   - `TOOL_CALL_VALIDATION_PASSED` - When validation succeeds
   - `TOOL_CALL_VALIDATION_FAILED` - When validation fails

6. **Diagnostics**:
   - `RUNTIME_ERROR` - On runtime errors
   - `ADAPTER_ERROR` - On adapter/MCP errors

**Implementation**:

- Initialize `RuntimeEventEmitter` with session ID
- Use `MemoryEventStore` for dev mode (fast, in-memory)
- Option to use `FileStore` for persistence (optional flag)
- Generate unique session ID for each dev session

#### 2.2 Dev Mode Session (`src/runtime/dev/session.ts`)

**Purpose**: Manage conversation state and orchestrate LLM-MCP interactions with event emission.

**Key Components**:

```typescript
interface DevSession {
  // Configuration
  config: SyrinConfig;
  llmProvider: LLMProvider;
  mcpClient: Client;
  executionMode: boolean;

  // Event System
  eventEmitter: RuntimeEventEmitter;
  eventStore: EventStore;
  sessionId: SessionID;

  // State
  conversationHistory: LLMMessage[];
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
    timestamp: Date;
  }>;

  // Statistics
  totalToolCalls: number;
  totalLLMCalls: number;
  startTime: Date;

  // Methods
  processUserInput(input: string): Promise<void>;
  executeToolCall(toolCall: ToolCall): Promise<unknown>;
  formatOutput(): void;
  getEventStack(): EventEnvelope[]; // For stack traces
}
```

**Flow with Events**:

1. **Session Start**: Emit `SESSION_STARTED`
2. **MCP Connection**: Emit `TRANSPORT_INITIALIZED`
3. **User Input**: User enters input
4. **Build Context**: Emit `LLM_CONTEXT_BUILT` with tools and history
5. **LLM Request**: Send to LLM → Emit `TRANSPORT_MESSAGE_SENT` (if applicable)
6. **LLM Response**: Receive from LLM → Emit `TRANSPORT_MESSAGE_RECEIVED`
7. **Tool Call Detection**: If tool calls detected → Emit `LLM_PROPOSED_TOOL_CALL`
8. **Validation**: Emit `TOOL_CALL_VALIDATION_STARTED` → `TOOL_CALL_VALIDATION_PASSED/FAILED`
9. **Tool Execution**:
   - Emit `TOOL_EXECUTION_STARTED`
   - Execute tool (if `--exec` mode)
   - Emit `TOOL_EXECUTION_COMPLETED` or `TOOL_EXECUTION_FAILED`
10. **Post-Tool Context**: Emit `POST_TOOL_LLM_PROMPT_BUILT`
11. **Final Response**: Emit `LLM_FINAL_RESPONSE_GENERATED`
12. **Display**: Show response to user
13. **Session End**: Emit `SESSION_COMPLETED` or `SESSION_HALTED`

#### 2.3 Tool Call Detection and Execution (`src/runtime/dev/tool-handler.ts`)

**Purpose**: Detect tool calls from LLM responses and execute them with event emission.

**Implementation**:

- Parse LLM response for tool calls (format depends on provider)
- **Emit `LLM_PROPOSED_TOOL_CALL`** for each detected tool call
- **Emit `TOOL_CALL_VALIDATION_STARTED`** before validation
- Validate tool call arguments against tool schema
- **Emit `TOOL_CALL_VALIDATION_PASSED`** or `TOOL_CALL_VALIDATION_FAILED`
- **Emit `TOOL_EXECUTION_STARTED`** before execution
- Execute tool via MCP client (if `--exec` mode)
- **Emit `TOOL_EXECUTION_COMPLETED`** with result and duration
- **Emit `TOOL_EXECUTION_FAILED`** on errors with error details
- Format tool response for LLM
- Handle errors gracefully

**Tool Call Formats**:

- **OpenAI**: Uses function calling format with `tool_calls` array
- **Claude**: Uses structured output with tool use format
- **Ollama**: May need custom prompt engineering or use function calling if supported

#### 2.4 Output Formatting (`src/runtime/dev/formatter.ts`)

**Purpose**: Format all output for developer-friendly display.

**Output Sections**:

1. **Header**: Version, transport, MCP URL, LLM provider, tool count
2. **User Input**: Display user's message
3. **Tool Detection**: Show detected tools and arguments
4. **Tool Execution**: Logs and results
5. **LLM Response**: Final response from LLM

**Formatting Features**:

- Color-coded output (tools, errors, success)
- Timestamps for tool calls
- JSON pretty-printing
- Truncation for long outputs (with expand option)
- Progress indicators for long-running operations

#### 2.5 Stack Trace Generation (`src/runtime/dev/stack-trace.ts`)

**Purpose**: Generate stack traces from event sequence for debugging.

**Features**:

- Reconstruct execution flow from events
- Show event sequence with timestamps
- Highlight errors and their context
- Display tool call chain
- Show LLM interaction history

**Implementation**:

```typescript
interface StackTrace {
  sessionId: SessionID;
  events: EventEnvelope[];
  errorEvent?: EventEnvelope;
  toolCallChain: Array<{
    toolName: string;
    eventId: EventID;
    timestamp: ISO8601Timestamp;
  }>;
}

function generateStackTrace(
  eventStore: EventStore,
  sessionId: SessionID,
  errorEventId?: EventID
): StackTrace {
  // Load all events for session
  // Find error event if provided
  // Build tool call chain
  // Return formatted stack trace
}
```

### Phase 3: CLI Integration

#### 3.1 Dev Command (`src/cli/commands/dev.ts`)

**Purpose**: CLI entry point for dev mode.

**Command Structure**:

```bash
syrin dev [options]

Options:
  --exec              Execute tool calls (default: preview mode)
  --llm <provider>   Override default LLM (e.g., openai, claude, ollama)
  --project-root      Project root directory
  --no-color          Disable colored output
  --verbose           Show detailed logs
  --save-events       Save events to file for debugging
  --event-file <path> Path to event file (default: .syrin/events.jsonl)
```

**Implementation Flow**:

1. Parse command arguments
2. Load config from `.syrin/config.yaml`
3. Resolve LLM provider (from `--llm` or config default)
4. Validate MCP connection details (URL/command based on transport)
5. **Create session ID** (unique for this dev session)
6. **Initialize event store** (MemoryStore or FileStore if `--save-events`)
7. **Create event emitter** with session ID
8. **Emit `SESSION_STARTED` event**
9. Initialize MCP client connection (emits `TRANSPORT_INITIALIZED`)
10. Initialize LLM provider
11. Create DevMode session (with event emitter)
12. Start interactive REPL
13. **Emit `SESSION_COMPLETED` or `SESSION_HALTED` on exit**
14. Handle cleanup on exit

#### 3.2 Error Handling

**Error Scenarios**:

- Missing MCP URL/command → Clear error with fix suggestions
- LLM provider not configured → List available providers
- MCP connection failure → Retry with helpful message
- Tool execution failure → Show error but continue session
- LLM API errors → Show error and allow retry

### Phase 4: Enhanced Features

#### 4.1 Tool Logging

**Purpose**: Provide detailed logs for tool execution.

**Features**:

- Timestamp for each tool call
- Input arguments logging
- Execution time tracking
- Output logging
- Error logging with stack traces

**Format**:

```
[25/12/2025 10:10:10 > book_flight] Tool calling started!
[25/12/2025 10:10:10 > book_flight] Arguments: {"date": "26/12/2025"}
[25/12/2025 10:10:11 > book_flight] Tool calling ended!
```

#### 4.2 Conversation Management

**Features**:

- `/clear` - Clear conversation history
- `/history` - Show conversation history
- `/export` - Export conversation to file
- `/load` - Load conversation from file
- `/reset` - Reset session (keep connection)

#### 4.3 Resource Access

**Enhancement**: Allow LLM to access MCP resources for context.

**Implementation**:

- List available resources on startup
- Allow LLM to request resources
- Fetch and include in context automatically

#### 4.4 Prompt Templates

**Enhancement**: Support MCP prompts for common workflows.

**Implementation**:

- List available prompts on startup
- Allow user to invoke prompts: `/prompt <name> [args]`
- Integrate prompt results into conversation

#### 4.5 Event Replay and Debugging

**Enhancement**: Use event store for debugging and replay.

**Features**:

- `/events` - Show recent events
- `/stack` - Generate stack trace from events
- `/replay <event-id>` - Replay from specific event
- `--save-events` - Save events to file for later analysis
- Event visualization (optional)

**Implementation**:

- Use `FileEventStore` when `--save-events` flag is set
- Load events from file for replay
- Generate human-readable stack traces
- Export events as JSON for external analysis

## File Structure

```
src/
├── runtime/
│   ├── llm/                    # LLM provider abstraction
│   │   ├── types.ts
│   │   ├── provider.ts
│   │   ├── openai.ts
│   │   ├── claude.ts
│   │   ├── ollama.ts
│   │   ├── factory.ts
│   │   └── index.ts
│   │
│   ├── mcp/
│   │   ├── client-manager.ts   # MCP client lifecycle
│   │   └── stdio-transport.ts  # stdio transport support
│   │
│   └── dev/                     # Dev mode runtime
│       ├── session.ts           # Main session manager (with events)
│       ├── repl.ts              # Interactive REPL
│       ├── tool-handler.ts      # Tool call execution (with events)
│       ├── formatter.ts         # Output formatting
│       ├── stack-trace.ts       # Stack trace generation from events
│       ├── logger.ts            # Tool logging
│       └── types.ts
│
├── cli/
│   └── commands/
│       └── dev.ts               # CLI entry point
│
└── constants/
    └── dev-messages.ts          # Dev mode messages
```

## Dependencies to Add

```json
{
  "dependencies": {
    "openai": "^4.0.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "readline": "^1.3.0", // Built-in, but types needed
    "chalk": "^5.0.0", // Colors (optional, can use ANSI)
    "ora": "^7.0.0" // Spinners (optional)
  },
  "devDependencies": {
    "@types/readline": "^1.3.0"
  }
}
```

## Implementation Order

1. **Week 1: Foundation**
   - LLM provider abstraction (OpenAI first)
   - MCP client manager
   - Basic REPL

2. **Week 2: Core Dev Mode**
   - Dev session implementation
   - Tool call detection and execution
   - Basic output formatting

3. **Week 3: Integration & Polish**
   - CLI command integration
   - Error handling
   - Enhanced formatting
   - Tool logging

4. **Week 4: Enhancements**
   - Additional LLM providers (Claude, Ollama)
   - stdio transport support
   - Conversation management
   - Resource access

## Testing Strategy

### Unit Tests

- LLM provider implementations
- Tool call parsing
- Output formatting
- Error handling

### Integration Tests

- End-to-end dev mode flow
- MCP connection handling
- Tool execution flow
- LLM interaction flow

### Manual Testing

- Interactive REPL testing
- Different LLM providers
- Various tool types
- Error scenarios

## User Experience Considerations

1. **Fast Startup**: Connection and initialization should be quick
2. **Clear Feedback**: Always show what's happening
3. **Error Recovery**: Allow users to continue after errors
4. **History Navigation**: Smooth up/down arrow navigation
5. **Visual Clarity**: Use colors and formatting effectively
6. **Helpful Messages**: Clear error messages with suggestions

## Security Considerations

1. **API Keys**: Never log or expose API keys
2. **Tool Execution**: In preview mode, show what would be executed
3. **Input Validation**: Validate all tool arguments
4. **Rate Limiting**: Implement rate limiting for LLM calls
5. **Resource Limits**: Set token limits and timeouts

## Future Enhancements

1. **Streaming Responses**: Stream LLM responses for better UX
2. **Multi-turn Tool Calls**: Handle complex tool call chains
3. **Tool Call Visualization**: Visual representation of tool call flow
4. **Performance Metrics**: Track and display tool execution times
5. **Export/Import**: Save and load conversation sessions
6. **Plugin System**: Allow custom formatters and handlers
7. **Event Analytics**: Analyze event patterns for optimization
8. **Event Replay UI**: Visual interface for event replay
9. **Distributed Tracing**: Correlate events across multiple sessions
10. **Event-based Testing**: Use events for automated testing

## Event System Integration Summary

### Why Events Matter

The event system is **critical** for Dev Mode because it enables:

1. **Stack Traces**: Reconstruct execution flow from events for debugging
2. **Audit Trail**: Complete record of all interactions for analysis
3. **Replay Capability**: Replay sessions from event logs
4. **Performance Analysis**: Track timing and bottlenecks
5. **Error Debugging**: Understand error context through event sequence

### Event Emission Checklist

When implementing Dev Mode, ensure events are emitted at:

- ✅ **Session Start/End**: `SESSION_STARTED`, `SESSION_COMPLETED`, `SESSION_HALTED`
- ✅ **Transport Operations**: `TRANSPORT_INITIALIZED`, `TRANSPORT_MESSAGE_SENT/RECEIVED`, `TRANSPORT_ERROR`
- ✅ **LLM Interactions**: `LLM_CONTEXT_BUILT`, `LLM_PROPOSED_TOOL_CALL`, `LLM_FINAL_RESPONSE_GENERATED`, `POST_TOOL_LLM_PROMPT_BUILT`
- ✅ **Tool Execution**: `TOOL_EXECUTION_STARTED`, `TOOL_EXECUTION_COMPLETED`, `TOOL_EXECUTION_FAILED`
- ✅ **Validation**: `TOOL_CALL_VALIDATION_STARTED`, `TOOL_CALL_VALIDATION_PASSED/FAILED`
- ✅ **Errors**: `RUNTIME_ERROR`, `ADAPTER_ERROR`

### Event Flow Example

```
1. SESSION_STARTED
2. TRANSPORT_INITIALIZED (MCP connection)
3. LLM_CONTEXT_BUILT (with tools)
4. LLM_PROPOSED_TOOL_CALL (detected)
5. TOOL_CALL_VALIDATION_STARTED
6. TOOL_CALL_VALIDATION_PASSED
7. TOOL_EXECUTION_STARTED
8. TRANSPORT_MESSAGE_SENT (to MCP)
9. TRANSPORT_MESSAGE_RECEIVED (from MCP)
10. TOOL_EXECUTION_COMPLETED
11. POST_TOOL_LLM_PROMPT_BUILT
12. LLM_FINAL_RESPONSE_GENERATED
13. SESSION_COMPLETED
```

### Implementation Notes

- Use `RuntimeEventEmitter` initialized with a unique session ID
- Use `MemoryEventStore` by default (fast, in-memory)
- Optionally use `FileEventStore` with `--save-events` flag
- All events include sequence numbers for ordering
- Events include timestamps for timing analysis
- Error events include stack traces when available

## References

- [MCP Client Concepts](https://modelcontextprotocol.io/docs/learn/client-concepts)
- [MCP Server Concepts](https://modelcontextprotocol.io/docs/learn/server-concepts)
- [Building MCP Clients](https://modelcontextprotocol.io/docs/develop/build-client)
- [MCP TypeScript SDK](https://modelcontextprotocol.io/docs/develop/build-client#typescript)
