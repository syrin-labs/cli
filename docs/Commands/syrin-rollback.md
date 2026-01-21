---
title: "syrin rollback"
description: "Rollback Syrin to a previous version"
weight: "10"
---

## Go Back in Time

Rollback Syrin to a **specific previous version** when needed.

`syrin rollback` allows you to revert to any previously released version of Syrin. This is useful when a new version introduces issues or when you need to match a specific version for compatibility reasons.

This command answers the question:

> How do I go back to a version that worked?

## Purpose

Sometimes you need to revert:

- A new version introduced a regression
- Your project requires a specific version
- Configuration compatibility issues with newer versions
- Testing against historical versions

`syrin rollback` makes version management **explicit and safe**.

## Usage

```bash
syrin rollback <version>
```

## Arguments

| Argument    | Description                                | Required |
| ----------- | ------------------------------------------ | -------- |
| `<version>` | Version to rollback to (e.g., 1.3.0 or v1.3.0) | Yes      |

## Version Format

Both formats are accepted:

```bash
syrin rollback 1.3.0    # Without 'v' prefix
syrin rollback v1.3.0   # With 'v' prefix
```

The version must be a valid semver string (e.g., `1.2.3`, `1.0.0-beta.1`).

## What `syrin rollback` Does

1. **Validates version format** - Ensures the version string is valid
2. **Checks current version** - Compares against installed version
3. **Verifies availability** - Confirms the version exists on npm registry
4. **Warns about downgrades** - Alerts when rolling back to older versions
5. **Installs version** - Replaces current installation with specified version
6. **Confirms success** - Shows the installed version

## Example Output

### Successful Rollback

```
💡 Verifying version v1.3.0 exists on npm registry...

⚠️  Warning: Rolling back to an older version (v1.4.0 -> v1.3.0)

💡 Rolling back @syrin/cli to v1.3.0...

✓ Successfully rolled back to v1.3.0

💡 Make sure your config.yaml is compatible with this version.
   Documentation: https://docs.syrin.dev
```

### Already on Requested Version

```
💡 Already on version v1.3.0
```

### Version Not Found

```
❌ Version v0.0.1 not found on npm registry
```

### Invalid Version Format

```
❌ Invalid version format: abc. Expected format: 1.0.0 or v1.0.0
```

## Examples

### Rollback to Specific Version

```bash
syrin rollback 1.3.0
```

### Rollback to Last Known Good Version

```bash
# Check current version
syrin --version

# Rollback to previous
syrin rollback 1.3.2
```

### Rollback After Problematic Update

```bash
# Update went wrong
syrin update

# Something broke, rollback
syrin rollback 1.3.0

# Verify configuration still works
syrin doctor
```

## Common Scenarios

### Regression in New Version

When a new version breaks functionality:

```bash
# 1. Note the problematic version
syrin --version  # Shows v1.4.0

# 2. Rollback to previous working version
syrin rollback 1.3.0

# 3. Verify everything works
syrin doctor
syrin dev --exec
```

### Matching Team Version

When your team standardizes on a specific version:

```bash
# Install the team-standard version
syrin rollback 1.3.5

# Verify
syrin --version
```

### Testing Historical Behavior

When debugging version-specific behavior:

```bash
# Test on older version
syrin rollback 1.2.0
syrin analyse

# Compare with newer version
syrin update
syrin analyse
```

## Permission Errors

If you encounter permission errors, the command provides the exact fix:

```
❌ Permission denied. Try running: sudo npm install -g @syrin/cli@1.3.0
```

### Resolving Permission Issues

**Option 1: Use sudo**

```bash
sudo npm install -g @syrin/cli@1.3.0
```

**Option 2: Fix npm permissions (recommended)**

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
syrin rollback 1.3.0
```

## Exit Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| `0`  | Rollback successful or already on version |
| `1`  | Rollback failed (invalid version, not found, permission error) |

## After Rolling Back

### Verify Configuration Compatibility

Older versions may not support newer configuration options:

```bash
# Check configuration
syrin doctor

# If issues found, edit config
syrin config edit
```

### Check for Missing Features

Features added after the rollback version won't be available:

```bash
# See what commands are available
syrin --help
```

### Document the Version

If rolling back for a specific project, document the required version:

```bash
# In your project README or package.json
# Required Syrin version: 1.3.0
```

## Version Selection Guide

| Scenario                    | Recommended Action                    |
| --------------------------- | ------------------------------------- |
| Bug in latest version       | Rollback to previous minor version    |
| Team standardization        | Rollback to agreed version            |
| Config incompatibility      | Check migration guide, then rollback if needed |
| Testing historical behavior | Rollback, test, then update back      |

## Finding Available Versions

To see all available versions:

```bash
npm view @syrin/cli versions
```

Or check the releases page on GitHub for version history and changelogs.

## Relationship to Other Commands

- **`syrin update`** - Update to the latest version
- **`syrin --version`** - Check current installed version
- **`syrin doctor`** - Validate configuration after rollback

## See Also

- [syrin update](/commands/update/) - Update to latest version
- [syrin doctor](/commands/doctor/) - Validate configuration
- [Configuration Guide](/configuration/) - Configuration reference
