---
title: 'syrin update'
description: 'Update Syrin to the latest version'
weight: '9'
---

## Stay Current

Update Syrin to the **latest version** with a single command.

`syrin update` checks for new releases and upgrades your installation automatically. It handles both global and local installations, provides clear progress feedback, and offers helpful suggestions if issues occur.

This command answers a simple question:

> Am I running the latest version of Syrin?

## Purpose

Keeping Syrin up-to-date ensures you have:

- Latest bug fixes and stability improvements
- New features and capabilities
- Updated analysis rules and diagnostics
- Security patches

`syrin update` makes this process **frictionless**.

## Usage

```bash
syrin update
```

No additional options are required. The command automatically detects your installation type and updates accordingly.

## What `syrin update` Does

1. **Checks current version** - Displays your installed version
2. **Queries npm registry** - Fetches the latest available version
3. **Compares versions** - Determines if an update is needed
4. **Performs update** - Installs the latest version if available
5. **Confirms success** - Shows the newly installed version

## Example Output

### When Update Is Available

```
💡 Checking for updates...
💡 Current version: v1.3.0

💡 Latest version: v1.4.0

💡 Updating @syrin/cli...

✓ Successfully updated to v1.4.0

💡 If your config.yaml structure changed, check the migration guide.
   Documentation: https://docs.syrin.dev
```

### When Already Up-to-Date

```
💡 Checking for updates...
💡 Current version: v1.4.0

✓ Already on latest version: v1.4.0
```

### When Network Is Unavailable

```
💡 Checking for updates...
💡 Current version: v1.4.0

⚠️  Could not check for updates (network error or registry unavailable)
Current version: v1.4.0
```

## Common Scenarios

### Standard Update

```bash
syrin update
```

Updates to the latest version. This is the recommended approach for most users.

### After Major Version Release

When a new major version is released, check the release notes and migration guide:

```bash
# Check what version you're on
syrin --version

# Update to latest
syrin update

# Verify configuration compatibility
syrin doctor
```

### CI/CD Environments

In CI pipelines, you may want to ensure a specific version or the latest:

```bash
# Always use latest
npm install -g @syrin/cli@latest

# Or use syrin update if already installed
syrin update
```

## Permission Errors

If you encounter permission errors during update, the command provides the exact command to run:

```
❌ Permission denied. Try running: sudo npm install -g @syrin/cli@latest
```

### Resolving Permission Issues

**Option 1: Use sudo (not recommended for security)**

```bash
sudo npm install -g @syrin/cli@latest
```

**Option 2: Fix npm permissions (recommended)**

```bash
# Change npm's default directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Then update normally
syrin update
```

**Option 3: Use a Node version manager**

Using `nvm` or similar tools avoids global permission issues entirely.

## Exit Codes

| Code | Meaning                             |
| ---- | ----------------------------------- |
| `0`  | Update successful or already latest |
| `1`  | Update failed                       |

## After Updating

### Verify Configuration

After updating, especially across major versions, verify your configuration:

```bash
syrin doctor
```

### Check for Breaking Changes

Major version updates may include breaking changes. Always review:

- Release notes on GitHub
- Migration guide in documentation
- Changelog for your specific version jump

### Configuration Migration

If the configuration format changed:

```bash
# View current config
syrin config show

# Edit if needed
syrin config edit

# Validate
syrin doctor
```

## Version Numbering

Syrin follows semantic versioning:

- **Major** (1.x.x → 2.x.x) - Breaking changes, may require config updates
- **Minor** (1.1.x → 1.2.x) - New features, backward compatible
- **Patch** (1.1.1 → 1.1.2) - Bug fixes, no feature changes

## Relationship to Other Commands

- **`syrin rollback`** - Revert to a previous version if needed
- **`syrin doctor`** - Validate configuration after update
- **`syrin --version`** - Check current version without updating

## See Also

- [syrin rollback](/commands/rollback/) - Revert to a previous version
- [syrin doctor](/commands/doctor/) - Validate configuration
- [Configuration Guide](/configuration/) - Configuration reference
