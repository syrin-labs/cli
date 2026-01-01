/**
 * Goodbye message generator for dev mode.
 * Generates funny, shareable goodbye messages when users exit.
 */

import type { LLMProvider } from '@/runtime/llm/provider';
import type { DevSessionState } from '@/runtime/dev/types';

/**
 * Minimal LLM interface for goodbye message generation.
 */
interface MinimalLLMProvider {
  chat: (request: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }) => Promise<{ content: string }>;
}

/**
 * Pre-written goodbye messages for users who didn't test anything.
 */
const DEFAULT_GOODBYE_MESSAGES = [
  "👋 Thanks for dropping by! Hope you'll come back to test some tools soon!",
  "🚀 See you later! Don't forget to test those MCP tools when you're ready!",
  '✨ Until next time! Your tools are waiting for you!',
  '🎯 Catch you later! Ready to test when you are!',
  '💫 Farewell! Come back when you want to see those tools in action!',
  '🌟 Goodbye! Your MCP server is ready whenever you are!',
  '🎉 See you soon! Time to make those tools shine!',
  '🔥 Later! The tools are ready when you are!',
];

/**
 * Generate a funny, shareable goodbye message using LLM.
 */
async function generateLLMGoodbyeMessage(
  llmProvider: LLMProvider | MinimalLLMProvider,
  sessionState: DevSessionState
): Promise<string> {
  const toolCallsCount = sessionState.totalToolCalls;
  const toolNames = sessionState.toolCalls
    .map(tc => tc.name)
    .filter((name, index, self) => self.indexOf(name) === index)
    .slice(0, 5); // Limit to first 5 unique tool names

  const sessionDuration = Math.round(
    (Date.now() - sessionState.startTime.getTime()) / 1000
  );

  const prompt = `You are a witty, humorous AI assistant. A developer just finished testing their MCP (Model Context Protocol) tools using Syrin, a debugging/testing tool.

Context:
- They tested ${toolCallsCount} tool${toolCallsCount !== 1 ? 's' : ''} in total
- Tool names tested: ${toolNames.length > 0 ? toolNames.join(', ') : 'various tools'}
- Session duration: ${sessionDuration} second${sessionDuration !== 1 ? 's' : ''}

Generate a funny, witty, and shareable goodbye message (2-3 sentences max). The message should:
1. Be humorous and natural
2. Reference what they tested in a clever way
3. Be something they'd want to share on social media (like "look what Syrin told me!")
4. Feel personal and engaging
5. Be cool and memorable

Keep it concise, funny, and make it feel like a natural conversation ending. Don't be overly technical - be witty and relatable.

Respond with ONLY the goodbye message, no quotes, no prefixes, just the message text.`;

  try {
    const response = await llmProvider.chat({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.9, // Higher temperature for more creativity
      maxTokens: 150,
    });

    // Extract text content from response
    const content = response.content;
    if (typeof content === 'string' && content.trim()) {
      return content.trim();
    }

    // Fallback if response format is unexpected
    return getRandomDefaultMessage();
  } catch (error) {
    // If LLM call fails, fall back to default message
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to generate LLM goodbye message:', errorMessage);
    return getRandomDefaultMessage();
  }
}

/**
 * Get a random default goodbye message.
 */
function getRandomDefaultMessage(): string {
  const randomIndex = Math.floor(
    Math.random() * DEFAULT_GOODBYE_MESSAGES.length
  );
  return DEFAULT_GOODBYE_MESSAGES[randomIndex]!;
}

/**
 * Generate an appropriate goodbye message based on session activity.
 *
 * @param llmProvider - LLM provider to use for generating funny messages (can be minimal interface)
 * @param sessionState - Current session state
 * @returns Promise resolving to goodbye message string
 */
export async function generateGoodbyeMessage(
  llmProvider: LLMProvider | MinimalLLMProvider | null,
  sessionState: DevSessionState
): Promise<string> {
  // If user tested tools, try to generate a funny LLM message
  if (sessionState.totalToolCalls > 0 && llmProvider) {
    try {
      return await generateLLMGoodbyeMessage(llmProvider, sessionState);
    } catch (error) {
      // Fallback to default if LLM generation fails
      console.error('Error generating LLM goodbye message:', error);
      return getRandomDefaultMessage();
    }
  }

  // If no tools tested or no LLM provider, use default messages
  return getRandomDefaultMessage();
}
