# Syrin

[![npm version](https://badge.fury.io/js/%40ankan-ai%2Fsyrin.svg)](https://badge.fury.io/js/%40ankan-ai%2Fsyrin)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

**Runtime intelligence system that makes MCP servers debuggable, testable, and safe to run in production.**

[Features](#features) • [Installation](#quick-install) • [Getting Started](#getting-started) • [Commands](#commands) • [Configuration](#configuration) • [Contributing](#contributing)

---

## Features

- 🔍 **Interactive Testing** - Test MCP servers with an intuitive chat interface
- 🩺 **Health Checks** - Validate your MCP configuration and setup with `doctor`
- 🧪 **Protocol Validation** - Ensure your MCP server complies with the protocol
- 📋 **Discovery** - List available tools, resources, and prompts from MCP servers
- 🚀 **Dev Mode** - Interactive development environment for testing MCP tools with LLMs
- 🔒 **Safe Execution** - Preview mode by default to prevent accidental tool execution
- 📊 **Event Tracking** - Save and analyze events for debugging and monitoring

## Quick Install

### Using npx (Recommended)

```bash
npx @ankan-ai/syrin init
```

### Global Installation

```bash
npm install -g @ankan-ai/syrin
```

Then use it directly:

```bash
syrin init
```

### Local Installation

```bash
npm install @ankan-ai/syrin
```

Then use via `npx` or add to your `package.json` scripts:

```json
{
  "scripts": {
    "syrin": "syrin"
  }
}
```

## Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 (or yarn/pnpm)

## Getting Started

1. **Initialize a new Syrin project:**

   ```bash
   syrin init
   ```

   This will create a `.syrin/config.yaml` file with your project configuration.

2. **Validate your setup:**

   ```bash
   syrin doctor
   ```

   This checks your configuration, environment variables, and MCP server setup.

3. **Test your MCP connection:**

   ```bash
   syrin test
   ```

4. **Start development mode:**

   ```bash
   syrin dev
   ```

## Commands

### `syrin init`

Initialize a new Syrin project in the current directory. This command creates a `.syrin/config.yaml` file with your project configuration.

#### Options

| Flag                    | Description                                     | Default           |
| ----------------------- | ----------------------------------------------- | ----------------- |
| `-y, --yes`             | Skip interactive prompts and use default values | `false`           |
| `--project-root <path>` | Project root directory                          | Current directory |

#### Examples

```bash
# Interactive initialization
syrin init

# Non-interactive initialization with defaults
syrin init --yes

# Initialize in a specific directory
syrin init --project-root ./my-project
```

#### What it does

- Creates `.syrin/config.yaml` configuration file
- Prompts for project name, agent name, transport type, and LLM providers
- Sets up environment variable references
- Updates `.gitignore` to exclude event files and dev history

---

### `syrin doctor`

Validate your Syrin project configuration and setup. This command checks:

- Configuration file validity
- Transport configuration (HTTP URL or stdio script)
- LLM provider API keys and model names
- Command availability for stdio transport
- Environment variable setup

#### Doctor Options

| Flag                    | Description            | Default           |
| ----------------------- | ---------------------- | ----------------- |
| `--project-root <path>` | Project root directory | Current directory |

#### Doctor Examples

```bash
# Check current directory
syrin doctor

# Check specific project
syrin doctor --project-root ./my-project
```

#### Output

The command displays a comprehensive report showing:

- ✅ Valid configurations
- ❌ Issues that need to be fixed
- 💡 Suggestions for fixing problems

---

### `syrin test`

Test MCP connection and validate protocol compliance. This command connects to your MCP server and verifies it follows the MCP protocol correctly.

#### Test Options

| Flag                    | Description                                                   | Default                        |
| ----------------------- | ------------------------------------------------------------- | ------------------------------ |
| `[url-or-script]`       | MCP URL (for http) or script (for stdio). Positional argument | From config.yaml               |
| `--transport <type>`    | Transport type: `http` or `stdio`                             | From config.yaml               |
| `--url <url>`           | MCP URL to test (for http transport)                          | From config.yaml or positional |
| `--script <script>`     | Script to test (for stdio transport)                          | From config.yaml or positional |
| `--project-root <path>` | Project root directory                                        | Current directory              |

#### Test Examples

```bash
# Test using config.yaml settings
syrin test

# Test HTTP transport with URL
syrin test http://localhost:3000
syrin test --transport http --url http://localhost:3000

# Test stdio transport with script
syrin test "python server.py"
syrin test --transport stdio --script "python server.py"

# Test in specific project
syrin test --project-root ./my-project
```

#### What it checks

- Connection to MCP server
- Protocol handshake
- Server capabilities
- Protocol compliance

---

### `syrin list`

List tools, resources, or prompts from an MCP server. This command connects to your MCP server and displays available capabilities.

#### List Options

| Flag                    | Description                                      | Default           |
| ----------------------- | ------------------------------------------------ | ----------------- |
| `[type]`                | Type to list: `tools`, `resources`, or `prompts` | `tools`           |
| `--transport <type>`    | Transport type: `http` or `stdio`                | From config.yaml  |
| `--url <url>`           | MCP URL (for http transport)                     | From config.yaml  |
| `--script <script>`     | Script (for stdio transport)                     | From config.yaml  |
| `--project-root <path>` | Project root directory                           | Current directory |

#### List Examples

```bash
# List tools (default)
syrin list
syrin list tools

# List resources
syrin list resources

# List prompts
syrin list prompts

# Override transport and connection details
syrin list tools --transport http --url http://localhost:3000
syrin list tools --transport stdio --script "python server.py"
```

#### List Output

For each type, displays:

- **Tools**: Name, description, and parameters
- **Resources**: URI templates and descriptions
- **Prompts**: Name, description, and arguments

---

### `syrin dev`

Enter interactive development mode for testing MCP tools with LLMs. This opens a chat interface where you can interact with your MCP server using natural language.

#### Dev Options

| Flag                    | Description                                                                                                               | Default           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `--exec`                | Execute tool calls (default: preview mode)                                                                                | `false`           |
| `--llm <provider>`      | Override default LLM provider (e.g., `openai`, `claude`, `ollama`)                                                        | From config.yaml  |
| `--project-root <path>` | Project root directory                                                                                                    | Current directory |
| `--save-events`         | Save events to file for debugging                                                                                         | `false`           |
| `--event-file <path>`   | Directory path for event files                                                                                            | `.syrin/events`   |
| `--run-script`          | Run script to spawn server internally. If not provided, stdio uses script automatically, http connects to existing server | `false`           |

#### Dev Examples

```bash
# Start dev mode (preview mode)
syrin dev

# Execute tool calls (not just preview)
syrin dev --exec

# Use a specific LLM provider
syrin dev --llm openai
syrin dev --llm claude
syrin dev --llm ollama

# Save events for debugging
syrin dev --save-events

# Save events to custom directory
syrin dev --save-events --event-file ./logs/events

# Spawn server internally (for HTTP transport)
syrin dev --run-script

# Combine options
syrin dev --exec --llm claude --save-events
```

#### Dev Mode Features

- **Chat Interface**: Natural language interaction with your MCP server
- **Tool Preview**: See what tools would be called before execution (default)
- **Tool Execution**: Actually execute tools with `--exec` flag
- **Command History**: Access previous commands with `/history`
- **Tool Listing**: View available tools with `/tools`
- **Event Tracking**: Save all events for later analysis

#### Special Commands in Dev Mode

- `/tools` - List all available tools
- `/history` - Show command history
- `/help` - Show help information
- `Ctrl+C` - Exit dev mode

#### Transport Behavior

- **stdio transport**: Automatically spawns the server process
- **http transport**: Connects to existing server (unless `--run-script` is used)

---

## Configuration

Syrin uses a YAML configuration file located at `.syrin/config.yaml`. This file is created during `syrin init`.

### Configuration Structure

```yaml
version: '1.0'
project_name: 'my-project'
agent_name: 'My Agent'
transport: 'stdio' # or "http"
mcp_url: 'http://localhost:3000' # Required for http transport
script: 'python server.py' # Required for stdio transport
llm:
  openai:
    API_KEY: 'OPENAI_API_KEY' # Environment variable name
    MODEL_NAME: 'OPENAI_MODEL' # Environment variable name
    default: true
  claude:
    API_KEY: 'ANTHROPIC_API_KEY'
    MODEL_NAME: 'ANTHROPIC_MODEL'
    default: false
  ollama:
    MODEL_NAME: 'OLLAMA_MODEL_NAME' # or "llama2", "mistral", etc.
    default: false
```

### Configuration Fields

| Field          | Type                  | Required    | Description                                              |
| -------------- | --------------------- | ----------- | -------------------------------------------------------- |
| `version`      | string                | Yes         | Configuration version (currently "1.0")                  |
| `project_name` | string                | Yes         | Name of your project                                     |
| `agent_name`   | string                | Yes         | Name of your agent                                       |
| `transport`    | `"stdio"` \| `"http"` | Yes         | Transport type for MCP connection                        |
| `mcp_url`      | string                | Conditional | MCP server URL (required for http transport)             |
| `script`       | string                | Conditional | Command to run MCP server (required for stdio transport) |
| `llm`          | object                | Yes         | LLM provider configurations                              |

### LLM Provider Configuration

#### Cloud Providers (OpenAI, Claude)

```yaml
openai:
  API_KEY: 'OPENAI_API_KEY' # Environment variable name
  MODEL_NAME: 'OPENAI_MODEL' # Environment variable name
  default: true
```

#### Ollama Provider

```yaml
ollama:
  MODEL_NAME: 'OLLAMA_MODEL_NAME' # Environment variable name or direct value (e.g., "llama2", "mistral", "codellama")
  default: false
```

### Environment Variables

Syrin uses environment variables for sensitive data like API keys. Reference them in your config file:

```yaml
llm:
  openai:
    API_KEY: 'OPENAI_API_KEY' # References process.env.OPENAI_API_KEY
    MODEL_NAME: 'OPENAI_MODEL' # References process.env.OPENAI_MODEL
```

Set them in your shell or `.env` file:

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4"
```

## Transport Types

### stdio Transport

For MCP servers that run as processes and communicate via standard input/output.

```yaml
transport: 'stdio'
script: 'python server.py'
```

### http Transport

For MCP servers that expose an HTTP endpoint.

```yaml
transport: 'http'
mcp_url: 'http://localhost:3000'
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/ankan-labs/syrin.git
cd syrin

# Install dependencies
npm install

# Build the project
npm run build

# Run linting
npm run lint

# Run type checking
npm run type-check
```

## License

ISC License - see [LICENSE](LICENSE) file for details.

## Links

- **GitHub**: [https://github.com/ankan-labs/syrin](https://github.com/ankan-labs/syrin)
- **Issues**: [https://github.com/ankan-labs/syrin/issues](https://github.com/ankan-labs/syrin/issues)
- **npm**: [https://www.npmjs.com/package/@ankan-ai/syrin](https://www.npmjs.com/package/@ankan-ai/syrin)

## Support

If you encounter any issues or have questions:

1. Check the [documentation](#commands) above
2. Run `syrin doctor` to validate your setup
3. Open an issue on [GitHub](https://github.com/ankan-labs/syrin/issues)

---

Made with ❤️ by [Ankan AI Labs](https://github.com/ankan-labs)
