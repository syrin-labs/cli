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
   @typescript-eslint/no-unsafe-argument,
   @typescript-eslint/no-implied-eval
*/
import * as fs from 'fs';
import * as path from 'path';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  // For large JSON data - store efficiently
  largeData?: {
    type: 'json';
    rawData: string; // Stored as string to save memory
    size: number; // Size in bytes
    summary?: string; // Summary/metadata
    expanded?: boolean; // Whether user has expanded it
  };
}

export interface ChatUIOptions {
  /** Agent name for the prompt */
  agentName?: string;
  /** LLM provider name (e.g., "OpenAI", "Claude", "Ollama") */
  llmProviderName?: string;
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
    (
      role: 'user' | 'assistant' | 'system',
      content: string,
      largeData?: ChatMessage['largeData']
    ) => void
  >;
  private updateLastAssistantMessageRef: React.MutableRefObject<
    (content: string) => void
  >;
  private getMessagesRef: React.MutableRefObject<() => ChatMessage[]>;
  private clearMessagesRef: React.MutableRefObject<() => void>;
  private getLastLargeDataMessageRef: React.MutableRefObject<
    () => ChatMessage | null
  >;

  constructor(options: ChatUIOptions) {
    this.options = options;
    // Initialize refs as mutable ref objects (will be populated when component mounts)
    this.addMessageRef = { current: () => {} } as React.MutableRefObject<
      (
        role: 'user' | 'assistant' | 'system',
        content: string,
        largeData?: ChatMessage['largeData']
      ) => void
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
    this.getLastLargeDataMessageRef = {
      current: () => null,
    } as React.MutableRefObject<() => ChatMessage | null>;
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

    const { useState, useEffect, useCallback, useRef, memo } = React;

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

      // Viewport limiting: only show last N messages for performance
      const maxVisibleMessages = 50; // Show last 50 messages by default
      const [showAllMessages, setShowAllMessages] = (
        useState as (initial: boolean) => [boolean, (value: boolean) => void]
      )(false);
      // Note: showAllMessages is used in command handlers (setShowAllMessages)
      const inputHistoryRef = (
        useRef as (initial: string[]) => { current: string[] }
      )([]);
      const historyIndexRef = (
        useRef as (initial: number) => { current: number }
      )(-1);
      const currentInputRef = (
        useRef as (initial: string) => { current: string }
      )('');

      // Cache for parsed markdown to avoid re-parsing on every render
      const markdownCacheRef = (
        useRef as (initial: Map<string, React.ReactElement[]>) => {
          current: Map<string, React.ReactElement[]>;
        }
      )(new Map<string, React.ReactElement[]>());

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

      // Expose methods via refs - use useCallback for stable references
      const addMessage = useCallback(
        (
          role: 'user' | 'assistant' | 'system',
          content: string,
          largeData?: ChatMessage['largeData']
        ): void => {
          setMessages((prev: ChatMessage[]) => [
            ...prev,
            { role, content, timestamp: new Date(), largeData },
          ]);
        },
        []
      );

      const updateLastAssistantMessage = useCallback(
        (content: string): void => {
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
        },
        []
      );

      const getMessages = useCallback((): ChatMessage[] => {
        return messages;
      }, [messages]);

      const getLastLargeDataMessage = useCallback((): ChatMessage | null => {
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          if (msg && msg.largeData) {
            return msg;
          }
        }
        return null;
      }, [messages]);

      const clearMessages = useCallback((): void => {
        setMessages([]);
      }, []);

      // Expose getLastLargeDataMessage via ref
      const getLastLargeDataMessageRef = (
        useRef as (initial: () => ChatMessage | null) => {
          current: () => ChatMessage | null;
        }
      )(() => null);

      // Update refs only when callbacks change (which is stable due to useCallback)
      useEffect(() => {
        addMessageRef.current = addMessage;
        updateLastAssistantMessageRef.current = updateLastAssistantMessage;
        getMessagesRef.current = getMessages;
        clearMessagesRef.current = clearMessages;
        getLastLargeDataMessageRef.current = getLastLargeDataMessage;
      }, [
        addMessage,
        updateLastAssistantMessage,
        getMessages,
        clearMessages,
        getLastLargeDataMessage,
      ]);

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
                    '  /help         - Show this help message\n' +
                    '  /clear        - Clear the chat history\n' +
                    '  /tools        - List available MCP tools\n' +
                    '  /history      - Show command history\n' +
                    '  /show-all     - Show all messages (default: last 50)\n' +
                    '  /show-recent  - Show only recent messages\n' +
                    '  /save-json [tool-name-or-index] - Save tool result JSON to file\n' +
                    '                (no arg = last result, number = by index, name = by name)\n' +
                    '  /exit, /quit  - Exit the chat',
                  timestamp: new Date(),
                },
              ]);
              return true;
            case '/show-all':
              setShowAllMessages(true);
              setMessages((prev: ChatMessage[]) => [
                ...prev,
                {
                  role: 'system',
                  content: `Showing all ${messages.length} messages.`,
                  timestamp: new Date(),
                },
              ]);
              return true;
            case '/show-recent':
              setShowAllMessages(false);
              setMessages((prev: ChatMessage[]) => [
                ...prev,
                {
                  role: 'system',
                  content: `Showing last ${Math.min(maxVisibleMessages, messages.length)} messages.`,
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

      // Parse inline markdown (bold, italic, code)
      const parseInlineMarkdown = useCallback(
        (
          text: string,
          baseKey: number,
          defaultColor?: string
        ): React.ReactElement[] => {
          const elements: React.ReactElement[] = [];
          const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
          let keyIndex = 0;

          for (const part of parts) {
            if (!part) continue;

            // Bold **text**
            if (part.startsWith('**') && part.endsWith('**')) {
              const content = part.slice(2, -2);
              elements.push(
                React.createElement(
                  Text,
                  {
                    key: baseKey * 100 + keyIndex++,
                    bold: true,
                    ...(defaultColor ? { color: defaultColor } : {}),
                  },
                  content as React.ReactNode
                )
              );
            }
            // Italic *text*
            else if (
              part.startsWith('*') &&
              part.endsWith('*') &&
              !part.startsWith('**')
            ) {
              const content = part.slice(1, -1);
              elements.push(
                React.createElement(
                  Text,
                  {
                    key: baseKey * 100 + keyIndex++,
                    dimColor: true,
                    ...(defaultColor ? { color: defaultColor } : {}),
                  },
                  content as React.ReactNode
                )
              );
            }
            // Code `text`
            else if (part.startsWith('`') && part.endsWith('`')) {
              const content = part.slice(1, -1);
              elements.push(
                React.createElement(
                  Text,
                  {
                    key: baseKey * 100 + keyIndex++,
                    color: defaultColor || 'cyan',
                  },
                  content as React.ReactNode
                )
              );
            }
            // Regular text
            else {
              elements.push(
                React.createElement(
                  Text,
                  {
                    key: baseKey * 100 + keyIndex++,
                    ...(defaultColor
                      ? {
                          color: defaultColor,
                          ...(defaultColor === 'yellow'
                            ? {}
                            : { dimColor: true }),
                        }
                      : {}),
                  },
                  part as React.ReactNode
                )
              );
            }
          }

          return elements;
        },
        []
      );

      // Parse table markdown
      const parseTable = useCallback(
        (
          rows: string[],
          baseKey: number,
          defaultColor?: string
        ): React.ReactElement | null => {
          if (rows.length === 0) return null;

          const parsedRows = rows
            .map(row => {
              const cells = row
                .split('|')
                .map(cell => cell.trim())
                .filter(cell => cell.length > 0);
              return cells;
            })
            .filter(row => row.length > 0);

          if (parsedRows.length === 0) return null;

          // Skip separator row (second row if it's all dashes)
          const dataRows = parsedRows.filter(
            (row, idx) => idx !== 1 || !row.every(cell => /^-+$/.test(cell))
          );

          if (dataRows.length === 0) return null;

          const headerRow = dataRows[0] || [];
          const bodyRows = dataRows.slice(1);

          return React.createElement(
            Box,
            { key: baseKey, flexDirection: 'column', marginY: 1 },
            // Header row
            React.createElement(
              Box,
              { key: 'header', flexDirection: 'row', marginBottom: 0.5 },
              ...headerRow.map(
                (cell, idx) =>
                  React.createElement(
                    Box,
                    {
                      key: idx,
                      paddingX: 1,
                      minWidth: Math.floor(80 / headerRow.length),
                    },
                    ...parseInlineMarkdown(
                      cell,
                      baseKey * 1000 + idx,
                      defaultColor
                    )
                  ) as React.ReactElement
              )
            ),
            // Separator
            React.createElement(
              Box,
              { key: 'separator', marginY: 0.5 },
              React.createElement(Text, { dimColor: true }, '─'.repeat(60))
            ),
            // Body rows
            ...bodyRows.map(
              (row, rowIdx) =>
                React.createElement(
                  Box,
                  { key: rowIdx, flexDirection: 'row', marginBottom: 0.25 },
                  ...row.map(
                    (cell, cellIdx) =>
                      React.createElement(
                        Box,
                        {
                          key: cellIdx,
                          paddingX: 1,
                          minWidth: Math.floor(80 / headerRow.length),
                        },
                        ...parseInlineMarkdown(
                          cell,
                          baseKey * 10000 + rowIdx * 100 + cellIdx,
                          defaultColor
                        )
                      ) as React.ReactElement
                  )
                ) as React.ReactElement
            )
          );
        },
        [parseInlineMarkdown]
      );

      // Markdown parser for formatting assistant/system messages
      // Memoized version that caches parsed results
      const parseMarkdown = useCallback(
        (text: string, defaultColor?: string): React.ReactElement[] => {
          // Create cache key
          const cacheKey = `${text}-${defaultColor || ''}`;

          // Check cache first
          const cached = markdownCacheRef.current.get(cacheKey);
          if (cached) {
            return cached;
          }

          const elements: React.ReactElement[] = [];
          let elementKey = 0;

          // Split by lines first to handle blocks
          const lines = text.split('\n');

          let i = 0;
          while (i < lines.length) {
            const line = lines[i] || '';

            // Table detection
            if (line.trim().startsWith('|') && line.includes('|')) {
              const tableRows: string[] = [line];
              i++;
              // Collect all table rows
              while (i < lines.length) {
                const nextLine = lines[i] || '';
                if (nextLine.trim().startsWith('|') && nextLine.includes('|')) {
                  tableRows.push(nextLine);
                  i++;
                } else {
                  break;
                }
              }
              // Parse and render table
              const tableElement = parseTable(
                tableRows,
                elementKey++,
                defaultColor
              );
              if (tableElement) {
                elements.push(tableElement as React.ReactElement);
              }
              continue;
            }

            // Numbered list (1. item or 1) item)
            if (/^\s*\d+[.)]\s+/.test(line)) {
              const listItems: string[] = [];
              while (i < lines.length) {
                const listLine = lines[i] || '';
                if (/^\s*\d+[.)]\s+/.test(listLine)) {
                  listItems.push(listLine.replace(/^\s*\d+[.)]\s+/, ''));
                  i++;
                } else if (listLine.trim() === '') {
                  i++;
                  if (
                    i < lines.length &&
                    /^\s*\d+[.)]\s+/.test(lines[i] || '')
                  ) {
                    continue;
                  }
                  break;
                } else {
                  break;
                }
              }
              elements.push(
                React.createElement(
                  Box,
                  { key: elementKey++, flexDirection: 'column', marginY: 0.5 },
                  ...listItems.map(
                    (item, idx) =>
                      React.createElement(
                        Box,
                        { key: idx, marginLeft: 2, marginBottom: 0.25 },
                        React.createElement(
                          Text,
                          {
                            ...(defaultColor
                              ? {
                                  color: defaultColor,
                                  ...(defaultColor === 'yellow'
                                    ? {}
                                    : { dimColor: true }),
                                }
                              : {}),
                          },
                          `${idx + 1}. `
                        ),
                        ...parseInlineMarkdown(
                          item,
                          elementKey * 1000 + idx,
                          defaultColor
                        )
                      ) as React.ReactElement
                  )
                )
              );
              continue;
            }

            // Bulleted list (- item or * item)
            if (/^\s*[-*]\s+/.test(line)) {
              const listItems: string[] = [];
              while (i < lines.length) {
                const listLine = lines[i] || '';
                if (/^\s*[-*]\s+/.test(listLine)) {
                  listItems.push(listLine.replace(/^\s*[-*]\s+/, ''));
                  i++;
                } else if (listLine.trim() === '') {
                  i++;
                  if (i < lines.length && /^\s*[-*]\s+/.test(lines[i] || '')) {
                    continue;
                  }
                  break;
                } else {
                  break;
                }
              }
              elements.push(
                React.createElement(
                  Box,
                  { key: elementKey++, flexDirection: 'column', marginY: 0.5 },
                  ...listItems.map(
                    (item, idx) =>
                      React.createElement(
                        Box,
                        { key: idx, marginLeft: 2, marginBottom: 0.25 },
                        React.createElement(
                          Text,
                          {
                            ...(defaultColor
                              ? {
                                  color: defaultColor,
                                  ...(defaultColor === 'yellow'
                                    ? {}
                                    : { dimColor: true }),
                                }
                              : {}),
                          },
                          '• '
                        ),
                        ...parseInlineMarkdown(
                          item,
                          elementKey * 1000 + idx,
                          defaultColor
                        )
                      ) as React.ReactElement
                  )
                )
              );
              continue;
            }

            // Regular paragraph
            if (line.trim()) {
              const inlineElements = parseInlineMarkdown(
                line,
                elementKey++,
                defaultColor
              );
              elements.push(
                React.createElement(
                  Box,
                  {
                    key: elementKey - 1,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                  },
                  ...(inlineElements as React.ReactElement[])
                )
              );
            } else {
              // Empty line
              elements.push(
                React.createElement(Box, {
                  key: elementKey++,
                  height: 1,
                }) as React.ReactElement
              );
            }
            i++;
          }

          // Cache the result
          markdownCacheRef.current.set(cacheKey, elements);

          // Limit cache size to prevent memory issues (keep last 100 entries)
          if (markdownCacheRef.current.size > 100) {
            const firstKey = markdownCacheRef.current.keys().next().value;
            if (firstKey) {
              markdownCacheRef.current.delete(firstKey);
            }
          }

          return elements;
        },
        [parseInlineMarkdown, parseTable]
      );

      // Wrap text (for user messages only)
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

      // Memoized message component - only re-renders when message content changes
      // Note: We create this as a function component that memo will wrap
      const MessageComponentInner = (props: {
        message: ChatMessage;
        index: number;
        options: ChatUIOptions;
        parseMarkdown: (
          text: string,
          defaultColor?: string
        ) => React.ReactElement[];
        wrapText: (text: string, width: number) => string[];
      }): React.ReactElement => {
        const { message, index, options, parseMarkdown, wrapText } = props;
        const timestamp = options.showTimestamps
          ? `[${message.timestamp?.toLocaleTimeString() || ''}] `
          : '';

        if (message.role === 'user') {
          // User messages: simple text wrapping, no markdown
          const wrappedLines = wrapText(message.content, 60);
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
                React.createElement(Text, { color: 'white' }, timestamp + line)
              )
            )
          );
        } else {
          // Assistant and system messages: parse markdown (cached via parseMarkdown)
          const markdownElements = parseMarkdown(
            message.content,
            message.role === 'system' ? 'yellow' : undefined
          );

          if (message.role === 'assistant') {
            // LLM-generated messages: styled with subtle dark background for easy reading
            return React.createElement(
              Box,
              {
                key: index,
                flexDirection: 'column',
                alignItems: 'flex-start',
                marginY: 1,
              },
              React.createElement(
                Box,
                {
                  flexDirection: 'row',
                  marginBottom: 0.25,
                  marginLeft: 1,
                },
                React.createElement(
                  Text,
                  { color: 'cyan', bold: true },
                  `🤖 ${options.llmProviderName || 'AI'}: `
                )
              ),
              React.createElement(
                Box,
                {
                  flexDirection: 'column',
                  backgroundColor: 'black',
                  paddingX: 1,
                  paddingY: 0.5,
                  marginLeft: 1,
                },
                ...markdownElements
              )
            );
          } else {
            // System messages: styled with bright yellow color to make them pop (no prefix)
            return React.createElement(
              Box,
              {
                key: index,
                flexDirection: 'column',
                marginY: 0.5,
              },
              React.createElement(
                Box,
                {
                  flexDirection: 'column',
                  paddingX: 1,
                  paddingY: 0.5,
                },
                ...markdownElements
              )
            );
          }
        }
      };

      // Wrap with memo for performance
      const MessageComponent = memo(
        MessageComponentInner,
        (
          prevProps: {
            message: ChatMessage;
            index: number;
            options: ChatUIOptions;
            parseMarkdown: (
              text: string,
              defaultColor?: string
            ) => React.ReactElement[];
            wrapText: (text: string, width: number) => string[];
          },
          nextProps: {
            message: ChatMessage;
            index: number;
            options: ChatUIOptions;
            parseMarkdown: (
              text: string,
              defaultColor?: string
            ) => React.ReactElement[];
            wrapText: (text: string, width: number) => string[];
          }
        ) => {
          // Custom comparison: only re-render if message content or role changed
          return (
            prevProps.message.content === nextProps.message.content &&
            prevProps.message.role === nextProps.message.role &&
            prevProps.index === nextProps.index
          );
        }
      );

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
        // Messages area - using memoized components with viewport limiting
        React.createElement(
          Box,
          { flexDirection: 'column', flexGrow: 1, paddingX: 1 },
          ((): Array<React.ReactElement | null> => {
            // Determine which messages to show
            const visibleMessages = showAllMessages
              ? messages
              : messages.slice(-maxVisibleMessages);
            const hiddenCount = messages.length - visibleMessages.length;
            const startIndex = showAllMessages
              ? 0
              : Math.max(0, messages.length - maxVisibleMessages);

            return [
              // Show message if there are hidden messages
              hiddenCount > 0
                ? React.createElement(
                    Box,
                    {
                      key: 'viewport-info',
                      marginY: 0.5,
                      paddingX: 1,
                    },
                    React.createElement(
                      Text,
                      { color: 'yellow', dimColor: true },
                      `... ${hiddenCount} earlier message${hiddenCount > 1 ? 's' : ''} hidden. Type /show-all to view all messages.`
                    )
                  )
                : null,
              // Render visible messages
              ...visibleMessages.map(
                (message: ChatMessage, localIndex: number) => {
                  const globalIndex = startIndex + localIndex;
                  return React.createElement(MessageComponent, {
                    key: `${message.role}-${globalIndex}-${message.content.substring(0, 50)}`,
                    message,
                    index: globalIndex,
                    options,
                    parseMarkdown,
                    wrapText,
                  });
                }
              ),
            ];
          })()
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
   * Add a message with large data reference.
   */
  addMessageWithData(
    role: 'user' | 'assistant' | 'system',
    content: string,
    largeData: ChatMessage['largeData']
  ): void {
    this.addMessageRef.current(role, content, largeData);
  }

  /**
   * Get the last message with large data.
   */
  getLastLargeDataMessage(): ChatMessage | null {
    return this.getLastLargeDataMessageRef.current();
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
