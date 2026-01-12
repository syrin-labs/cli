/**
 * Output schema validator.
 * Validates that tool outputs match declared schema structure.
 */

/**
 * JSON Schema field interface.
 */
interface JSONSchemaField {
  type?: string | string[];
  description?: string;
  required?: string[];
  properties?: Record<string, JSONSchemaField>;
  items?: JSONSchemaField | JSONSchemaField[];
  $ref?: string;
  enum?: unknown[];
  pattern?: string;
  example?: unknown;
  examples?: unknown[];
  nullable?: boolean;
}

type JSONSchema = JSONSchemaField | Record<string, unknown> | unknown;

/**
 * Validation result.
 */
export interface OutputValidationResult {
  /** Whether output is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Validation details */
  details?: {
    /** Missing required fields */
    missingFields?: string[];
    /** Fields with type mismatches */
    typeMismatches?: Array<{ field: string; expected: string; actual: string }>;
  };
}

/**
 * Validate output structure against schema.
 * @param output - Tool output to validate
 * @param schema - Expected output schema
 * @returns Validation result
 */
/**
 * Type guard for JSONSchemaField.
 */
function isJSONSchemaField(obj: unknown): obj is JSONSchemaField {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ('type' in obj || 'properties' in obj || 'items' in obj || '$ref' in obj)
  );
}

export function validateOutputStructure(
  output: unknown,
  schema: JSONSchema
): OutputValidationResult {
  try {
    // Basic type check
    if (!isJSONSchemaField(schema)) {
      return {
        valid: false,
        error: 'Invalid schema: schema must be an object',
      };
    }

    // If output is not an object, check if schema expects object
    if (typeof output !== 'object' || output === null) {
      const schemaType = getSchemaType(schema);
      if (schemaType === 'object' && !isNullable(schema)) {
        return {
          valid: false,
          error: `Output type mismatch: expected object, got ${typeof output}`,
        };
      }
      // If schema allows null or other types, it might be valid
      return { valid: true };
    }

    // Validate object structure
    return validateObjectStructure(output as Record<string, unknown>, schema);
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validate object structure against schema.
 */
function validateObjectStructure(
  output: Record<string, unknown>,
  schema: JSONSchema
): OutputValidationResult {
  if (!isJSONSchemaField(schema)) {
    return { valid: false, error: 'Invalid schema' };
  }

  const properties = schema.properties;
  const required = schema.required;

  const missingFields: string[] = [];
  const typeMismatches: Array<{
    field: string;
    expected: string;
    actual: string;
  }> = [];

  // Check required fields
  if (required && properties) {
    for (const fieldName of required) {
      if (!(fieldName in output)) {
        missingFields.push(fieldName);
      }
    }
  }

  // Check field types (recursively for nested objects and arrays)
  if (properties) {
    for (const [fieldName, fieldValue] of Object.entries(output)) {
      const fieldSchema = properties[fieldName];
      if (fieldSchema) {
        const expectedType = getSchemaType(fieldSchema);
        const actualType = getValueType(fieldValue);

        if (
          !isTypeCompatible(actualType, expectedType, fieldSchema, fieldValue)
        ) {
          typeMismatches.push({
            field: fieldName,
            expected: expectedType,
            actual: actualType,
          });
        } else {
          // Recursively validate nested structures
          if (isJSONSchemaField(fieldSchema)) {
            // Validate nested object
            if (
              expectedType === 'object' &&
              actualType === 'object' &&
              fieldSchema.properties &&
              fieldValue !== null &&
              typeof fieldValue === 'object' &&
              !Array.isArray(fieldValue)
            ) {
              const nestedResult = validateObjectStructure(
                fieldValue as Record<string, unknown>,
                fieldSchema
              );
              if (!nestedResult.valid) {
                // Add field prefix to nested errors
                const prefix = fieldName + '.';
                if (nestedResult.details?.missingFields) {
                  missingFields.push(
                    ...nestedResult.details.missingFields.map(f => prefix + f)
                  );
                }
                if (nestedResult.details?.typeMismatches) {
                  typeMismatches.push(
                    ...nestedResult.details.typeMismatches.map(m => ({
                      field: prefix + m.field,
                      expected: m.expected,
                      actual: m.actual,
                    }))
                  );
                }
              }
            }
            // Validate array items
            else if (
              expectedType === 'array' &&
              actualType === 'array' &&
              fieldSchema.items &&
              Array.isArray(fieldValue)
            ) {
              const itemsSchema = Array.isArray(fieldSchema.items)
                ? fieldSchema.items[0]
                : fieldSchema.items;
              if (itemsSchema && isJSONSchemaField(itemsSchema)) {
                for (let i = 0; i < fieldValue.length; i++) {
                  const item = fieldValue[i];
                  const itemType = getValueType(item);
                  const expectedItemType = getSchemaType(itemsSchema);

                  if (
                    !isTypeCompatible(
                      itemType,
                      expectedItemType,
                      itemsSchema,
                      item
                    )
                  ) {
                    typeMismatches.push({
                      field: `${fieldName}[${i}]`,
                      expected: expectedItemType,
                      actual: itemType,
                    });
                  } else if (
                    expectedItemType === 'object' &&
                    itemType === 'object' &&
                    itemsSchema.properties &&
                    item !== null &&
                    typeof item === 'object' &&
                    !Array.isArray(item)
                  ) {
                    // Recursively validate array item objects
                    const itemResult = validateObjectStructure(
                      item as Record<string, unknown>,
                      itemsSchema
                    );
                    if (!itemResult.valid) {
                      const prefix = `${fieldName}[${i}].`;
                      if (itemResult.details?.missingFields) {
                        missingFields.push(
                          ...itemResult.details.missingFields.map(
                            f => prefix + f
                          )
                        );
                      }
                      if (itemResult.details?.typeMismatches) {
                        typeMismatches.push(
                          ...itemResult.details.typeMismatches.map(m => ({
                            field: prefix + m.field,
                            expected: m.expected,
                            actual: m.actual,
                          }))
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  if (missingFields.length > 0 || typeMismatches.length > 0) {
    return {
      valid: false,
      error: 'Output structure does not match schema',
      details: {
        missingFields: missingFields.length > 0 ? missingFields : undefined,
        typeMismatches: typeMismatches.length > 0 ? typeMismatches : undefined,
      },
    };
  }

  return { valid: true };
}

/**
 * Get schema type as string.
 */
function getSchemaType(schema: JSONSchema): string {
  if (!isJSONSchemaField(schema)) {
    return 'unknown';
  }

  const type = schema.type;
  if (typeof type === 'string') {
    return type;
  }
  if (Array.isArray(type)) {
    // Return first non-null type, or 'any' if all null
    const nonNull = type.find(t => t !== 'null');
    return nonNull || 'null';
  }

  // Infer from properties
  if (schema.properties) {
    return 'object';
  }
  if (schema.items) {
    return 'array';
  }

  return 'any';
}

/**
 * Get value type as string.
 */
function getValueType(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

/**
 * Check if actual type is compatible with expected type.
 */
function isTypeCompatible(
  actualType: string,
  expectedType: string,
  schema: JSONSchemaField,
  value: unknown
): boolean {
  // Exact match
  if (actualType === expectedType) {
    // For integer type, verify it's actually an integer (not just a number)
    if (expectedType === 'integer' && typeof value === 'number') {
      return Number.isInteger(value);
    }
    return true;
  }

  // Null compatibility
  if (actualType === 'null' && isNullable(schema)) {
    return true;
  }

  // Number/integer compatibility
  if (expectedType === 'number' && actualType === 'number') {
    return true;
  }
  if (expectedType === 'integer' && actualType === 'number') {
    // Integer requires the value to be a whole number
    return Number.isInteger(value);
  }

  // Array compatibility
  if (expectedType === 'array' && actualType === 'array') {
    return true;
  }

  // Object compatibility
  if (expectedType === 'object' && actualType === 'object') {
    return true;
  }

  // Any type accepts anything
  if (expectedType === 'any') {
    return true;
  }

  return false;
}

/**
 * Check if schema is nullable.
 */
function isNullable(schema: JSONSchema): boolean {
  if (!isJSONSchemaField(schema)) {
    return false;
  }
  if (schema.nullable === true) {
    return true;
  }
  const type = schema.type;
  if (Array.isArray(type)) {
    return type.includes('null');
  }
  return false;
}
