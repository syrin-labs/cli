/**
 * Tests for CLI option parsing utilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseEnvOption,
  parseEnvOptions,
  parseAuthHeaderOption,
  parseAuthHeaderOptions,
} from './option-parsers';

describe('option-parsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseEnvOption', () => {
    it('should parse KEY=value format', () => {
      const result = parseEnvOption('API_KEY=test-value');
      expect(result).toEqual({ key: 'API_KEY', value: 'test-value' });
    });

    it('should handle values with equals signs', () => {
      const result = parseEnvOption('CONFIG={"key":"value"}');
      expect(result).toEqual({ key: 'CONFIG', value: '{"key":"value"}' });
    });

    it('should trim whitespace', () => {
      const result = parseEnvOption('  KEY  =  value  ');
      expect(result).toEqual({ key: 'KEY', value: 'value' });
    });

    it('should use process.env when no equals sign', () => {
      process.env.TEST_ENV_VAR = 'from-env';
      const result = parseEnvOption('TEST_ENV_VAR');
      expect(result).toEqual({ key: 'TEST_ENV_VAR', value: 'from-env' });
      delete process.env.TEST_ENV_VAR;
    });

    it('should return empty string when env var not found', () => {
      const result = parseEnvOption('NONEXISTENT_VAR');
      expect(result).toEqual({ key: 'NONEXISTENT_VAR', value: '' });
    });
  });

  describe('parseEnvOptions', () => {
    it('should parse multiple env options', () => {
      const result = parseEnvOptions(['KEY1=value1', 'KEY2=value2']);
      expect(result).toEqual({
        KEY1: 'value1',
        KEY2: 'value2',
      });
    });

    it('should handle empty array', () => {
      const result = parseEnvOptions([]);
      expect(result).toEqual({});
    });

    it('should handle undefined', () => {
      const result = parseEnvOptions(undefined);
      expect(result).toEqual({});
    });

    it('should handle mixed KEY=value and KEY formats', () => {
      process.env.EXISTING_VAR = 'existing-value';
      const result = parseEnvOptions(['KEY1=value1', 'EXISTING_VAR']);
      expect(result).toEqual({
        KEY1: 'value1',
        EXISTING_VAR: 'existing-value',
      });
      delete process.env.EXISTING_VAR;
    });

    it('should skip empty keys', () => {
      const result = parseEnvOptions(['=value', 'KEY=value']);
      expect(result).toEqual({
        KEY: 'value',
      });
    });
  });

  describe('parseAuthHeaderOption', () => {
    it('should parse "Header: Value" format', () => {
      const result = parseAuthHeaderOption('Authorization: Bearer token123');
      expect(result).toEqual({
        key: 'Authorization',
        value: 'Bearer token123',
      });
    });

    it('should parse "Header=Value" format', () => {
      const result = parseAuthHeaderOption('Authorization=Bearer token123');
      expect(result).toEqual({
        key: 'Authorization',
        value: 'Bearer token123',
      });
    });

    it('should treat token without separator as Bearer token', () => {
      const result = parseAuthHeaderOption('token123');
      expect(result).toEqual({
        key: 'Authorization',
        value: 'Bearer token123',
      });
    });

    it('should trim whitespace', () => {
      const result = parseAuthHeaderOption(
        '  Authorization  :  Bearer token  '
      );
      expect(result).toEqual({
        key: 'Authorization',
        value: 'Bearer token',
      });
    });

    it('should handle custom headers', () => {
      const result = parseAuthHeaderOption('X-API-Key: my-api-key');
      expect(result).toEqual({
        key: 'X-API-Key',
        value: 'my-api-key',
      });
    });

    it('should prefer colon over equals', () => {
      const result = parseAuthHeaderOption('Header: value=with=equals');
      expect(result).toEqual({
        key: 'Header',
        value: 'value=with=equals',
      });
    });
  });

  describe('parseAuthHeaderOptions', () => {
    it('should parse multiple header options', () => {
      const result = parseAuthHeaderOptions([
        'Authorization: Bearer token123',
        'X-API-Key: my-key',
      ]);
      expect(result).toEqual({
        Authorization: 'Bearer token123',
        'X-API-Key': 'my-key',
      });
    });

    it('should handle empty array', () => {
      const result = parseAuthHeaderOptions([]);
      expect(result).toEqual({});
    });

    it('should handle undefined', () => {
      const result = parseAuthHeaderOptions(undefined);
      expect(result).toEqual({});
    });

    it('should handle mixed formats', () => {
      const result = parseAuthHeaderOptions([
        'Authorization: Bearer token',
        'X-Key=value',
        'simple-token',
      ]);
      // Note: Last Authorization header overwrites the first one
      expect(result).toHaveProperty('X-Key', 'value');
      expect(result).toHaveProperty('Authorization');
      // The last token becomes Bearer token
      expect(result.Authorization).toBe('Bearer simple-token');
      // First Authorization is overwritten by the last one
      expect(Object.keys(result).length).toBe(2);
    });

    it('should skip entries without key or value', () => {
      const result = parseAuthHeaderOptions([': value', 'key:', '']);
      expect(result).toEqual({});
    });
  });
});
