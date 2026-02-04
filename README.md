# Syrin

![Syrin Logo](https://github.com/Syrin-Labs/cli/raw/main/assets/syrin-logo-dark-bg.png)

[![npm version](https://badge.fury.io/js/%40syrin%2Fcli.svg)](https://www.npmjs.com/package/@syrin/cli) [![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC) [![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.12.0-brightgreen)](https://nodejs.org/)

**A linter + test runner for MCP servers.**

---

## The Problem

[MCP (Model Context Protocol)](https://modelcontextprotocol.io/) is how AI agents call external tools — read files, query databases, hit APIs. If you are building or using an MCP server, your AI agent depends on those tool definitions being correct.

They usually are not.

Tool descriptions are too vague for the LLM to pick the right one. Parameter schemas are missing or wrong. Two tools look so similar the model picks one at random. A tool returns 12MB of JSON and blows the context window. Another tool silently writes to disk when it should not. Your logs look fine. The agent is broken.

**Syrin catches all of this before production.**

```bash
$ syrin analyse --transport http --url http://localhost:8000/mcp

 E110  Tool Ambiguity           get_user ↔ fetch_user
 E101  Missing Tool Description process_data has no description
 E102  Underspecified Input     user_id: no format, no example, no enum
 E105  Free Text Propagation    get_status → update_user (unconstrained string)
 W104  Generic Description      "Get data" — too vague for tool selection

 5 issues found (4 errors, 1 warning)
```

---

## See It In Action

![syrin analyse demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-analyse/analyse.gif)

---

## Try It Right Now

You do not need an MCP server of your own. Use the included example:

```bash
git clone https://github.com/Syrin-Labs/cli.git
cd cli/examples/demo-mcp-py
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python server.py --mode http --port 8000 &
```

Now point Syrin at it:

```bash
# List what tools the server exposes
npx @syrin/cli list tools --transport http --url http://localhost:8000/mcp

# Analyse tool contracts for issues
npx @syrin/cli analyse --transport http --url http://localhost:8000/mcp
```

No API keys. No config files. No project setup.

Already have your own MCP server running? Point Syrin at it directly:

```bash
npx @syrin/cli analyse --transport http --url http://localhost:8000/mcp
```

If your server uses stdio instead of HTTP:

```bash
npx @syrin/cli analyse --transport stdio --script "python server.py"
```

**Requirements:** Node.js >= 20.12, npm >= 9

---

## What Syrin Catches

| Code | Issue                 | What Happens Without Syrin                  |
| ---- | --------------------- | ------------------------------------------- |
| E110 | Tool Ambiguity        | LLM picks the wrong tool at random          |
| E101 | Missing Description   | LLM has no idea what the tool does          |
| E102 | Underspecified Input  | LLM hallucinates parameter values           |
| E105 | Free Text Propagation | LLM passes sentences where data is expected |
| E103 | Type Mismatch         | Tool chains break silently                  |
| E107 | Circular Dependency   | Agent loops forever, burns tokens           |
| E301 | Output Explosion      | 12MB response blows the context window      |
| E500 | Side Effect Detected  | Tool writes to disk when it should not      |

See the full list: [Error Reference](https://docs.syrin.dev/testing/error-reference) · [Warning Reference](https://docs.syrin.dev/testing/warning-reference)

---

## Commands

| Command         | What It Does                                                             |
| --------------- | ------------------------------------------------------------------------ |
| `syrin list`    | Show tools, resources, and prompts a server exposes                      |
| `syrin analyse` | Static analysis — catch contract issues without executing tools          |
| `syrin test`    | Run tools in a sandbox and validate behavior against contracts           |
| `syrin dev`     | Interactive session — watch an LLM interact with your tools in real time |
| `syrin doctor`  | Validate your config, environment, and connections                       |

**Zero-config commands:** `list`, `analyse`, and `test --connection` work with just `--url` or `--script`. No config file needed.

**Config required:** `dev` mode needs LLM API keys. Run `syrin init --global` to set up once.

---

## All Demos

<table>
<tr>
<td width="33%"><strong>syrin analyse</strong><br/>Catch contract issues</td>
<td width="33%"><strong>syrin dev</strong><br/>Interactive development</td>
<td width="33%"><strong>syrin test</strong><br/>Sandboxed tool testing</td>
</tr>
<tr>
<td><img src="https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-analyse/analyse.gif" width="280" alt="syrin analyse demo"/></td>
<td><img src="https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-dev/dev.gif" width="280" alt="syrin dev demo"/></td>
<td><img src="https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-test/test_tool.gif" width="280" alt="syrin test demo"/></td>
</tr>
<tr>
<td width="33%"><strong>syrin init</strong><br/>Project setup</td>
<td width="33%"><strong>syrin list</strong><br/>Inspect tools</td>
<td width="33%"><strong>syrin test --connection</strong><br/>Connection test</td>
</tr>
<tr>
<td><img src="https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-init/init.gif" width="280" alt="syrin init demo"/></td>
<td><img src="https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-list/list.gif" width="280" alt="syrin list demo"/></td>
<td><img src="https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-test/test_connection.gif" width="280" alt="syrin test --connection demo"/></td>
</tr>
</table>

---

## Install

```bash
# Run without installing
npx @syrin/cli analyse --transport http --url http://localhost:8000/mcp

# Or install globally
npm install -g @syrin/cli
syrin --version
```

## Set Up for a Project

```bash
syrin init                 # Creates syrin.yaml + tools/ directory
syrin doctor               # Validates config and connections
syrin analyse              # Analyse your MCP server
syrin test                 # Run contract tests
syrin dev --exec           # Interactive LLM-MCP session
```

## Tool Contracts

Define behavioral guarantees for your tools in `tools/<tool-name>.yaml`:

```yaml
version: 1
tool: fetch_user

contract:
  input_schema: FetchUserRequest
  output_schema: User

guarantees:
  side_effects: none
  max_output_size: 10kb

tests:
  - name: 'valid user'
    input:
      user_id: '123'
    expect:
      output_schema: User

  - name: 'invalid input'
    input:
      user_id: 123
    expect:
      error:
        type: input_validation
```

Run tests: `syrin test` or `syrin test --tool fetch_user`

Documentation: [Writing Test Cases](https://docs.syrin.dev/testing/writing-test-cases) · [Test Your MCP Tools](https://docs.syrin.dev/guides/test-your-mcp-tools)

---

## CI Integration

```yaml
# .github/workflows/syrin.yml
name: MCP Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g @syrin/cli
      - run: syrin analyse --ci
      - run: syrin test --ci --strict
```

See full CI docs: [Add Syrin to CI](https://docs.syrin.dev/guides/add-syrin-to-ci)

---

## Documentation

Full docs at **[docs.syrin.dev](https://docs.syrin.dev)**

| Topic           | Link                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------- |
| Getting Started | [docs.syrin.dev/getting-started](https://docs.syrin.dev/getting-started)                 |
| Setup Guide     | [docs.syrin.dev/setup](https://docs.syrin.dev/setup)                                     |
| Configuration   | [docs.syrin.dev/configuration](https://docs.syrin.dev/configuration)                     |
| All Commands    | [docs.syrin.dev/commands](https://docs.syrin.dev/commands)                               |
| Error Reference | [docs.syrin.dev/testing/error-reference](https://docs.syrin.dev/testing/error-reference) |

---

## Community

- [Discord](https://discord.gg/j8GUvHybSa) — Ask questions, share feedback
- [GitHub Discussions](https://github.com/Syrin-Labs/cli/discussions) — Feature ideas, show & tell
- [Issues](https://github.com/Syrin-Labs/cli/issues) — Bug reports, feature requests

---

## Contributing

Contributions welcome. See [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

For security issues: [Security Policy](SECURITY.md).

## License

ISC License. See [LICENSE](LICENSE).

Made by [Syrin Labs](https://github.com/Syrin-Labs).
