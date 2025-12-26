# Testing Syrin CLI

## Prerequisites

Make sure you have built the project:

```bash
npm run build
```

Or use `tsx` directly (no build needed):

```bash
npx tsx src/index.ts <command>
```

## Test Commands

### 1. Test Help Command

```bash
# Using tsx (recommended for development)
npx tsx src/index.ts --help

# Or using built version (requires npm run build first)
node dist/index.js --help
```

### 2. Test Init Command - Non-Interactive Mode

```bash
# Clean up any existing config first
rm -rf .syrin

# Run init with default values (non-interactive)
npx tsx src/index.ts init -y

# Verify the config file was created
cat .syrin/config.yaml
```

### 3. Test Init Command - Interactive Mode

```bash
# Clean up any existing config first
rm -rf .syrin

# Run init interactively (will prompt for inputs)
npx tsx src/index.ts init
```

### 4. Test Duplicate Initialization (Error Handling)

```bash
# First initialize
npx tsx src/index.ts init -y

# Try to initialize again (should fail)
npx tsx src/index.ts init -y
# Expected output: "Project is already initialized..."
```

### 5. Test in a Clean Directory

```bash
# Create a test directory
mkdir -p /tmp/syrin-test-project
cd /tmp/syrin-test-project

# Initialize from the test directory
npx tsx /path/to/syrin/src/index.ts init -y

# Check the generated config
cat .syrin/config.yaml

# Clean up
cd -
rm -rf /tmp/syrin-test-project
```

### 6. Test with Custom Project Root

```bash
# Create test directory
mkdir -p /tmp/my-mcp-server
cd /tmp/my-mcp-server

# Initialize with custom project root
npx tsx /path/to/syrin/src/index.ts init -y --project-root /tmp/my-mcp-server

# Verify config
cat .syrin/config.yaml
```

## Expected Results

### Successful Init Output

```
✅ Syrin project initialized successfully!

📁 Configuration file: /path/to/.syrin/config.yaml

📝 Next steps:
   1. Review and edit .syrin/config.yaml if needed
   2. Set up your environment variables (API keys, etc.)
   3. Run `syrin inspect` to verify your Syrin setup
   4. Run `syrin dev` to start development mode
```

### Generated Config File Structure

The `.syrin/config.yaml` file should contain:

- `version`: "1.0.0"
- `project_name`: Based on directory name (or default)
- `agent_name`: "Agent" (or user input)
- `transport`: "stdio" or "http"
- `command`: Command to start MCP server (for stdio)
- `mcp_url`: URL for MCP server (for http)
- `script`: dev and start commands
- `llm`: LLM provider configurations

## Quick Test Script

Create a simple test script:

```bash
#!/bin/bash
# test-init.sh

set -e

echo "🧪 Testing Syrin Init Command"
echo "=============================="

# Clean up
rm -rf .syrin

# Test non-interactive mode
echo ""
echo "1. Testing non-interactive mode (-y flag)..."
npx tsx src/index.ts init -y

# Verify config exists
if [ -f .syrin/config.yaml ]; then
    echo "✅ Config file created successfully"
else
    echo "❌ Config file not found"
    exit 1
fi

# Test duplicate initialization
echo ""
echo "2. Testing duplicate initialization rejection..."
if npx tsx src/index.ts init -y 2>&1 | grep -q "already initialized"; then
    echo "✅ Duplicate initialization correctly rejected"
else
    echo "❌ Duplicate initialization check failed"
    exit 1
fi

# Display config
echo ""
echo "3. Generated config file:"
echo "=========================="
cat .syrin/config.yaml

echo ""
echo "✅ All tests passed!"
```

Run it with:

```bash
chmod +x test-init.sh
./test-init.sh
```

## Development Mode

For development, you can use `npm run dev` which uses `tsx` directly:

```bash
# Add to package.json scripts if not already there:
# "dev": "tsx --tsconfig tsconfig.json src/index.ts"

# Then run:
npm run dev init -y
```
