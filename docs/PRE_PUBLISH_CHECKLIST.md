# Pre-Publish Checklist for @ankan-ai/syrin v1.0.0

## 📦 Package Configuration

### ✅ Required Changes

- [ ] **Update package name** to `@ankan-ai/syrin` in `package.json`
- [ ] **Add `bin` field** in `package.json` to enable CLI usage:
  ```json
  "bin": {
    "syrin": "./dist/index.js"
  }
  ```
- [ ] **Add `files` field** to specify what gets published (exclude source files):
  ```json
  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE"
  ]
  ```
- [ ] **Update `main` field** to point to `dist/index.js` (already correct)
- [ ] **Add `engines` field** to specify Node.js version requirements:
  ```json
  "engines": {
    "node": ">=18.0.0"
  }
  ```
- [ ] **Add `keywords`** for better discoverability:
  ```json
  "keywords": [
    "mcp",
    "model-context-protocol",
    "debugging",
    "testing",
    "cli",
    "runtime-intelligence",
    "llm",
    "ai"
  ]
  ```
- [ ] **Update repository URL** to match GitHub: `https://github.com/ankan-labs/syrin`
- [ ] **Update homepage** to match GitHub
- [ ] **Update bugs URL** to match GitHub
- [ ] **Add `prepublishOnly` script** to ensure build runs before publish:
  ```json
  "prepublishOnly": "npm run build"
  ```

### 🔒 Publishing Configuration

- [ ] **Verify npm organization access**: Ensure you're logged in and have publish access to `@ankan-ai` org
  ```bash
  npm whoami
  npm org ls ankan-ai
  ```
- [ ] **Set package to public** (scoped packages are private by default):
  ```bash
  npm publish --access public
  ```
  Or add to `package.json`:
  ```json
  "publishConfig": {
    "access": "public"
  }
  ```

## 📝 Documentation

- [ ] **Complete README.md** with:
  - [ ] Clear project description
  - [ ] Installation instructions (npm, npx, global)
  - [ ] Quick start guide
  - [ ] Available commands (`init`, `doctor`, `test`, `list`, `dev`)
  - [ ] Command examples and usage
  - [ ] Configuration guide
  - [ ] Requirements (Node.js version, dependencies)
  - [ ] Contributing guidelines
  - [ ] License information
  - [ ] Links to GitHub, issues, etc.

- [ ] **Add LICENSE file** (currently using ISC, create LICENSE file)
- [ ] **Create CHANGELOG.md** (optional but recommended)
- [ ] **Add CONTRIBUTING.md** (optional but recommended)

## 🏗️ Build & Distribution

- [ ] **Verify build process**:
  ```bash
  npm run build
  ```
- [ ] **Check dist/ folder** contains all necessary files
- [ ] **Verify no source files** are included in published package
- [ ] **Test CLI locally** after build:
  ```bash
  node dist/index.js --version
  node dist/index.js --help
  ```

## 🧪 Testing

- [ ] **Test installation locally**:
  ```bash
  npm pack
  npm install -g ./syrin-1.0.0.tgz
  syrin --version
  ```
- [ ] **Test npx usage** (after publishing to test registry):
  ```bash
  npx @ankan-ai/syrin@1.0.0 --version
  ```
- [ ] **Test all commands** work correctly:
  - [ ] `syrin init`
  - [ ] `syrin doctor`
  - [ ] `syrin test`
  - [ ] `syrin list`
  - [ ] `syrin dev`
- [ ] **Test global installation**:
  ```bash
  npm install -g @ankan-ai/syrin
  syrin --version
  ```

## 🔍 Code Quality

- [ ] **Run linter**: `npm run lint`
- [ ] **Fix any linting errors**: `npm run lint:fix`
- [ ] **Run type checking**: `npm run type-check`
- [ ] **Format code**: `npm run format`
- [ ] **Remove console.log statements** (use logger instead)
- [ ] **Check for hardcoded paths** or local development references
- [ ] **Verify error handling** is user-friendly

## 📋 Files & Ignoring

- [ ] **Create .npmignore** (or verify `files` field works correctly):
  ```
  src/
  *.ts
  !dist/**/*.d.ts
  tsconfig.json
  tsconfig.node.json
  eslint.config.cjs
  .git/
  .gitignore
  node_modules/
  .env
  .env.*
  .syrin/
  parth/
  docs/
  *.md
  !README.md
  ```
- [ ] **Verify .gitignore** is appropriate
- [ ] **Check for sensitive data** (API keys, tokens, etc.)

## 🔗 Dependencies

- [ ] **Review dependencies** - ensure all are necessary
- [ ] **Check for security vulnerabilities**:
  ```bash
  npm audit
  npm audit fix
  ```
- [ ] **Verify peer dependencies** (if any)
- [ ] **Check dependency versions** are appropriate (not too strict/loose)
- [ ] **Move dev-only dependencies** to `devDependencies` if needed

## 🌐 GitHub Integration

- [ ] **Verify GitHub repository** is public and accessible
- [ ] **Update repository URLs** in package.json to match actual GitHub URL
- [ ] **Add npm badge** to README (optional):
  ```markdown
  [![npm version](https://badge.fury.io/js/%40ankan-ai%2Fsyrin.svg)](https://badge.fury.io/js/%40ankan-ai%2Fsyrin)
  ```
- [ ] **Create GitHub release** tag for v1.0.0 (after publishing)

## 🚀 Publishing Steps

1. **Final verification**:

   ```bash
   npm run build
   npm run lint
   npm run type-check
   ```

2. **Dry run** (test what will be published):

   ```bash
   npm pack --dry-run
   ```

3. **Login to npm**:

   ```bash
   npm login
   ```

4. **Verify organization access**:

   ```bash
   npm org ls ankan-ai
   ```

5. **Publish**:

   ```bash
   npm publish --access public
   ```

6. **Verify publication**:

   ```bash
   npm view @ankan-ai/syrin
   ```

7. **Test installation**:
   ```bash
   npm install -g @ankan-ai/syrin
   npx @ankan-ai/syrin --version
   ```

## 📌 Post-Publish

- [ ] **Create GitHub release** with release notes
- [ ] **Update documentation** if needed
- [ ] **Announce on social media/community** (optional)
- [ ] **Monitor for issues** and user feedback

## ⚠️ Important Notes

- Scoped packages (`@ankan-ai/syrin`) are **private by default** - use `--access public` flag
- The `bin` field is **critical** for CLI functionality
- The `files` field or `.npmignore` is **important** to keep package size small
- Test with `npm pack` before actual publish to see what will be included
- Version number should follow semantic versioning (you're using 1.0.0 which is good for initial release)
