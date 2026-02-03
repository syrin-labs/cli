#!/usr/bin/env node

/**
 * Demo MCP Server for Syrin
 *
 * This server has intentional issues that Syrin can detect:
 * - Vague tool descriptions
 * - Missing parameter descriptions
 * - Overlapping tool functionality
 *
 * Run with: node server.js
 * Test with: syrin analyse --transport stdio --mcp-command "node server.js"
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "syrin-demo-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions with intentional issues for Syrin to catch
const tools = [
  {
    name: "get_user",
    description: "Gets a user", // Issue: Vague description
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          // Issue: Missing description
        },
      },
      required: ["id"],
    },
  },
  {
    name: "fetch_user", // Issue: Overlaps with get_user
    description: "Fetches user data",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID to fetch",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "create_report",
    description:
      "Creates a detailed report with user metrics, activity logs, and recommendations",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "User ID to generate report for",
        },
        format: {
          type: "string",
          enum: ["pdf", "html", "json"],
          description: "Output format",
        },
        includeHistory: {
          type: "boolean",
          description: "Include activity history",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "send_notification",
    description: "Send a notification to a user",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "Target user ID",
        },
        message: {
          type: "string",
          description: "Notification message",
        },
        channel: {
          type: "string",
          enum: ["email", "sms", "push"],
          // Issue: No description for enum values
        },
      },
      required: ["userId", "message"],
    },
  },
  {
    name: "process",
    description: "Process", // Issue: Extremely vague
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
        },
      },
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_user":
    case "fetch_user":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              id: args.id || args.userId,
              name: "Demo User",
              email: "demo@example.com",
              createdAt: new Date().toISOString(),
            }),
          },
        ],
      };

    case "create_report":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              reportId: `report-${Date.now()}`,
              userId: args.userId,
              format: args.format || "json",
              generatedAt: new Date().toISOString(),
              metrics: {
                totalLogins: 42,
                lastActive: "2024-01-15",
                actionsThisMonth: 156,
              },
            }),
          },
        ],
      };

    case "send_notification":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              notificationId: `notif-${Date.now()}`,
              channel: args.channel || "email",
              sentAt: new Date().toISOString(),
            }),
          },
        ],
      };

    case "process":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              processed: true,
              data: args.data,
            }),
          },
        ],
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Demo MCP server running on stdio");
}

main().catch(console.error);
