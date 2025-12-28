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
  /** Whether to show timestamps in messages */
  showTimestamps?: boolean;
  /** Initial messages to display */
  initialMessages?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  /** Callback when user submits a message */
  onMessage?: (message: string) => Promise<void>;
  /** Callback when user exits */
  onExit?: () => Promise<void>;
  /** History file path for persisting command history */
  historyFile?: string;
  /** Maximum number of history entries to keep */
  maxHistorySize?: number;
}

export class ChatUI {
  private options: ChatUIOptions;
  private instance: {
    unmount: () => void;
    waitUntilExit: () => Promise<void>;
  } | null = null;
  private addMessageRef: React.MutableRefObject<
    (role: 'user' | 'assistant' | 'system', content: string) => void
  >;
  private updateLastAssistantMessageRef: React.MutableRefObject<
    (content: string) => void
  >;
  private getMessagesRef: React.MutableRefObject<() => ChatMessage[]>;
  private clearMessagesRef: React.MutableRefObject<() => void>;

  constructor(options: ChatUIOptions) {
    this.options = options;
    // Initialize refs as mutable ref objects (will be populated when component mounts)
    this.addMessageRef = { current: () => {} } as React.MutableRefObject<
      (role: 'user' | 'assistant' | 'system', content: string) => void
    >;
    this.updateLastAssistantMessageRef = {
      current: () => {},
    } as React.MutableRefObject<(content: string) => void>;
    this.getMessagesRef = {
      current: () => [],
    } as React.MutableRefObject<() => ChatMessage[]>;
    this.clearMessagesRef = {
      current: () => {},
    } as React.MutableRefObject<() => void>;
  }

  async start(): Promise<void> {
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
      }, []); // Only run on mount

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
      }, [options.historyFile]); // Only depend on historyFile, not the ref

      // Initialize messages

      useEffect(() => {
        if (options.initialMessages && options.initialMessages.length > 0) {
          const initMsgs: ChatMessage[] = options.initialMessages.map(msg => ({
            ...msg,
            timestamp: new Date(),
          }));
          setMessages(initMsgs);
        }
      }, []); // Only run on mount

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
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (
              lastIndex >= 0 &&
              newMessages[lastIndex]?.role === 'assistant'
            ) {
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                content,
                timestamp: newMessages[lastIndex]?.timestamp || new Date(),
              };
            } else {
              newMessages.push({
                role: 'assistant',
                content,
                timestamp: new Date(),
              });
            }
            return newMessages;
          });
        };

        getMessagesRef.current = (): ChatMessage[] => {
          return messages;
        };

        clearMessagesRef.current = (): void => {
          setMessages([]);
        };
      });

      // Handle special commands
      // Returns true if the command was handled, false if it should be passed to onMessage
      const handleSpecialCommand = useCallback(
        async (command: string): Promise<boolean> => {
          const parts = command.split(/\s+/);
          const cmd = parts[0]?.toLowerCase();

          switch (cmd) {
            case '/exit':
            case '/quit':
              try {
                await options.onExit?.();
              } catch {
                // Ignore errors during exit
              }
              exit();
              return true;
            case '/clear':
              setMessages([]);
              return true;
            case '/help':
              setMessages((prev: ChatMessage[]) => [
                ...prev,
                {
                  role: 'system',
                  content:
                    'Available commands:\n' +
                    '  /help       - Show this help message\n' +
                    '  /clear      - Clear the chat history\n' +
                    '  /tools      - List available MCP tools\n' +
                    '  /history    - Show command history\n' +
                    '  /exit, /quit - Exit the chat',
                  timestamp: new Date(),
                },
              ]);
              return true;
            default:
              // Not a UI-level special command, pass to onMessage callback
              return false;
          }
        },
        [options, exit]
      );

      // Handle input submission

      const handleSubmit = useCallback(
        (value: string): void => {
          void (async (): Promise<void> => {
            const trimmedValue = value.trim();
            if (!trimmedValue) return;

            // Clear input immediately
            setInput('');

            // Save current input before checking for special commands
            currentInputRef.current = '';

            // Add user message to chat
            setMessages((prev: ChatMessage[]) => [
              ...prev,
              { role: 'user', content: trimmedValue, timestamp: new Date() },
            ]);

            // Handle UI-level special commands (only if handled by UI)
            if (trimmedValue.startsWith('/')) {
              const wasHandled = await handleSpecialCommand(trimmedValue);
              if (wasHandled) {
                return; // Command was handled by UI, don't pass to onMessage
              }
              // Command was not handled by UI, continue to pass to onMessage callback
            }

            // Add to history (only non-empty, non-special commands)
            if (trimmedValue && !trimmedValue.startsWith('/')) {
              const history = inputHistoryRef.current;
              // Remove duplicate if exists
              const filtered = history.filter(
                (h: string) => h !== trimmedValue
              );
              // Add to end
              filtered.push(trimmedValue);
              // Keep only last N entries
              inputHistoryRef.current = filtered.slice(-maxHistorySize);
              // Save to file
              saveHistoryToFile();
            }

            // Reset history navigation
            historyIndexRef.current = -1;

            // Process the message
            setIsProcessing(true);
            try {
              await options.onMessage?.(trimmedValue);
            } catch (error) {
              setMessages((prev: ChatMessage[]) => [
                ...prev,
                {
                  role: 'system',
                  content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                  timestamp: new Date(),
                },
              ]);
            } finally {
              setIsProcessing(false);
            }
          })();
        },
        [options, handleSpecialCommand, maxHistorySize, saveHistoryToFile]
      );

      // Handle Ctrl+C (always active)

      useInput(
        (_char: string, key: { ctrl?: boolean; escape?: boolean }) => {
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
        { isActive: true }
      );

      // Handle arrow keys for history navigation (only when not processing)

      useInput(
        (_char: string, key: { upArrow?: boolean; downArrow?: boolean }) => {
          if (key.upArrow || key.downArrow) {
            if (inputHistoryRef.current.length === 0 || isProcessing) {
              return;
            }

            if (key.upArrow) {
              // Save current input if we're starting navigation
              if (historyIndexRef.current === -1) {
                currentInputRef.current = input;
              }
              // Move up in history
              historyIndexRef.current = Math.min(
                historyIndexRef.current + 1,
                inputHistoryRef.current.length - 1
              );
            } else {
              // Move down in history
              historyIndexRef.current = Math.max(
                historyIndexRef.current - 1,
                -1
              );
            }

            // Set input from history or restore current
            if (historyIndexRef.current >= 0) {
              const historyItem =
                inputHistoryRef.current[
                  inputHistoryRef.current.length - 1 - historyIndexRef.current
                ];
              if (historyItem !== undefined) {
                setInput(historyItem);
              }
            } else {
              setInput(currentInputRef.current);
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
   * Add a message to the chat.
   */
  addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
    this.addMessageRef.current(role, content);
  }

  /**
   * Update the last assistant message (for streaming).
   */
  updateLastAssistantMessage(content: string): void {
    this.updateLastAssistantMessageRef.current(content);
  }

  /**
   * Get all messages.
   */
  getMessages(): ChatMessage[] {
    return this.getMessagesRef.current();
  }

  /**
   * Clear all messages.
   */
  clearMessages(): void {
    this.clearMessagesRef.current();
  }

  /**
   * Stop the chat UI (same as exit).
   */
  stop(): void {
    if (this.instance) {
      this.instance.unmount();
      this.instance = null;
    }
  }

  /**
   * Exit the chat UI.
   */
  exit(): void {
    this.stop();
  }
}
