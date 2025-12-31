/**
 * Message component wrapper factory for Chat UI.
 * Creates a memoized message component that works with dynamically imported React/Ink.
 */

/* eslint-disable
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/no-unsafe-return,
   @typescript-eslint/no-unsafe-argument
*/

import type { ChatMessage, ChatUIOptions } from '../chat-ui-types';
import {
  createUserMessage,
  createAssistantMessage,
  createSystemMessage,
} from './index';

/**
 * Creates a memoized Message Component factory function.
 * @param React - React module (dynamically imported)
 * @param Box - Box component from Ink
 * @param Text - Text component from Ink
 * @param memo - memo function from React
 * @returns Factory function that creates MessageComponent given parseMarkdown and wrapText
 */
export function createMessageComponentFactory(
  React: {
    createElement: (
      type: unknown,
      props?: unknown,
      ...children: unknown[]
    ) => unknown;
  },
  Box: unknown,
  Text: unknown,
  memo: (component: unknown, areEqual?: unknown) => unknown
): (
  parseMarkdown: (text: string, defaultColor?: string) => unknown[],
  wrapText: (text: string, width: number) => string[]
) => unknown {
  const { createElement } = React;

  return (
    parseMarkdown: (text: string, defaultColor?: string) => unknown[],
    wrapText: (text: string, width: number) => string[]
  ) => {
    // Message component - only re-renders when message content changes
    const MessageComponentInner = (props: {
      message: ChatMessage;
      index: number;
      options: ChatUIOptions;
      parseMarkdown: (text: string, defaultColor?: string) => unknown[];
      wrapText: (text: string, width: number) => string[];
    }): unknown => {
      const {
        message,
        index,
        options,
        parseMarkdown,
        wrapText: wrapTextFn,
      } = props;
      const timestamp = options.showTimestamps
        ? `[${message.timestamp?.toLocaleTimeString() || ''}] `
        : '';

      if (message.role === 'user') {
        // User messages: minimalistic bordered rectangle with blue background
        const wrappedLines = wrapTextFn(message.content, 60);
        return createUserMessage(
          React,
          Box,
          Text,
          message,
          index,
          options,
          timestamp,
          wrappedLines
        );
      } else {
        // Assistant and system messages: parse markdown (cached via parseMarkdown)
        const markdownElements = parseMarkdown(
          message.content,
          message.role === 'system' ? 'yellow' : undefined
        );

        if (message.role === 'assistant') {
          // LLM-generated messages: minimalistic bordered rectangle style
          return createAssistantMessage(
            React,
            Box,
            Text,
            message,
            index,
            options,
            markdownElements
          );
        } else {
          // System messages: styled with bright yellow color to make them pop (no prefix)
          return createSystemMessage(
            React,
            Box,
            message,
            index,
            markdownElements
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
        },
        nextProps: {
          message: ChatMessage;
          index: number;
          options: ChatUIOptions;
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

    return MessageComponent;
  };
}
