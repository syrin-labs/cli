/**
 * Environment file templates.
 * Provides templates for creating .env files.
 */

/**
 * Get template for global environment file.
 * @returns Template content for ~/.syrin/.env
 */
export function getGlobalEnvTemplate(): string {
  return `# Syrin Global Environment Variables
# ===========================================
# Add your API keys and model names here.
# These will be used when the global config references environment variable names.
#
# Example:
# OPENAI_API_KEY=sk-proj-abc123...
# OPENAI_MODEL=gpt-4-turbo
# ANTHROPIC_API_KEY=sk-ant-api03-...
# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
# OLLAMA_MODEL_NAME=llama2
#
# Security Note:
# This file contains sensitive credentials. Keep it secure and never commit it to version control.
# File permissions are set to 600 (read/write owner only) for security.
`;
}

/**
 * Get template for local environment file.
 * @returns Template content for ./.env
 */
export function getLocalEnvTemplate(): string {
  return `# Syrin Project Environment Variables
# ===========================================
# Add your API keys and model names here.
# These will be used when the local config references environment variable names.
#
# Example:
# OPENAI_API_KEY=sk-proj-abc123...
# OPENAI_MODEL=gpt-4-turbo
# ANTHROPIC_API_KEY=sk-ant-api03-...
# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
# OLLAMA_MODEL_NAME=llama2
#
# Security Note:
# This file contains sensitive credentials. Keep it secure and never commit it to version control.
# File permissions are set to 600 (read/write owner only) for security.
`;
}
