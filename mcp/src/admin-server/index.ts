import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { AdminSessionContext } from "../common/types";
import { adminAnalyticsToolDefinitions, handleAdminAnalyticsTool } from "./tools/analytics";
import { adminUserToolDefinitions, handleAdminUserTool } from "./tools/users";
import { adminProvisioningToolDefinitions, handleAdminProvisioningTool } from "./tools/provisioning";
import { adminModerationToolDefinitions, handleAdminModerationTool } from "./tools/moderation";
import { adminCouponToolDefinitions, handleAdminCouponTool } from "./tools/coupons";
import { adminCourseToolDefinitions, handleAdminCourseTool } from "./tools/courses";
import { adminSpaceToolDefinitions, handleAdminSpaceTool } from "./tools/spaces";
import { adminAffiliateToolDefinitions, handleAdminAffiliateTool } from "./tools/affiliate";
import { adminProHubToolDefinitions, handleAdminProHubTool } from "./tools/pro-hub";
import { adminAtlasToolDefinitions, handleAdminAtlasTool } from "./tools/atlas";
import { adminCommunicationsToolDefinitions, handleAdminCommunicationsTool } from "./tools/communications";
import { adminNfcToolDefinitions, handleAdminNfcTool } from "./tools/nfc";
import { adminResourceDefinitions, handleAdminResourceRead } from "./resources/admin-resources";
import { adminPromptDefinitions, handleAdminGetPrompt } from "./prompts/admin-prompts";

export function createAdminMcpServer(admin: AdminSessionContext): Server {
  const server = new Server(
    {
      name: "taxcomppro-admin-mcp",
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

  // Combine all admin tools
  const allTools = [
    ...adminAnalyticsToolDefinitions,
    ...adminUserToolDefinitions,
    ...adminProvisioningToolDefinitions,
    ...adminModerationToolDefinitions,
    ...adminCouponToolDefinitions,
    ...adminCourseToolDefinitions,
    ...adminSpaceToolDefinitions,
    ...adminAffiliateToolDefinitions,
    ...adminProHubToolDefinitions,
    ...adminAtlasToolDefinitions,
    ...adminCommunicationsToolDefinitions,
    ...adminNfcToolDefinitions,
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

    if (adminAnalyticsToolDefinitions.some((t) => t.name === name)) {
      return await handleAdminAnalyticsTool(name, args, admin);
    }
    if (adminUserToolDefinitions.some((t) => t.name === name)) {
      return await handleAdminUserTool(name, args, admin);
    }
    if (adminProvisioningToolDefinitions.some((t) => t.name === name)) {
      return await handleAdminProvisioningTool(name, args, admin);
    }
    if (adminModerationToolDefinitions.some((t) => t.name === name)) {
      return await handleAdminModerationTool(name, args, admin);
    }
    if (adminCouponToolDefinitions.some((t) => t.name === name)) {
      return await handleAdminCouponTool(name, args, admin);
    }
    if (adminCourseToolDefinitions.some((t) => t.name === name)) {
      return await handleAdminCourseTool(name, args, admin);
    }
    if (adminSpaceToolDefinitions.some((t) => t.name === name)) {
      return await handleAdminSpaceTool(name, args, admin);
    }
    if (adminAffiliateToolDefinitions.some((t) => t.name === name)) {
      return await handleAdminAffiliateTool(name, args, admin);
    }
    if (adminProHubToolDefinitions.some((t) => t.name === name)) {
      return await handleAdminProHubTool(name, args, admin);
    }
    if (adminAtlasToolDefinitions.some((t) => t.name === name)) {
      return await handleAdminAtlasTool(name, args, admin);
    }
    if (adminCommunicationsToolDefinitions.some((t) => t.name === name)) {
      return await handleAdminCommunicationsTool(name, args, admin);
    }
    if (adminNfcToolDefinitions.some((t) => t.name === name)) {
      return await handleAdminNfcTool(name, args, admin);
    }

    throw new Error(`Tool not recognized by TaxComPro Admin MCP: ${name}`);
  });

  // Resource listing
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: adminResourceDefinitions,
    };
  });

  // Resource reading
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const res = await handleAdminResourceRead(request.params.uri, admin);
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
      prompts: adminPromptDefinitions,
    };
  });

  // Prompt retrieval
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    return handleAdminGetPrompt(request.params.name, request.params.arguments);
  });

  return server;
}

