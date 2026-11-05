import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { UserSessionContext } from "../common/types";
import { profileToolDefinitions, handleProfileTool } from "./tools/profile";
import { trainingToolDefinitions, handleTrainingTool } from "./tools/training";
import { toolkitToolDefinitions, handleToolkitTool } from "./tools/toolkits";
import { digitalCardToolDefinitions, handleDigitalCardTool } from "./tools/digital-card";
import { marketplaceToolDefinitions, handleMarketplaceTool } from "./tools/marketplace";
import { networkToolDefinitions, handleNetworkTool } from "./tools/network";
import { spaceToolDefinitions, handleSpaceTool } from "./tools/spaces";
import { supportToolDefinitions, handleSupportTool } from "./tools/support";
import { affiliateToolDefinitions, handleAffiliateTool } from "./tools/affiliate";
import { feedToolDefinitions, handleFeedTool } from "./tools/feed";
import { userResourceDefinitions, handleUserResourceRead } from "./resources/user-resources";
import { userPromptDefinitions, handleUserGetPrompt } from "./prompts/user-prompts";

export function createUserMcpServer(user: UserSessionContext): Server {
  const server = new Server(
    {
      name: "taxcomppro-user-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // Combine all user tool definitions
  const allTools = [
    ...profileToolDefinitions,
    ...trainingToolDefinitions,
    ...toolkitToolDefinitions,
    ...digitalCardToolDefinitions,
    ...marketplaceToolDefinitions,
    ...networkToolDefinitions,
    ...spaceToolDefinitions,
    ...supportToolDefinitions,
    ...affiliateToolDefinitions,
    ...feedToolDefinitions,
  ];

  // Tool listing handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools,
    };
  });

  // Tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    if (profileToolDefinitions.some((t) => t.name === name)) {
      return await handleProfileTool(name, args, user);
    }
    if (trainingToolDefinitions.some((t) => t.name === name)) {
      return await handleTrainingTool(name, args, user);
    }
    if (toolkitToolDefinitions.some((t) => t.name === name)) {
      return await handleToolkitTool(name, args, user);
    }
    if (digitalCardToolDefinitions.some((t) => t.name === name)) {
      return await handleDigitalCardTool(name, args, user);
    }
    if (marketplaceToolDefinitions.some((t) => t.name === name)) {
      return await handleMarketplaceTool(name, args, user);
    }
    if (networkToolDefinitions.some((t) => t.name === name)) {
      return await handleNetworkTool(name, args, user);
    }
    if (spaceToolDefinitions.some((t) => t.name === name)) {
      return await handleSpaceTool(name, args, user);
    }
    if (supportToolDefinitions.some((t) => t.name === name)) {
      return await handleSupportTool(name, args, user);
    }
    if (affiliateToolDefinitions.some((t) => t.name === name)) {
      return await handleAffiliateTool(name, args, user);
    }
    if (feedToolDefinitions.some((t) => t.name === name)) {
      return await handleFeedTool(name, args, user);
    }

    throw new Error(`Tool not recognized by TaxComPro User MCP: ${name}`);
  });

  // Resource listing
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: userResourceDefinitions,
    };
  });

  // Resource reading
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const res = await handleUserResourceRead(request.params.uri, user);
    return {
      contents: [
        {
          uri: res.uri,
          mimeType: res.mimeType,
          text: res.text,
        },
      ],
    };
  });

  // Prompt listing
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: userPromptDefinitions,
    };
  });

  // Prompt retrieval
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    return handleUserGetPrompt(request.params.name, request.params.arguments);
  });

  return server;
}

