/**
 * Schema normalizer.
 * Normalizes and extracts fields from JSON Schema definitions.
 */

import $RefParser from '@apidevtools/json-schema-ref-parser';
import type { RawTool, ToolSpec, FieldSpec } from './types';

/**
 * JSON Schema types for type-safe access.
 */
interface JSONSchemaField {
  type?: string;
  description?: string;
  required?: string[];
  properties?: Record<string, JSONSchemaField>;
  enum?: unknown[];
  pattern?: string;
  example?: unknown;
  examples?: unknown[];
  nullable?: boolean;
}

type JSONSchema = JSONSchemaField | Record<string, unknown>;

/**
 * Type guard to check if object is a JSONSchemaField.
 */
function isJSONSchemaField(obj: unknown): obj is JSONSchemaField {
  return typeof obj === 'object' && obj !== null;
}

/**
 * Extract tokens from text for similarity matching.
 */
function extractTokens(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2); // Filter out short tokens

  return new Set(tokens);
}

/**
 * Extract field specifications from a JSON Schema object.
 */
async function extractFieldsFromSchema(
  schema: unknown,
  toolName: string,
  isInput: boolean
): Promise<FieldSpec[]> {
  const fields: FieldSpec[] = [];

  if (!schema || typeof schema !== 'object') {
    return fields;
  }

  // Resolve $ref if present
  let resolvedSchema: JSONSchema = schema;
  try {
    resolvedSchema = await $RefParser.dereference(
      schema as Record<string, unknown>
    );
  } catch {
    // If dereference fails, use original schema
    resolvedSchema = schema;
  }

  if (!isJSONSchemaField(resolvedSchema)) {
    return fields;
  }

  // Handle object type with properties
  if (
    resolvedSchema.type === 'object' &&
    resolvedSchema.properties &&
    typeof resolvedSchema.properties === 'object'
  ) {
    const required = new Set(
      Array.isArray(resolvedSchema.required) ? resolvedSchema.required : []
    );
    const properties = resolvedSchema.properties;

    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
      if (!isJSONSchemaField(fieldSchema)) {
        continue;
      }

      const field = fieldSchema;

      const fieldSpec: FieldSpec = {
        tool: toolName,
        name: fieldName,
        type: field.type || 'any',
        required: required.has(fieldName),
        description: field.description,
        nullable: field.nullable === true || field.type === 'null',
      };

      // Extract enum values
      if (Array.isArray(field.enum)) {
        fieldSpec.enum = field.enum.map(String);
      }

      // Extract pattern
      if (field.pattern) {
        fieldSpec.pattern = String(field.pattern);
      }

      // Extract example
      if (Array.isArray(field.examples) && field.examples.length > 0) {
        fieldSpec.example = field.examples[0];
      } else if (field.example !== undefined) {
        fieldSpec.example = field.example;
      }

      // Handle nested object properties
      if (field.type === 'object' && field.properties) {
        fieldSpec.properties = await extractFieldsFromSchema(
          field,
          toolName,
          isInput
        );
      }

      fields.push(fieldSpec);
    }
  } else if (resolvedSchema.type) {
    // Handle non-object types (simple types)
    const fieldSpec: FieldSpec = {
      tool: toolName,
      name: isInput ? 'input' : 'output',
      type: resolvedSchema.type,
      required: !isInput, // Outputs are always "required" conceptually
      description: resolvedSchema.description,
      nullable: resolvedSchema.nullable === true,
    };

    if (Array.isArray(resolvedSchema.enum)) {
      fieldSpec.enum = resolvedSchema.enum.map(String);
    }

    if (resolvedSchema.pattern) {
      fieldSpec.pattern = String(resolvedSchema.pattern);
    }

    if (
      resolvedSchema.examples &&
      Array.isArray(resolvedSchema.examples) &&
      resolvedSchema.examples.length > 0
    ) {
      fieldSpec.example = resolvedSchema.examples[0];
    } else if (resolvedSchema.example !== undefined) {
      fieldSpec.example = resolvedSchema.example;
    }

    fields.push(fieldSpec);
  }

  return fields;
}

/**
 * Normalize a raw tool into a ToolSpec.
 */
export async function normalizeTool(rawTool: RawTool): Promise<ToolSpec> {
  const description = rawTool.description || '';
  const inputs = rawTool.inputSchema
    ? await extractFieldsFromSchema(rawTool.inputSchema, rawTool.name, true)
    : [];
  const outputs = rawTool.outputSchema
    ? await extractFieldsFromSchema(rawTool.outputSchema, rawTool.name, false)
    : [];

  return {
    name: rawTool.name,
    description,
    inputs,
    outputs,
    descriptionTokens: extractTokens(rawTool.name + ' ' + description),
  };
}

/**
 * Normalize multiple raw tools.
 */
export async function normalizeTools(rawTools: RawTool[]): Promise<ToolSpec[]> {
  const normalized = await Promise.all(rawTools.map(normalizeTool));
  return normalized;
}
