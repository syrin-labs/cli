---
title: 'Installation'
description: 'All the ways to install Syrin'
weight: 4
---

## All Roads Lead to Syrin

Choose the install method that fits your workflow.

## Requirements

- **Node.js** >= 20.12
- **npm** >= 9

Check your versions:

```bash
node --version   # Must be v20.12.0 or higher
npm --version    # Must be 9.0.0 or higher
```

## Option A: Global Install (Recommended)

Best for regular use. Gives you the `syrin` command everywhere.

```bash
npm install -g @syrin/cli
```

Verify:

```bash
syrin --version
```

## Option B: npx (No Install)

Best for quick one-off inspections or CI pipelines. Nothing is installed permanently.

```bash
npx @syrin/cli analyse --transport http --url http://localhost:8000/mcp
```

Every `npx @syrin/cli <command>` works the same as `syrin <command>`.

## Option C: Project Dev Dependency

Best for teams that want Syrin pinned to a specific version per project.

```bash
npm install --save-dev @syrin/cli
```

Then use it via npx or npm scripts:

```bash
npx syrin analyse
```

Or add to `package.json`:

```json
{
  "scripts": {
    "syrin:analyse": "syrin analyse --ci",
    "syrin:test": "syrin test --ci"
  }
}
```

## Update

```bash
# Global
npm update -g @syrin/cli

# Or use Syrin's built-in update
syrin update
```

## Rollback

If an update causes issues, roll back to a specific version:

```bash
syrin rollback 1.4.0
```

## Uninstall

```bash
npm uninstall -g @syrin/cli
```

## Next Steps

- [Setup](/setup/) -- Configure Syrin for your workflow
- [Quick Test Without Config](/guides/quick-test-without-config/) -- Start using Syrin immediately
