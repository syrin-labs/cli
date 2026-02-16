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
  type?: string | string[];
  description?: string;
  required?: string[];
  properties?: Record<string, JSONSchemaField>;
  items?: JSONSchemaField | JSONSchemaField[];
  oneOf?: JSONSchemaField[];
  anyOf?: JSONSchemaField[];
  allOf?: JSONSchemaField[];
  $ref?: string;
  enum?: unknown[];
  pattern?: string;
  format?: string;
  example?: unknown;
  examples?: unknown[];
  nullable?: boolean;
}

type JSONSchema = JSONSchemaField | Record<string, unknown>;

/**
 * Type guard to check if object is a JSONSchemaField.
 * Performs structural check for expected JSON Schema field properties.
 */
function isJSONSchemaField(obj: unknown): obj is JSONSchemaField {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ('type' in obj || 'properties' in obj || 'items' in obj || '$ref' in obj)
  );
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
 * Normalize a JSON Schema type to a string representation.
 * Handles string, string[], and undefined types.
 *
 * @param type - The type to normalize (string, string[], or undefined)
 * @returns Normalized type string ('any' for empty/undefined, joined types for arrays)
 */
function normalizeType(type: string | string[] | undefined): string {
  if (Array.isArray(type)) {
    // Empty array defaults to 'any'
    if (type.length === 0) {
      return 'any';
    }
    // Filter out 'null' and join remaining types
    const nonNullTypes = type.filter(t => t !== 'null');
    // If only 'null' remains, return 'null', otherwise join non-null types
    return nonNullTypes.length > 0 ? nonNullTypes.join('|') : 'null';
  }
  // String or undefined: return type or 'any' as fallback
  return type || 'any';
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

  // Handle oneOf / anyOf / allOf schemas
  // These represent unions of schemas - merge fields from all variants
  if (Array.isArray(resolvedSchema.oneOf) && resolvedSchema.oneOf.length > 0) {
    for (const schema of resolvedSchema.oneOf) {
      if (schema && typeof schema === 'object') {
        const subFields = await extractFieldsFromSchema(
          schema,
          toolName,
          isInput
        );
        fields.push(...subFields);
      }
    }
    return fields;
  }

  if (Array.isArray(resolvedSchema.anyOf) && resolvedSchema.anyOf.length > 0) {
    for (const schema of resolvedSchema.anyOf) {
      if (schema && typeof schema === 'object') {
        const subFields = await extractFieldsFromSchema(
          schema,
          toolName,
          isInput
        );
        fields.push(...subFields);
      }
    }
    return fields;
  }

  if (Array.isArray(resolvedSchema.allOf) && resolvedSchema.allOf.length > 0) {
    for (const schema of resolvedSchema.allOf) {
      if (schema && typeof schema === 'object') {
        const subFields = await extractFieldsFromSchema(
          schema,
          toolName,
          isInput
        );
        fields.push(...subFields);
      }
    }
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
      // Handle fields that might not have a type but have other properties (like title)
      // In JSON Schema, fields without explicit type default to 'any'
      if (typeof fieldSchema !== 'object' || fieldSchema === null) {
        continue;
      }

      // If field doesn't pass isJSONSchemaField check but is in properties,
      // it might still be a valid field (e.g., only has 'title' but no 'type')
      // We'll treat it as a field with type 'any' (undefined type normalizes to 'any')
      // Create a field object that will work with our processing
      const field: JSONSchemaField = isJSONSchemaField(fieldSchema)
        ? fieldSchema
        : ({
            ...(fieldSchema as Record<string, unknown>),
            type: undefined, // Will normalize to 'any'
          } as JSONSchemaField);

      // Determine nullable: true if explicitly set, or if type is an array containing 'null'
      // Do not infer nullable from single type === 'null' (that means value must be null)
      const isNullable =
        field.nullable === true ||
        (Array.isArray(field.type) && field.type.includes('null'));

      // Normalize type using helper function
      const normalizedType = normalizeType(field.type);

      const fieldSpec: FieldSpec = {
        tool: toolName,
        name: fieldName,
        type: normalizedType,
        required: required.has(fieldName),
        description: field.description,
        nullable: isNullable,
      };

      // Extract enum values
      if (Array.isArray(field.enum)) {
        fieldSpec.enum = field.enum.map(String);
      }

      // Extract pattern
      if (field.pattern) {
        fieldSpec.pattern = String(field.pattern);
      }

      // Extract format (email, uri, date-time, etc.)
      if (field.format) {
        fieldSpec.format = String(field.format);
      }

      // Extract example
      if (Array.isArray(field.examples) && field.examples.length > 0) {
        fieldSpec.example = field.examples[0];
      } else if (field.example !== undefined) {
        fieldSpec.example = field.example;
      }

      // Handle nested object properties
      // Check if type is 'object' (either directly or in an array)
      const isObjectType =
        (Array.isArray(field.type) && field.type.includes('object')) ||
        field.type === 'object';
      if (isObjectType && field.properties) {
        fieldSpec.properties = await extractFieldsFromSchema(
          field,
          toolName,
          isInput
        );
      }

      // Handle array items schema
      // Check if type is 'array' (either directly or in an array)
      const isArrayType =
        (Array.isArray(field.type) && field.type.includes('array')) ||
        field.type === 'array';
      if (isArrayType && field.items) {
        // Items can be a single schema or array of schemas
        const itemSchemas = Array.isArray(field.items)
          ? field.items
          : [field.items];
        // Merge properties from all item schemas
        const mergedProperties: FieldSpec[] = [];
        for (const itemSchema of itemSchemas) {
          if (itemSchema && typeof itemSchema === 'object') {
            const itemFields = await extractFieldsFromSchema(
              itemSchema,
              toolName,
              isInput
            );
            mergedProperties.push(...itemFields);
          }
        }
        if (mergedProperties.length > 0) {
          fieldSpec.properties = mergedProperties;
        }
      }

      fields.push(fieldSpec);
    }
  } else if (resolvedSchema.type) {
    // Handle non-object types (simple types)
    // Normalize type using helper function
    const normalizedType = normalizeType(resolvedSchema.type);

    const fieldSpec: FieldSpec = {
      tool: toolName,
      name: isInput ? 'input' : 'output',
      type: normalizedType,
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

    if (resolvedSchema.format) {
      fieldSpec.format = String(resolvedSchema.format);
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
