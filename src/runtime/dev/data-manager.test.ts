/**
 * Tests for DataManager.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DataManager } from './data-manager';
// Mock json-file-saver
vi.mock('@/utils/json-file-saver', () => ({
  saveJSONToFile: vi.fn(),
}));

import { saveJSONToFile } from '@/utils/json-file-saver';

describe('DataManager', () => {
  let tempDir: string;
  let dataManager: DataManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syrin-data-test-'));
    dataManager = new DataManager(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create data directory if it does not exist', () => {
      const newDir = path.join(tempDir, 'new-project');
      void new DataManager(newDir);

      const expectedDataDir = path.join(newDir, '.syrin', 'data');
      expect(fs.existsSync(expectedDataDir)).toBe(true);
    });

    it('should use existing data directory if it exists', () => {
      const existingDir = path.join(tempDir, '.syrin', 'data');
      fs.mkdirSync(existingDir, { recursive: true });

      void new DataManager(tempDir);
      expect(fs.existsSync(existingDir)).toBe(true);
    });
  });

  describe('shouldExternalize', () => {
    it('should return true for data larger than 100KB', () => {
      expect(DataManager.shouldExternalize(101 * 1024)).toBe(true);
      expect(DataManager.shouldExternalize(200 * 1024)).toBe(true);
    });

    it('should return false for data smaller than 100KB', () => {
      expect(DataManager.shouldExternalize(99 * 1024)).toBe(false);
      expect(DataManager.shouldExternalize(50 * 1024)).toBe(false);
      expect(DataManager.shouldExternalize(0)).toBe(false);
    });

    it('should return false for exactly 100KB', () => {
      expect(DataManager.shouldExternalize(100 * 1024)).toBe(false);
    });
  });

  describe('store', () => {
    it('should store data and return reference ID', () => {
      const testData = { key: 'value', number: 42 };
      const mockFilePath = path.join(
        tempDir,
        '.syrin',
        'data',
        'test-tool.json'
      );

      vi.mocked(saveJSONToFile).mockReturnValue(mockFilePath);

      // Create the file to simulate saveJSONToFile
      fs.mkdirSync(path.dirname(mockFilePath), { recursive: true });
      fs.writeFileSync(mockFilePath, JSON.stringify(testData));

      const refId = dataManager.store(testData, 'test-tool');

      expect(refId).toMatch(/^data-\d+-[a-z0-9]+$/);
      expect(saveJSONToFile).toHaveBeenCalledWith(
        testData,
        'test-tool',
        path.join(tempDir, '.syrin', 'data')
      );
    });

    it('should create reference with correct metadata', () => {
      const testData = { large: 'data' };
      const mockFilePath = path.join(tempDir, '.syrin', 'data', 'tool.json');

      vi.mocked(saveJSONToFile).mockReturnValue(mockFilePath);
      fs.mkdirSync(path.dirname(mockFilePath), { recursive: true });
      fs.writeFileSync(mockFilePath, JSON.stringify(testData));

      const refId = dataManager.store(testData, 'my-tool');
      const ref = dataManager.getReference(refId);

      expect(ref).toBeDefined();
      expect(ref?.filePath).toBe(mockFilePath);
      expect(ref?.toolName).toBe('my-tool');
      expect(ref?.size).toBeGreaterThan(0);
      expect(ref?.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('load', () => {
    it('should load data by reference ID', () => {
      const testData = { key: 'value', nested: { data: 123 } };
      const mockFilePath = path.join(tempDir, '.syrin', 'data', 'test.json');

      vi.mocked(saveJSONToFile).mockReturnValue(mockFilePath);
      fs.mkdirSync(path.dirname(mockFilePath), { recursive: true });
      fs.writeFileSync(mockFilePath, JSON.stringify(testData));

      const refId = dataManager.store(testData, 'test-tool');
      const loaded = dataManager.load(refId);

      expect(loaded).toEqual(testData);
    });

    it('should throw error for non-existent reference ID', () => {
      expect(() => {
        dataManager.load('non-existent-id');
      }).toThrow('Data reference not found: non-existent-id');
    });
  });

  describe('getReference', () => {
    it('should return reference metadata without loading data', () => {
      const testData = { data: 'test' };
      const mockFilePath = path.join(tempDir, '.syrin', 'data', 'ref.json');

      vi.mocked(saveJSONToFile).mockReturnValue(mockFilePath);
      fs.mkdirSync(path.dirname(mockFilePath), { recursive: true });
      fs.writeFileSync(mockFilePath, JSON.stringify(testData));

      const refId = dataManager.store(testData, 'tool');
      const ref = dataManager.getReference(refId);

      expect(ref).toBeDefined();
      expect(ref?.id).toBe(refId);
      expect(ref?.filePath).toBe(mockFilePath);
      expect(ref?.toolName).toBe('tool');
    });

    it('should return undefined for non-existent reference', () => {
      const ref = dataManager.getReference('non-existent');
      expect(ref).toBeUndefined();
    });
  });

  describe('formatSize', () => {
    it('should format bytes as KB for sizes less than 1MB', () => {
      expect(DataManager.formatSize(1024)).toBe('1.00KB');
      expect(DataManager.formatSize(512 * 1024)).toBe('512.00KB');
      expect(DataManager.formatSize(999 * 1024)).toBe('999.00KB');
    });

    it('should format bytes as MB for sizes 1MB or larger', () => {
      expect(DataManager.formatSize(1024 * 1024)).toBe('1.00MB');
      expect(DataManager.formatSize(2.5 * 1024 * 1024)).toBe('2.50MB');
      expect(DataManager.formatSize(10 * 1024 * 1024)).toBe('10.00MB');
    });

    it('should handle zero bytes', () => {
      expect(DataManager.formatSize(0)).toBe('0.00KB');
    });
  });
});
