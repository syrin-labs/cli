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

export interface WelcomeBannerInfo {
  versionDisplay: string; // Formatted version string (e.g., "v1.1.0 (latest)" or "v1.1.0 (update available: v1.2.0, run: syrin update)")
  llmProvider: string;
  toolCount: number;
  transport: string;
  mcpUrl?: string;
  command?: string;
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
  /** Welcome banner information (persistent, not cleared by /clear) */
  welcomeBanner?: WelcomeBannerInfo;
  /** Callback when user submits a message */
  onMessage?: (message: string) => Promise<void>;
  /** Callback when user exits */
  onExit?: () => Promise<void>;
  /** Callback to get session state for goodbye messages */
  getSessionState?: () => {
    totalToolCalls: number;
    toolCalls: Array<{ name: string; timestamp: Date }>;
    startTime: Date;
  };
  /** LLM provider for generating goodbye messages */
  llmProvider?: {
    chat: (request: {
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      maxTokens?: number;
    }) => Promise<{ content: string }>;
  } | null;
  /** History file path for persisting command history */
  historyFile?: string;
  /** Maximum number of history entries to keep */
  maxHistorySize?: number;
}
