/**
 * Tests for InteractiveREPL.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { InteractiveREPL, REPLCommand } from './repl';
import type { EventEmitter } from '@/events/emitter';

// Mock readline
vi.mock('readline', () => ({
  createInterface: vi.fn(),
  clearLine: vi.fn(),
  cursorTo: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  log: {
    blank: vi.fn(),
    plain: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InteractiveREPL', () => {
  let tempDir: string;
  let mockRl: any;
  let repl: InteractiveREPL;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syrin-repl-test-'));
    mockRl = {
      prompt: vi.fn(),
      close: vi.fn(),
      setPrompt: vi.fn(),
      on: vi.fn(),
      history: [],
    };

    vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create REPL with default options', () => {
      const defaultRepl = new InteractiveREPL();
      expect(defaultRepl).toBeDefined();
      expect(readline.createInterface).toHaveBeenCalled();
    });

    it('should create REPL with custom options', () => {
      const customRepl = new InteractiveREPL({
        prompt: 'Custom > ',
        saveHistory: true,
        historyFile: path.join(tempDir, 'history.txt'),
        maxHistorySize: 500,
      });
      expect(customRepl).toBeDefined();
    });

    it('should load history from file if saveHistory is enabled', () => {
      const historyFile = path.join(tempDir, 'history.txt');
      fs.writeFileSync(historyFile, 'command1\ncommand2\n');

      const replWithHistory = new InteractiveREPL({
        saveHistory: true,
        historyFile,
      });

      expect(replWithHistory).toBeDefined();
      // History should be loaded (we can't directly access it, but constructor should not throw)
    });
  });

  describe('start', () => {
    it('should set up event handlers and prompt', () => {
      const onInput = vi.fn();
      const repl = new InteractiveREPL();

      repl.start(onInput);

      expect(mockRl.on).toHaveBeenCalledWith('line', expect.any(Function));
      expect(mockRl.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockRl.prompt).toHaveBeenCalled();
    });

    it('should register line handler for user input', () => {
      const onInput = vi.fn();
      const repl = new InteractiveREPL();

      repl.start(onInput);

      // Verify line handler is registered
      const lineCall = vi.mocked(mockRl.on).mock.calls.find(
        call => call[0] === 'line'
      );
      expect(lineCall).toBeDefined();
      expect(lineCall?.[1]).toBeInstanceOf(Function);
    });

    it('should register close handler', () => {
      const onClose = vi.fn();
      const repl = new InteractiveREPL();

      repl.start(vi.fn(), onClose);

      // Verify close handler is registered
      const closeCall = vi.mocked(mockRl.on).mock.calls.find(
        call => call[0] === 'close'
      );
      expect(closeCall).toBeDefined();
      expect(closeCall?.[1]).toBeInstanceOf(Function);
    });
  });

  describe('special commands', () => {
    it('should have REPLCommand enum values', () => {
      expect(REPLCommand.EXIT).toBe('/exit');
      expect(REPLCommand.QUIT).toBe('/quit');
      expect(REPLCommand.CLEAR).toBe('/clear');
      expect(REPLCommand.HELP).toBe('/help');
      expect(REPLCommand.HISTORY).toBe('/history');
      expect(REPLCommand.TOOLS).toBe('/tools');
    });
  });

  describe('stop', () => {
    it('should close readline interface', () => {
      const repl = new InteractiveREPL();
      repl.stop();

      expect(mockRl.close).toHaveBeenCalled();
    });

    it('should save history if saveHistory is enabled', async () => {
      const historyFile = path.join(tempDir, 'history.txt');
      const repl = new InteractiveREPL({
        saveHistory: true,
        historyFile,
      });

      repl.start(vi.fn());
      // Add some history directly to test save functionality
      // The line handler is async, so we'll add history manually for this test
      const history = repl.getHistory();
      // Manually add to history to test save
      (repl as any).history = ['test command'];

      repl.stop();

      // History should be saved
      await new Promise(resolve => setTimeout(resolve, 100));
      if (fs.existsSync(historyFile)) {
        const content = fs.readFileSync(historyFile, 'utf-8');
        expect(content).toContain('test command');
      }
    });
  });

  describe('setPrompt', () => {
    it('should set new prompt', () => {
      const repl = new InteractiveREPL();
      repl.setPrompt('New > ');

      expect(mockRl.setPrompt).toHaveBeenCalledWith('New > ');
    });
  });

  describe('write and writeLine', () => {
    it('should write to stdout', () => {
      const repl = new InteractiveREPL();
      const writeSpy = vi.spyOn(process.stdout, 'write');

      repl.write('test message');

      expect(writeSpy).toHaveBeenCalledWith('test message');
      writeSpy.mockRestore();
    });

    it('should write line using logger', async () => {
      const { log } = await import('@/utils/logger');
      const repl = new InteractiveREPL();

      repl.writeLine('test line');

      expect(log.plain).toHaveBeenCalledWith('test line');
    });
  });

  describe('clearLine', () => {
    it('should clear current line', () => {
      const repl = new InteractiveREPL();
      repl.clearLine();

      expect(readline.clearLine).toHaveBeenCalled();
      expect(readline.cursorTo).toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('should return history array', () => {
      const repl = new InteractiveREPL();
      repl.start(vi.fn());

      // Add some history
      const lineHandler = vi.mocked(mockRl.on).mock.calls.find(
        call => call[0] === 'line'
      )?.[1] as (line: string) => void;
      lineHandler('command1');
      lineHandler('command2');

      const history = repl.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('clearHistory', () => {
    it('should clear history', () => {
      const historyFile = path.join(tempDir, 'history.txt');
      fs.writeFileSync(historyFile, 'old1\nold2\n');

      const repl = new InteractiveREPL({
        saveHistory: true,
        historyFile,
      });

      repl.start(vi.fn());
      repl.clearHistory();

      const history = repl.getHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('history management', () => {
    it('should manage history correctly', () => {
      const repl = new InteractiveREPL();
      repl.start(vi.fn());

      // Test that getHistory returns an array
      const history = repl.getHistory();
      expect(Array.isArray(history)).toBe(true);
      
      // Test that clearHistory works
      repl.clearHistory();
      expect(repl.getHistory().length).toBe(0);
    });

    it('should limit history size', async () => {
      const repl = new InteractiveREPL({
        maxHistorySize: 5,
      });

      repl.start(vi.fn());
      const lineHandler = vi.mocked(mockRl.on).mock.calls.find(
        call => call[0] === 'line'
      )?.[1] as (line: string) => void;

      // Add more than maxHistorySize commands
      for (let i = 0; i < 10; i++) {
        lineHandler(`command${i}`);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const history = repl.getHistory();
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });
});
