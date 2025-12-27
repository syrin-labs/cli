/**
 * Chat UI for Dev Mode using Ink (React for terminal UIs).
 * Provides a ChatGPT-like terminal interface with message history and input panel.
 *
 * Note: React and Ink are dynamically imported to avoid ESM/CommonJS issues.
 * The component is created inline using React.createElement to avoid separate module imports.
 *
 * ESLint warnings for dynamic imports and React.createElement are disabled as they are
 * necessary for this approach to work with ESM modules in a CommonJS context.
 */

/* eslint-disable
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/no-unsafe-return,
   @typescript-eslint/no-implied-eval
*/
import * as fs from 'fs';
import * as path from 'path';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatUIOptions {
  /** Agent name for the prompt */
  agentName?: string;
  /** Whether to show timestamps */
  showTimestamps?: boolean;
  /** Callback when user sends a message */
  onMessage?: (message: string) => void | Promise<void>;
  /** Callback when user wants to exit */
  onExit?: () => void | Promise<void>;
  /** Initial info messages to display in chat area */
  initialMessages?: Array<{ role: 'system'; content: string }>;
  /** History file path for persisting command history */
  historyFile?: string;
  /** Maximum history size */
  maxHistorySize?: number;
}

/**
 * Chat UI implementation using Ink.
 */
export class ChatUI {
  private instance: { unmount: () => void } | null = null;
  private addMessageRef: {
    current:
      | ((role: 'user' | 'assistant' | 'system', content: string) => void)
      | null;
  } = { current: null };
  private updateLastAssistantMessageRef: {
    current: ((content: string) => void) | null;
  } = { current: null };
  private getMessagesRef: {
    current: (() => ChatMessage[]) | null;
  } = { current: null };
  private clearMessagesRef: {
    current: (() => void) | null;
  } = { current: null };
  private readonly options: ChatUIOptions;

  constructor(options: ChatUIOptions = {}) {
    this.options = options;
  }

  /**
   * Start the chat UI.
   * Dynamically imports React and Ink to avoid ESM/CommonJS conflicts.
   */
  async start(): Promise<void> {
    if (this.instance) {
      return; // Already started
    }

    // Dynamically import React and Ink (ESM modules)
    // Use Function constructor to preserve import() syntax and avoid TypeScript transpilation to require()

    const importDynamic = new Function('specifier', 'return import(specifier)');

    const [ReactModule, inkModule, textInputModule] = await Promise.all([
      importDynamic('react'),

      importDynamic('ink'),

      importDynamic('ink-text-input'),
    ]);

    const React = ReactModule.default || ReactModule;

    const { useState, useEffect, useCallback, useRef } = React;

    const { Box, Text, useApp, useInput, render } = inkModule;

    const TextInput = textInputModule.default;

    // Capture options and refs for use inside the component
    const options = this.options;
    const addMessageRef = this.addMessageRef;
    const updateLastAssistantMessageRef = this.updateLastAssistantMessageRef;
    const getMessagesRef = this.getMessagesRef;
    const clearMessagesRef = this.clearMessagesRef;

    // Create the component inline to avoid importing a separate module file
    // This avoids top-level require() calls for ESM modules
    const ChatUIComponent = (): React.ReactElement => {
      const { exit } = useApp();
      const [messages, setMessages] = (
        useState as (
          initial: ChatMessage[]
        ) => [
          ChatMessage[],
          (
            value: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
          ) => void,
        ]
      )([]);
      const [input, setInput] = (
        useState as (initial: string) => [string, (value: string) => void]
      )('');
      const [isProcessing, setIsProcessing] = (
        useState as (initial: boolean) => [boolean, (value: boolean) => void]
      )(false);
      const maxHistorySize = options.maxHistorySize || 1000;
      const inputHistoryRef = (
        useRef as (initial: string[]) => { current: string[] }
      )([]);
      const historyIndexRef = (
        useRef as (initial: number) => { current: number }
      )(-1);
      const currentInputRef = (
        useRef as (initial: string) => { current: string }
      )('');

      // Load history from file on mount
      useEffect(() => {
        if (options.historyFile) {
          try {
            if (fs.existsSync(options.historyFile)) {
              const content = fs.readFileSync(options.historyFile, 'utf-8');
              const loadedHistory = content
                .split('\n')
                .filter((line: string) => line.trim())
                .slice(-maxHistorySize); // Only keep last N entries
              inputHistoryRef.current = loadedHistory;
            }
          } catch {
            // Ignore errors loading history
          }
        }
      }, []);

      // Save history to file helper
      const saveHistoryToFile = useCallback(() => {
        if (options.historyFile && inputHistoryRef.current.length > 0) {
          try {
            const dir = path.dirname(options.historyFile);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(
              options.historyFile,
              inputHistoryRef.current.join('\n') + '\n',
              'utf-8'
            );
          } catch {
            // Ignore errors saving history
          }
        }
      }, [options.historyFile]);

      // Initialize messages
      useEffect(() => {
        if (options.initialMessages && options.initialMessages.length > 0) {
          const initMsgs: ChatMessage[] = options.initialMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(),
          }));
          setMessages(initMsgs);
        }
      }, []);

      // Expose methods via refs
      useEffect(() => {
        addMessageRef.current = (
          role: 'user' | 'assistant' | 'system',
          content: string
        ): void => {
          setMessages((prev: ChatMessage[]) => [
            ...prev,
            { role, content, timestamp: new Date() },
          ]);
        };

        updateLastAssistantMessageRef.current = (content: string): void => {
          setMessages((prev: ChatMessage[]) => {
            if (
              prev.length > 0 &&
              prev[prev.length - 1]?.role === 'assistant'
            ) {
              return [
                ...prev.slice(0, -1),
                { ...prev[prev.length - 1]!, content },
              ];
            }
            return [
              ...prev,
              { role: 'assistant', content, timestamp: new Date() },
            ];
          });
        };

        getMessagesRef.current = (): ChatMessage[] => messages;
        clearMessagesRef.current = (): void => {
          setMessages([]);
        };
      }, [
        messages,
        addMessageRef,
        updateLastAssistantMessageRef,
        getMessagesRef,
        clearMessagesRef,
      ]);

      // Handle special commands
      const handleSpecialCommand = useCallback(
        async (command: string): Promise<void> => {
          const parts = command.split(/\s+/);
          const cmd = parts[0]?.toLowerCase();

          switch (cmd) {
            case '/exit':
            case '/quit':
              await options.onExit?.();
              exit();
              break;
            case '/clear':
              setMessages([]);
              break;
            case '/help':
              setMessages((prev: ChatMessage[]) => [
                ...prev,
                {
                  role: 'system',
                  content: `Available commands:
/exit, /quit - Exit dev mode
/clear       - Clear chat history
/help        - Show this help message
/tools       - List available tools

Navigation:
↑/↓ Arrow keys - Navigate input history
←/→ Arrow keys - Move cursor in input box
Ctrl+C        - Exit`,
                  timestamp: new Date(),
                },
              ]);
              break;
            default:
              setIsProcessing(true);
              try {
                await options.onMessage?.(command);
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                setMessages((prev: ChatMessage[]) => [
                  ...prev,
                  {
                    role: 'system',
                    content: `Error: ${errorMessage}`,
                    timestamp: new Date(),
                  },
                ]);
              } finally {
                setIsProcessing(false);
              }
          }
        },
        []
      );

      // Handle input submission
      const handleSubmit = useCallback(
        (value: string): void => {
          void (async (): Promise<void> => {
            const trimmed = value.trim();
            if (!trimmed || isProcessing) {
              setInput('');
              return;
            }

            // Add to history (avoid duplicates of last command)
            if (
              inputHistoryRef.current.length === 0 ||
              inputHistoryRef.current[inputHistoryRef.current.length - 1] !==
                trimmed
            ) {
              inputHistoryRef.current.push(trimmed);
              if (inputHistoryRef.current.length > maxHistorySize) {
                inputHistoryRef.current.shift();
              }
              // Save history to file after adding new entry
              saveHistoryToFile();
            }
            historyIndexRef.current = -1;
            currentInputRef.current = '';

            // Add user message
            setMessages((prev: ChatMessage[]) => [
              ...prev,
              { role: 'user', content: trimmed, timestamp: new Date() },
            ]);

            setInput('');

            // Handle special commands
            if (trimmed.startsWith('/')) {
              await handleSpecialCommand(trimmed);
              return;
            }

            // Process message
            setIsProcessing(true);
            try {
              await options.onMessage?.(trimmed);
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              setMessages(prev => [
                ...prev,
                {
                  role: 'system',
                  content: `Error: ${errorMessage}`,
                  timestamp: new Date(),
                },
              ]);
            } finally {
              setIsProcessing(false);
            }
          })();
        },
        [isProcessing, handleSpecialCommand, saveHistoryToFile, maxHistorySize]
      );

      // Handle Ctrl+C - always active to catch exit

      useInput(
        (
          _char: string,
          key: {
            ctrl?: boolean;
            escape?: boolean;
          }
        ) => {
          // Handle Ctrl+C to exit - always allow exit even when processing
          // In raw mode, Ctrl+C comes as '\x03' (ETX character)
          if ((key.ctrl && _char === 'c') || _char === '\x03' || key.escape) {
            void (async (): Promise<void> => {
              try {
                await options.onExit?.();
              } catch {
                // Ignore errors during exit
              }
              exit();
            })();
          }
        },
        { isActive: true } // Always active to catch Ctrl+C
      );

      // Handle arrow keys for history navigation - only when not processing

      useInput(
        (
          _char: string,
          key: {
            upArrow?: boolean;
            downArrow?: boolean;
          }
        ) => {
          // Only handle up/down arrows for history navigation
          // TextInput handles all other input including left/right arrows for cursor movement
          if (key.upArrow || key.downArrow) {
            if (inputHistoryRef.current.length === 0 || isProcessing) {
              return;
            }

            if (key.upArrow) {
              // Save current input if we're starting navigation
              if (historyIndexRef.current === -1) {
                currentInputRef.current = input;
              }

              // Navigate up (to older history)
              historyIndexRef.current += 1;

              // Clamp to valid range
              if (historyIndexRef.current >= inputHistoryRef.current.length) {
                historyIndexRef.current = inputHistoryRef.current.length - 1;
              }

              const historyItem =
                inputHistoryRef.current[
                  inputHistoryRef.current.length - 1 - historyIndexRef.current
                ];
              if (historyItem !== undefined) {
                setInput(historyItem);
              }
            } else if (key.downArrow) {
              historyIndexRef.current -= 1;

              if (historyIndexRef.current < 0) {
                historyIndexRef.current = -1;
                setInput(currentInputRef.current);
              } else {
                const historyItem =
                  inputHistoryRef.current[
                    inputHistoryRef.current.length - 1 - historyIndexRef.current
                  ];
                if (historyItem !== undefined) {
                  setInput(historyItem);
                }
              }
            }
          }
        },
        { isActive: !isProcessing }
      );

      // Note: Ctrl+C is now handled in useInput hook above
      // The useInput hook intercepts all input including Ctrl+C, so SIGINT won't fire
      // We handle Ctrl+C directly in the useInput callback

      // Wrap text

      const wrapText = useCallback((text: string, width: number): string[] => {
        const words = text.split(/\s+/);
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          if (currentLine.length + word.length + 1 <= width) {
            currentLine += (currentLine ? ' ' : '') + word;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines.length > 0 ? lines : [''];
      }, []);

      // Render using React.createElement (can't use JSX here without importing React at top level)
      return React.createElement(
        Box,
        { flexDirection: 'column', width: '100%', height: '100%' },
        // Header
        React.createElement(
          Box,
          { backgroundColor: 'blue', width: '100%' },
          React.createElement(
            Text,
            { bold: true, color: 'white' },
            ' Syrin Dev Mode | Enter /exit or /quit to exit '
          )
        ),
        // Messages area
        React.createElement(
          Box,
          { flexDirection: 'column', flexGrow: 1, paddingX: 1 },
          messages.map((message: ChatMessage, index: number) => {
            const timestamp = options.showTimestamps
              ? `[${message.timestamp?.toLocaleTimeString() || ''}] `
              : '';
            const wrappedLines = wrapText(
              message.content,
              message.role === 'system' ? 80 : 60
            );

            if (message.role === 'user') {
              return React.createElement(
                Box,
                {
                  key: index,
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  marginY: 1,
                },
                wrappedLines.map((line: string, lineIndex: number) =>
                  React.createElement(
                    Box,
                    { key: lineIndex, backgroundColor: 'blue', paddingX: 1 },
                    React.createElement(
                      Text,
                      { color: 'white' },
                      timestamp + line
                    )
                  )
                )
              );
            } else if (message.role === 'assistant') {
              return React.createElement(
                Box,
                {
                  key: index,
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  marginY: 1,
                },
                wrappedLines.map((line: string, lineIndex: number) =>
                  React.createElement(
                    Box,
                    { key: lineIndex, backgroundColor: 'grey', paddingX: 1 },
                    React.createElement(
                      Text,
                      { color: 'white' },
                      timestamp + line
                    )
                  )
                )
              );
            } else {
              return React.createElement(
                Box,
                { key: index, flexDirection: 'column', marginY: 1 },
                wrappedLines.map((line: string, lineIndex: number) =>
                  React.createElement(
                    Text,
                    { key: lineIndex, color: 'yellow' },
                    timestamp + line
                  )
                )
              );
            }
          })
        ),
        // Input area
        React.createElement(
          Box,
          { backgroundColor: 'blue', width: '100%' },
          React.createElement(
            Text,
            { color: 'white', bold: true },
            ` ${options.agentName || 'You'} > `
          ),
          isProcessing
            ? React.createElement(Text, { color: 'white' }, 'Processing...')
            : React.createElement(TextInput, {
                value: input,
                onChange: setInput,
                onSubmit: handleSubmit,
                placeholder: 'Type your message...',
              })
        )
      );
    };

    // Render the component with full screen options

    this.instance = render(React.createElement(ChatUIComponent), {
      stdout: process.stdout,
      stderr: process.stderr,
      stdin: process.stdin,
      exitOnCtrlC: false, // We handle this manually
    });
  }

  /**
   * Stop the chat UI.
   */
  stop(): void {
    if (this.instance && typeof this.instance.unmount === 'function') {
      this.instance.unmount();
      this.instance = null;
    }
  }

  /**
   * Add a message to the chat.
   */
  addMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    _options?: { style?: { fg?: string; bg?: string } }
  ): void {
    if (this.addMessageRef.current) {
      this.addMessageRef.current(role, content);
    }
  }

  /**
   * Update the last assistant message (for streaming or updating).
   */
  updateLastAssistantMessage(content: string): void {
    if (this.updateLastAssistantMessageRef.current) {
      this.updateLastAssistantMessageRef.current(content);
    }
  }

  /**
   * Get all messages.
   */
  getMessages(): ChatMessage[] {
    if (this.getMessagesRef.current) {
      return this.getMessagesRef.current();
    }
    return [];
  }

  /**
   * Clear all messages.
   */
  clearMessages(): void {
    if (this.clearMessagesRef.current) {
      this.clearMessagesRef.current();
    }
  }

  /**
   * Exit the chat UI.
   */
  async exit(): Promise<void> {
    if (this.options.onExit) {
      await this.options.onExit();
    }
    this.stop();
    process.exit(0);
  }
}
