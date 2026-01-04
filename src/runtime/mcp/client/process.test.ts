/**
 * Tests for process spawning utilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as childProcess from 'child_process';
import {
  requiresShellExecution,
  parseCommand,
  setupProcessLogCapture,
  spawnProcess,
} from './process';
import { log } from '@/utils/logger';

// Mock logger
vi.mock('@/utils/logger', () => ({
  log: {
    plain: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock child_process
vi.mock('child_process', async () => {
  const actual = await vi.importActual<typeof childProcess>('child_process');
  return {
    ...actual,
    spawn: vi.fn(),
  };
});

describe('process utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requiresShellExecution', () => {
    it('should return false for simple commands', () => {
      expect(requiresShellExecution('python server.py')).toBe(false);
      expect(requiresShellExecution('node index.js')).toBe(false);
      expect(requiresShellExecution('echo hello')).toBe(false);
    });

    it('should return true for commands with && operator', () => {
      expect(requiresShellExecution('cmd1 && cmd2')).toBe(true);
      expect(requiresShellExecution('python server.py && echo done')).toBe(
        true
      );
    });

    it('should return true for commands with || operator', () => {
      expect(requiresShellExecution('cmd1 || cmd2')).toBe(true);
      expect(requiresShellExecution('python server.py || echo failed')).toBe(
        true
      );
    });

    it('should return true for commands with pipe operator', () => {
      expect(requiresShellExecution('cmd1 | cmd2')).toBe(true);
      expect(requiresShellExecution('cat file.txt | grep test')).toBe(true);
    });

    it('should return true for commands with semicolon', () => {
      // The regex /\s+;\s+/ requires one or more spaces before AND after semicolon
      expect(requiresShellExecution('cmd1 ; cmd2')).toBe(true); // Spaces before and after
      expect(requiresShellExecution('cd /tmp ; python server.py')).toBe(true);
      // Without spaces on both sides, it won't match
      expect(requiresShellExecution('cmd1; cmd2')).toBe(false); // No space before
      expect(requiresShellExecution('cmd1;cmd2')).toBe(false); // No spaces
    });

    it('should return true for commands with variable expansion ${VAR}', () => {
      expect(requiresShellExecution('echo ${HOME}')).toBe(true);
      expect(requiresShellExecution('cd ${PROJECT_DIR}')).toBe(true);
    });

    it('should return true for commands with command substitution $(command)', () => {
      expect(requiresShellExecution('echo $(date)')).toBe(true);
      expect(requiresShellExecution('cd $(pwd)')).toBe(true);
    });

    it('should return true for commands with variable reference $VAR', () => {
      expect(requiresShellExecution('echo $HOME')).toBe(true);
      expect(requiresShellExecution('cd $PROJECT_DIR')).toBe(true);
    });

    it('should return true for commands with backtick substitution', () => {
      expect(requiresShellExecution('echo `date`')).toBe(true);
      expect(requiresShellExecution('cd `pwd`')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(requiresShellExecution('')).toBe(false);
      expect(requiresShellExecution('python')).toBe(false);
      expect(requiresShellExecution('python server.py --port $PORT')).toBe(
        true
      );
    });
  });

  describe('parseCommand', () => {
    it('should parse simple commands', () => {
      const result = parseCommand('python server.py');
      expect(result.executable).toBe('python');
      expect(result.args).toEqual(['server.py']);
    });

    it('should parse commands with multiple arguments', () => {
      const result = parseCommand('node index.js --port 3000 --env dev');
      expect(result.executable).toBe('node');
      expect(result.args).toEqual([
        'index.js',
        '--port',
        '3000',
        '--env',
        'dev',
      ]);
    });

    it('should handle commands with shell operators', () => {
      const result = parseCommand('cmd1 && cmd2');
      expect(result.executable).toBe(process.env.SHELL || '/bin/sh');
      expect(result.args).toEqual(['-c', 'cmd1 && cmd2']);
    });

    it('should handle commands with variables', () => {
      const result = parseCommand('echo $HOME');
      expect(result.executable).toBe(process.env.SHELL || '/bin/sh');
      expect(result.args).toEqual(['-c', 'echo $HOME']);
    });

    it('should handle commands with command substitution', () => {
      const result = parseCommand('cd $(pwd)');
      expect(result.executable).toBe(process.env.SHELL || '/bin/sh');
      expect(result.args).toEqual(['-c', 'cd $(pwd)']);
    });

    it('should handle empty command', () => {
      const result = parseCommand('');
      expect(result.executable).toBe('');
      expect(result.args).toEqual([]);
    });

    it('should handle single executable', () => {
      const result = parseCommand('python');
      expect(result.executable).toBe('python');
      expect(result.args).toEqual([]);
    });

    it('should handle commands with multiple spaces', () => {
      const result = parseCommand('python   server.py   --port   3000');
      expect(result.executable).toBe('python');
      expect(result.args).toEqual(['server.py', '--port', '3000']);
    });
  });

  describe('setupProcessLogCapture', () => {
    it('should capture stdout logs', () => {
      const mockProcess = {
        stdout: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from('Server started\n'));
            }
          }),
        },
        stderr: {
          on: vi.fn(),
        },
      } as unknown as childProcess.ChildProcess;

      setupProcessLogCapture(mockProcess);

      expect(mockProcess.stdout?.on).toHaveBeenCalledWith(
        'data',
        expect.any(Function)
      );
    });

    it('should capture stderr logs', () => {
      const mockProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from('Error occurred\n'));
            }
          }),
        },
      } as unknown as childProcess.ChildProcess;

      setupProcessLogCapture(mockProcess);

      expect(mockProcess.stderr?.on).toHaveBeenCalledWith(
        'data',
        expect.any(Function)
      );
    });

    it('should format stdout messages with [Server] prefix', () => {
      const mockProcess = {
        stdout: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from('Server started'));
            }
          }),
        },
        stderr: {
          on: vi.fn(),
        },
      } as unknown as childProcess.ChildProcess;

      setupProcessLogCapture(mockProcess);

      expect(log.plain).toHaveBeenCalledWith('[Server] Server started');
    });

    it('should format stderr error messages with [Server Error] prefix', () => {
      const mockProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from('ERROR: Connection failed'));
            }
          }),
        },
      } as unknown as childProcess.ChildProcess;

      setupProcessLogCapture(mockProcess);

      expect(log.error).toHaveBeenCalledWith(
        '[Server Error] ERROR: Connection failed'
      );
    });

    it('should format stderr non-error messages with [Server] prefix', () => {
      const mockProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from('INFO: Server running'));
            }
          }),
        },
      } as unknown as childProcess.ChildProcess;

      setupProcessLogCapture(mockProcess);

      expect(log.plain).toHaveBeenCalledWith('[Server] INFO: Server running');
    });

    it('should handle empty messages', () => {
      const mockProcess = {
        stdout: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from('   \n'));
            }
          }),
        },
        stderr: {
          on: vi.fn(),
        },
      } as unknown as childProcess.ChildProcess;

      setupProcessLogCapture(mockProcess);

      // Should not log empty messages
      expect(log.plain).not.toHaveBeenCalled();
    });

    it('should handle missing stdout/stderr', () => {
      const mockProcess = {
        stdout: null,
        stderr: null,
      } as unknown as childProcess.ChildProcess;

      // Should not throw
      expect(() => setupProcessLogCapture(mockProcess)).not.toThrow();
    });
  });

  describe('spawnProcess', () => {
    it('should spawn a process with correct arguments', () => {
      const mockSpawn = vi.mocked(childProcess.spawn);
      const mockProcess = {
        on: vi.fn(),
      } as unknown as childProcess.ChildProcess;
      mockSpawn.mockReturnValue(mockProcess);

      const result = spawnProcess('python', ['server.py']);

      expect(mockSpawn).toHaveBeenCalledWith('python', ['server.py'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,
        cwd: process.cwd(),
        shell: false,
      });
      expect(result).toBe(mockProcess);
    });

    it('should use custom cwd when provided', () => {
      const mockSpawn = vi.mocked(childProcess.spawn);
      const mockProcess = {
        on: vi.fn(),
      } as unknown as childProcess.ChildProcess;
      mockSpawn.mockReturnValue(mockProcess);

      spawnProcess('python', ['server.py'], { cwd: '/tmp' });

      expect(mockSpawn).toHaveBeenCalledWith(
        'python',
        ['server.py'],
        expect.objectContaining({
          cwd: '/tmp',
        })
      );
    });

    it('should use custom env when provided', () => {
      const mockSpawn = vi.mocked(childProcess.spawn);
      const mockProcess = {
        on: vi.fn(),
      } as unknown as childProcess.ChildProcess;
      mockSpawn.mockReturnValue(mockProcess);

      const customEnv = { NODE_ENV: 'test' };
      spawnProcess('python', ['server.py'], { env: customEnv });

      expect(mockSpawn).toHaveBeenCalledWith(
        'python',
        ['server.py'],
        expect.objectContaining({
          env: customEnv,
        })
      );
    });

    it('should use process.env when env not provided', () => {
      const mockSpawn = vi.mocked(childProcess.spawn);
      const mockProcess = {
        on: vi.fn(),
      } as unknown as childProcess.ChildProcess;
      mockSpawn.mockReturnValue(mockProcess);

      spawnProcess('python', ['server.py']);

      expect(mockSpawn).toHaveBeenCalledWith(
        'python',
        ['server.py'],
        expect.objectContaining({
          env: process.env,
        })
      );
    });

    it('should always set shell to false', () => {
      const mockSpawn = vi.mocked(childProcess.spawn);
      const mockProcess = {
        on: vi.fn(),
      } as unknown as childProcess.ChildProcess;
      mockSpawn.mockReturnValue(mockProcess);

      spawnProcess('python', ['server.py']);

      expect(mockSpawn).toHaveBeenCalledWith(
        'python',
        ['server.py'],
        expect.objectContaining({
          shell: false,
        })
      );
    });
  });
});
