import { getVersionDisplayString } from '@/utils/version-display';
import { log } from '@/utils/logger';

/**
 * Presentation layer for list command UI components.
 * Provides minimalistic, easy-to-read displays for tools, resources, and prompts.
 */

interface ToolInfo {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

interface ResourceInfo {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

interface PromptInfo {
  name: string;
  title?: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * Extract and format parameter information from a JSON schema.
 */
function extractParameters(
  schema: unknown
): Array<{ name: string; type: string; required: boolean }> {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  const schemaObj = schema as {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };

  if (!schemaObj.properties) {
    return [];
  }

  const required = new Set(schemaObj.required || []);
  const params: Array<{ name: string; type: string; required: boolean }> = [];

  for (const [name, prop] of Object.entries(schemaObj.properties)) {
    const propObj = prop as { type?: string; [key: string]: unknown };
    const type = propObj.type || 'unknown';
    params.push({
      name,
      type,
      required: required.has(name),
    });
  }

  return params;
}

/**
 * Display tools list using plain console output.
 * This avoids Ink taking control of stdin, which disables terminal history.
 */
export async function displayTools(tools: ToolInfo[]): Promise<void> {
  // Get version info for display
  const versionDisplayString = await getVersionDisplayString();

  log.blank();
  log.label(`Syrin ${versionDisplayString}`);
  log.blank();
  log.heading(
    `Tools: ${tools.length} ${tools.length === 1 ? 'tool' : 'tools'}`
  );
  log.blank();

  if (tools.length === 0) {
    log.label('  No tools available');
    log.blank();
    return;
  }

  tools.forEach((tool, index) => {
    const inputParams = extractParameters(tool.inputSchema);
    const outputParams = extractParameters(tool.outputSchema);

    log.numberedItem(index + 1, tool.name);

    // Description
    if (tool.description) {
      log.label(`    ${tool.description.split('\n')[0]}`);
    }

    // Input parameters summary
    if (inputParams.length > 0) {
      log.label('    Parameters:');
      for (const param of inputParams) {
        const requiredText = param.required ? ' (required)' : '';
        log.plain(
          `      • ${log.styleText(param.name, 'cyan')} ${log.styleText(`(${param.type})`, 'dim')}${requiredText ? log.styleText(requiredText, 'yellow') : ''}`
        );
      }
    } else {
      log.label('    No parameters');
    }

    // Output summary
    if (outputParams.length > 0) {
      log.plain(
        `    ${log.styleText('Returns:', 'dim')} ${log.styleText(String(outputParams.length), 'cyan')} ${log.styleText(outputParams.length === 1 ? 'property' : 'properties', 'dim')}`
      );
    }

    log.blank();
  });
}

/**
 * Display resources list using plain console output.
 * This avoids Ink taking control of stdin, which disables terminal history.
 */
export async function displayResources(
  resources: ResourceInfo[]
): Promise<void> {
  // Get version info for display
  const versionDisplayString = await getVersionDisplayString();

  log.blank();
  log.label(`Syrin ${versionDisplayString}`);
  log.blank();
  log.heading(
    `Resources: ${resources.length} ${resources.length === 1 ? 'resource' : 'resources'}`
  );
  log.blank();

  if (resources.length === 0) {
    log.label('  No resources available');
    log.blank();
    return;
  }

  resources.forEach((resource, index) => {
    log.numberedItem(index + 1, resource.uri);
    if (resource.name) {
      log.labelValue('    Name:', resource.name);
    }
    if (resource.description) {
      log.label(`    ${resource.description.split('\n')[0]}`);
    }
    if (resource.mimeType) {
      log.labelValue('    Type:', resource.mimeType);
    }
    log.blank();
  });
}

/**
 * Display prompts list using plain console output.
 * This avoids Ink taking control of stdin, which disables terminal history.
 */
export async function displayPrompts(prompts: PromptInfo[]): Promise<void> {
  // Get version info for display
  const versionDisplayString = await getVersionDisplayString();

  log.blank();
  log.label(`Syrin ${versionDisplayString}`);
  log.blank();
  log.heading(
    `Prompts: ${prompts.length} ${prompts.length === 1 ? 'prompt' : 'prompts'}`
  );
  log.blank();

  if (prompts.length === 0) {
    log.label('  No prompts available');
    log.blank();
    return;
  }

  prompts.forEach((prompt, index) => {
    log.numberedItem(index + 1, prompt.name);
    if (prompt.description) {
      log.label(`    ${prompt.description.split('\n')[0]}`);
    }
    if (prompt.arguments && prompt.arguments.length > 0) {
      log.label('    Arguments:');
      for (const arg of prompt.arguments) {
        const requiredText = arg.required ? ' (required)' : '';
        log.plain(
          `      • ${log.styleText(arg.name, 'cyan')}${requiredText ? log.styleText(requiredText, 'yellow') : ''}`
        );
        if (arg.description) {
          log.label(`        ${arg.description.split('\n')[0]}`);
        }
      }
    } else {
      log.label('    No arguments');
    }
    log.blank();
  });
}
