# Contributing to Syrin

Thank you for your interest in contributing to Syrin! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Common Tasks](#common-tasks)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

- **Node.js**: >= 20.12.0
- **npm**: Latest version (comes with Node.js)
- **Git**: For version control

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/cli.git
   cd syrin
   ```

3. Add the upstream repository:

   ```bash
   git remote add upstream https://github.com/Syrin-Labs/cli.git
   ```

## Development Setup

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Verify Installation

Run the test suite to ensure everything is working:

```bash
npm run test:run
```

## Project Structure

```txt
syrin/
├── src/                    # Source TypeScript files
│   ├── cli/               # CLI commands and utilities
│   ├── config/            # Configuration management
│   ├── constants/         # Constants and messages
│   ├── events/            # Event system
│   ├── presentation/      # UI components (React/Ink)
│   ├── runtime/           # Runtime logic (LLM, MCP, analysis)
│   ├── types/             # Type definitions
│   └── utils/             # Utility functions
├── dist/                  # Compiled JavaScript (generated)
├── tests/                 # Test files (co-located with source)
├── package.json           # Project configuration
├── tsconfig.json          # TypeScript configuration
└── eslint.config.cjs     # ESLint configuration
```

## Development Workflow

### 1. Create a Branch

Create a feature branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

**Branch naming conventions:**

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements

### 2. Make Changes

- Write clean, maintainable code
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

Before submitting, ensure all tests pass:

```bash
# Run all tests
npm run test:run

# Run tests in watch mode (for development)
npm test

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### 4. Lint and Format

Ensure your code follows the project's style:

```bash
# Check for linting errors
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Check formatting
npm run format:check

# Auto-format code
npm run format
```

### 5. Type Check

Verify TypeScript compilation:

```bash
npm run type-check
```

## Code Standards

### TypeScript

- Use TypeScript for all source code
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Use `type` for unions, intersections, and aliases
- Follow the existing patterns in the codebase

### ES Modules

- The project uses ES Modules (`"type": "module"` in package.json)
- Use `import`/`export` syntax, not `require()`/`module.exports`
- Use `import.meta.url` instead of `__dirname` for ESM compatibility

### Code Style

- Follow ESLint rules (configured in `eslint.config.cjs`)
- Use Prettier for formatting
- Maximum line length: Follow Prettier defaults
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### File Organization

- Co-locate test files with source files (`.test.ts` suffix)
- Group related functionality in the same directory
- Use index files for clean exports

### Error Handling

- Use typed error classes from `@/utils/errors`
- Provide clear, actionable error messages
- Handle errors at appropriate levels

## Testing

### Writing Tests

- Write tests for all new functionality
- Use Vitest as the testing framework
- Follow the existing test patterns
- Test files should be named `*.test.ts`

### Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('FeatureName', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Mocking

- Use Vitest's `vi.mock()` for module mocking
- Use `vi.fn()` for function mocks
- Prefer ES6 imports over CommonJS `require()` in tests
- Mock external dependencies (network requests, file system, etc.)

### Test Coverage

- Aim for high test coverage
- Focus on testing behavior, not implementation
- Include edge cases and error scenarios

### Running Tests

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode
npm test

# Run with coverage report
npm run test:coverage

# Run with UI (interactive)
npm run test:ui
```

## Submitting Changes

### Commit Messages

Write clear, descriptive commit messages:

```txt
type(scope): brief description

Longer explanation if needed. Explain what and why, not how.
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Maintenance tasks

**Examples:**

```txt
feat(cli): add --json flag to analyse command

fix(version): correct package.json path resolution in ESM

docs(readme): update installation instructions
```

### Pre-Commit Checklist

Before committing, ensure:

- [ ] All tests pass (`npm run test:run`)
- [ ] Code is linted (`npm run lint`)
- [ ] Code is formatted (`npm run format:check`)
- [ ] TypeScript compiles (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)
- [ ] Commit message follows conventions

### Pull Request Process

1. **Update your branch:**

   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Push your changes:**

   ```bash
   git push origin your-branch
   ```

3. **Create a Pull Request:**
   - Go to the GitHub repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

4. **PR Description should include:**
   - What changes were made
   - Why the changes were needed
   - How to test the changes
   - Any breaking changes
   - Related issues

5. **Respond to feedback:**
   - Address review comments
   - Make requested changes
   - Keep the PR focused and small when possible

### PR Review Criteria

Your PR will be reviewed for:

- ✅ Code quality and style
- ✅ Test coverage
- ✅ Documentation updates
- ✅ Backward compatibility
- ✅ Performance implications
- ✅ Security considerations

## Common Tasks

### Adding a New CLI Command

1. Create command file in `src/cli/commands/`
2. Implement the command handler
3. Register in `src/cli/index.ts`
4. Add tests in `src/cli/commands/command-name.test.ts`
5. Update documentation

### Adding a New LLM Provider

1. Create provider in `src/runtime/llm/`
2. Implement the provider interface
3. Register in `src/runtime/llm/factory.ts`
4. Add tests
5. Update configuration schema

### Adding Analysis Rules

1. Create rule file in `src/runtime/analysis/rules/`
2. Implement rule logic
3. Register in the analysis system
4. Add tests
5. Update documentation

### Debugging

**Enable debug logging:**

```bash
DEBUG=syrin:* npm run build && node dist/index.js <command>
```

**Run tests with verbose output:**

```bash
npm test -- --reporter=verbose
```

**Check build output:**

```bash
npm run build
ls -la dist/
```

## Getting Help

- **Documentation**: [https://docs.syrin.dev](https://docs.syrin.dev)
- **Issues**: [https://github.com/Syrin-Labs/cli/issues](https://github.com/Syrin-Labs/cli/issues)
- **Discussions**: Use GitHub Discussions for questions

## License

By contributing, you agree that your contributions will be licensed under the ISC License.

---

Thank you for contributing to Syrin! 🎉
