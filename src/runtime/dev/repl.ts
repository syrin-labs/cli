/**
 * Interactive REPL (Read-Eval-Print Loop) for Dev Mode.
 * Provides command-line interface with history, autocomplete, and navigation.
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import type { EventEmitter } from '@/events/emitter';

/**
 * REPL options.
 */
export interface REPLOptions {
  /** Prompt prefix (e.g., "User > ") */
  prompt?: string;
  /** Whether to save history to file */
  saveHistory?: boolean;
  /** History file path */
  historyFile?: string;
  /** Maximum history size */
  maxHistorySize?: number;
}

/**
 * REPL special commands.
 */
export enum REPLCommand {
  EXIT = '/exit',
  QUIT = '/quit',
  CLEAR = '/clear',
  HELP = '/help',
  HISTORY = '/history',
  TOOLS = '/tools',
}

/**
 * Interactive REPL implementation.
 */
export class InteractiveREPL {
  private rl: readline.Interface;
  private history: string[] = [];
  private historyIndex: number = -1;
  private currentInput: string = '';
  private readonly maxHistorySize: number;

  constructor(
    private readonly options: REPLOptions = {},
    private readonly eventEmitter?: EventEmitter
  ) {
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.loadHistory();

    // Create readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: options.prompt || 'User > ',
      completer: this.completer.bind(this),
    });

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Start the REPL.
   * @param onInput - Callback for user input
   * @param onClose - Callback for REPL close (can be async)
   */
  start(
    onInput: (input: string) => Promise<void> | void,
    onClose?: () => void | Promise<void>
  ): void {
    this.rl.prompt();

    this.rl.on('line', (line: string) => {
      void (async (): Promise<void> => {
        const trimmed = line.trim();

        // Handle empty input
        if (!trimmed) {
          this.rl.prompt();
          return;
        }

        // Handle special commands
        if (trimmed.startsWith('/')) {
          await this.handleSpecialCommand(trimmed, onInput);
          this.rl.prompt();
          return;
        }

        // Add to history
        this.addToHistory(trimmed);
        this.historyIndex = -1;
        this.currentInput = '';

        // Process input
        try {
          await onInput(trimmed);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(`\nError: ${errorMessage}\n`);
        }

        this.rl.prompt();
      })();
    });

    this.rl.on('close', () => {
      this.saveHistory();
      // Wait for cleanup before exiting
      void (async (): Promise<void> => {
        if (onClose) {
          await onClose();
        }
        console.log('\nGoodbye!');
        process.exit(0);
      })();
    });

    // Note: SIGINT handling is done by the parent (dev.ts)
    // We don't handle it here to allow proper cleanup

    // Load history into readline (for arrow key navigation)
    this.loadHistoryIntoReadline();
  }

  /**
   * Load history into readline for arrow key navigation.
   */
  private loadHistoryIntoReadline(): void {
    // readline automatically handles history with arrow keys
    // We can add our history to it
    if (this.rl && 'history' in this.rl) {
      const rlHistory = (this.rl as { history: string[] }).history;
      rlHistory.push(...this.history);
    }
  }

  /**
   * Stop the REPL.
   */
  stop(): void {
    this.saveHistory();
    this.rl.close();
  }

  /**
   * Set a new prompt.
   */
  setPrompt(prompt: string): void {
    this.rl.setPrompt(prompt);
  }

  /**
   * Write output to the console.
   */
  write(message: string): void {
    process.stdout.write(message);
  }

  /**
   * Write a line to the console.
   */
  writeLine(message: string): void {
    console.log(message);
  }

  /**
   * Clear the current line.
   */
  clearLine(): void {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  }

  /**
   * Get history.
   */
  getHistory(): string[] {
    return [...this.history];
  }

  /**
   * Clear history.
   */
  clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;
    if (this.options.saveHistory && this.options.historyFile) {
      try {
        fs.unlinkSync(this.options.historyFile);
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Setup event handlers for history navigation.
   * Note: readline handles arrow keys automatically, but we can enhance it.
   */
  private setupEventHandlers(): void {
    // The readline interface handles arrow keys automatically
    // We just need to track the current input for restoration
    this.rl.on('line', () => {
      this.currentInput = '';
      this.historyIndex = -1;
    });
  }

  /**
   * Handle special REPL commands.
   */
  private async handleSpecialCommand(
    command: string,
    onInput: (input: string) => Promise<void> | void
  ): Promise<void> {
    const parts = command.split(/\s+/);
    const cmd = parts[0]?.toLowerCase();

    switch (cmd) {
      case REPLCommand.EXIT:
      case REPLCommand.QUIT:
        this.stop();
        break;

      case REPLCommand.CLEAR:
        // Clear console (ANSI escape code)
        process.stdout.write('\x1B[2J\x1B[0f');
        break;

      case REPLCommand.HELP:
        this.showHelp();
        break;

      case REPLCommand.HISTORY:
        this.showHistory();
        break;

      case REPLCommand.TOOLS:
        // This will be handled by the dev session
        await onInput(command);
        break;

      default:
        console.log(
          `Unknown command: ${cmd}. Type /help for available commands.`
        );
    }
  }

  /**
   * Show help message.
   */
  private showHelp(): void {
    console.log('\nAvailable commands:');
    console.log('  /exit, /quit  - Exit dev mode');
    console.log('  /clear        - Clear the console');
    console.log('  /help         - Show this help message');
    console.log('  /history      - Show command history');
    console.log('  /tools        - List available tools');
    console.log('');
    console.log('Navigation:');
    console.log('  ↑/↓ Arrow keys - Navigate command history');
    console.log('  Ctrl+C        - Interrupt (use /exit to quit)');
    console.log('');
  }

  /**
   * Show command history.
   */
  private showHistory(): void {
    if (this.history.length === 0) {
      console.log('No history yet.');
      return;
    }

    console.log('\nCommand History:');
    const recentHistory = this.history.slice(-20); // Show last 20
    recentHistory.forEach((cmd, index) => {
      console.log(`  ${index + 1}. ${cmd}`);
    });
    console.log('');
  }

  /**
   * Add input to history.
   */
  private addToHistory(input: string): void {
    // Don't add empty lines or duplicates of the last command
    if (
      !input ||
      (this.history.length > 0 &&
        this.history[this.history.length - 1] === input)
    ) {
      return;
    }

    this.history.push(input);

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Load history from file.
   */
  private loadHistory(): void {
    if (!this.options.saveHistory || !this.options.historyFile) {
      return;
    }

    try {
      if (fs.existsSync(this.options.historyFile)) {
        const content = fs.readFileSync(this.options.historyFile, 'utf-8');
        this.history = content
          .split('\n')
          .filter(line => line.trim())
          .slice(-this.maxHistorySize); // Only keep last N entries
      }
    } catch {
      // Ignore errors loading history
    }
  }

  /**
   * Save history to file.
   */
  private saveHistory(): void {
    if (!this.options.saveHistory || !this.options.historyFile) {
      return;
    }

    try {
      const dir = path.dirname(this.options.historyFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.options.historyFile,
        this.history.join('\n') + '\n',
        'utf-8'
      );
    } catch {
      // Ignore errors saving history
    }
  }

  /**
   * Completer function for tab completion.
   */
  private completer(line: string): [string[], string] {
    const completions = [
      '/exit',
      '/quit',
      '/clear',
      '/help',
      '/history',
      '/tools',
    ];
    const hits = completions.filter(c => c.startsWith(line));
    return [hits.length ? hits : completions, line];
  }
}
