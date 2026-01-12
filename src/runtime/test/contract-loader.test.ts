/**
 * Tests for contract loader.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadContract,
  loadAllContracts,
  discoverContractFiles,
  extractToolNameFromPath,
  findContractForTool,
} from './contract-loader';
import { ConfigurationError } from '../../utils/errors';

describe('Contract Loader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syrin-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadContract', () => {
    it('should load a valid contract file', () => {
      const contractContent = `
version: 1
tool: test_tool
contract:
  input_schema: TestInput
  output_schema: TestOutput
guarantees:
  side_effects: none
  max_output_size: 50kb
`;

      const filePath = path.join(tempDir, 'test_tool.yaml');
      fs.writeFileSync(filePath, contractContent);

      const contract = loadContract(filePath);

      expect(contract.version).toBe(1);
      expect(contract.tool).toBe('test_tool');
      expect(contract.contract.input_schema).toBe('TestInput');
      expect(contract.contract.output_schema).toBe('TestOutput');
      expect(contract.guarantees?.side_effects).toBe('none');
      expect(contract.guarantees?.max_output_size).toBe('50kb');
    });

    it('should throw error for missing file', () => {
      const filePath = path.join(tempDir, 'nonexistent.yaml');

      expect(() => loadContract(filePath)).toThrow(ConfigurationError);
    });

    it('should throw error for invalid contract structure', () => {
      const contractContent = 'invalid: yaml';
      const filePath = path.join(tempDir, 'invalid.yaml');
      fs.writeFileSync(filePath, contractContent);

      expect(() => loadContract(filePath)).toThrow(ConfigurationError);
    });
  });

  describe('discoverContractFiles', () => {
    it('should discover all YAML files in directory', () => {
      fs.writeFileSync(path.join(tempDir, 'tool1.yaml'), 'version: 1');
      fs.writeFileSync(path.join(tempDir, 'tool2.yaml'), 'version: 1');
      fs.writeFileSync(path.join(tempDir, 'not-yaml.txt'), 'text');

      const files = discoverContractFiles(tempDir);

      expect(files.length).toBe(2);
      expect(files.some(f => f.endsWith('tool1.yaml'))).toBe(true);
      expect(files.some(f => f.endsWith('tool2.yaml'))).toBe(true);
    });

    it('should discover files recursively', () => {
      const subDir = path.join(tempDir, 'subdir');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(tempDir, 'tool1.yaml'), 'version: 1');
      fs.writeFileSync(path.join(subDir, 'tool2.yaml'), 'version: 1');

      const files = discoverContractFiles(tempDir);

      expect(files.length).toBe(2);
    });

    it('should throw error for non-existent directory', () => {
      const nonExistentDir = path.join(tempDir, 'nonexistent');

      expect(() => discoverContractFiles(nonExistentDir)).toThrow(
        ConfigurationError
      );
    });
  });

  describe('loadAllContracts', () => {
    it('should load all contracts from directory', () => {
      const contract1 = `
version: 1
tool: tool1
contract:
  input_schema: Input1
  output_schema: Output1
guarantees:
  side_effects: none
  max_output_size: 1kb
`;
      const contract2 = `
version: 1
tool: tool2
contract:
  input_schema: Input2
  output_schema: Output2
guarantees:
  side_effects: none
  max_output_size: 1kb
`;

      fs.writeFileSync(path.join(tempDir, 'tool1.yaml'), contract1);
      fs.writeFileSync(path.join(tempDir, 'tool2.yaml'), contract2);

      const contracts = loadAllContracts(tempDir);

      expect(contracts.length).toBe(2);
      expect(contracts.some(c => c.tool === 'tool1')).toBe(true);
      expect(contracts.some(c => c.tool === 'tool2')).toBe(true);
    });

    it('should throw error if no contracts found', () => {
      expect(() => loadAllContracts(tempDir)).toThrow(ConfigurationError);
    });
  });

  describe('extractToolNameFromPath', () => {
    it('should extract tool name from filename', () => {
      const filePath = path.join(tempDir, 'my_tool.yaml');
      const toolName = extractToolNameFromPath(filePath);

      expect(toolName).toBe('my_tool');
    });

    it('should handle nested paths', () => {
      const filePath = path.join(tempDir, 'subdir', 'nested_tool.yaml');
      const toolName = extractToolNameFromPath(filePath);

      expect(toolName).toBe('nested_tool');
    });
  });

  describe('findContractForTool', () => {
    it('should find contract for tool name', () => {
      const contracts = [
        {
          version: 1 as const,
          tool: 'tool1',
          contract: { input_schema: 'Input1', output_schema: 'Output1' },
          guarantees: {},
          filePath: 'tool1.yaml',
          directory: tempDir,
          toolName: 'tool1',
        },
        {
          version: 1 as const,
          tool: 'tool2',
          contract: { input_schema: 'Input2', output_schema: 'Output2' },
          guarantees: {},
          filePath: 'tool2.yaml',
          directory: tempDir,
          toolName: 'tool2',
        },
      ];

      const found = findContractForTool(contracts, 'tool1');

      expect(found).toBeDefined();
      expect(found?.tool).toBe('tool1');
    });

    it('should return undefined if tool not found', () => {
      const contracts = [
        {
          version: 1 as const,
          tool: 'tool1',
          contract: { input_schema: 'Input1', output_schema: 'Output1' },
          guarantees: {},
          filePath: 'tool1.yaml',
          directory: tempDir,
          toolName: 'tool1',
        },
      ];

      const found = findContractForTool(contracts, 'nonexistent');

      expect(found).toBeUndefined();
    });
  });
});
