/**
 * Type definitions for Chat UI components.
 */

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
