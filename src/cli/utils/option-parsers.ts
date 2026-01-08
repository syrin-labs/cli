/**
 * CLI option parsing utilities.
 * Provides functions to parse complex CLI options like env vars and headers.
 */

/**
 * Parse environment variable option from CLI.
 * Supports format: KEY=value or KEY (uses process.env[KEY])
 *
 * @param envOption - Environment variable string in format "KEY=value" or "KEY"
 * @returns Parsed key-value pair
 */
export function parseEnvOption(envOption: string): {
  key: string;
  value: string;
} {
  const equalIndex = envOption.indexOf('=');
  if (equalIndex === -1) {
    // No = sign, treat as env var name and get from process.env
    const key = envOption.trim();
    const value = process.env[key] || '';
    return { key, value };
  }

  const key = envOption.slice(0, equalIndex).trim();
  const value = envOption.slice(equalIndex + 1).trim();
  return { key, value };
}

/**
 * Parse multiple environment variable options.
 *
 * @param envOptions - Array of environment variable strings
 * @returns Record of key-value pairs
 */
export function parseEnvOptions(
  envOptions: string[] | undefined
): Record<string, string> {
  if (!envOptions || envOptions.length === 0) {
    return {};
  }

  const env: Record<string, string> = {};
  for (const option of envOptions) {
    const { key, value } = parseEnvOption(option);
    if (key) {
      env[key] = value;
    }
  }
  return env;
}

/**
 * Parse authentication header option from CLI.
 * Supports format: "Header: Value" or "Header=Value"
 *
 * @param headerOption - Header string in format "Header: Value" or "Header=Value"
 * @returns Parsed key-value pair
 */
export function parseAuthHeaderOption(headerOption: string): {
  key: string;
  value: string;
} {
  // Try "Header: Value" format first
  const colonIndex = headerOption.indexOf(':');
  if (colonIndex !== -1) {
    const key = headerOption.slice(0, colonIndex).trim();
    const value = headerOption.slice(colonIndex + 1).trim();
    return { key, value };
  }

  // Try "Header=Value" format
  const equalIndex = headerOption.indexOf('=');
  if (equalIndex !== -1) {
    const key = headerOption.slice(0, equalIndex).trim();
    const value = headerOption.slice(equalIndex + 1).trim();
    return { key, value };
  }

  // If no separator and not empty, treat as Bearer token
  const trimmed = headerOption.trim();
  if (!trimmed) {
    return { key: '', value: '' };
  }
  return { key: 'Authorization', value: `Bearer ${trimmed}` };
}

/**
 * Parse multiple authentication header options.
 *
 * @param headerOptions - Array of header strings
 * @returns Record of header key-value pairs
 */
export function parseAuthHeaderOptions(
  headerOptions: string[] | undefined
): Record<string, string> {
  if (!headerOptions || headerOptions.length === 0) {
    return {};
  }

  const headers: Record<string, string> = {};
  for (const option of headerOptions) {
    const { key, value } = parseAuthHeaderOption(option);
    // Skip entries without both key and value
    if (key && value && value.trim()) {
      headers[key] = value;
    }
  }
  return headers;
}
