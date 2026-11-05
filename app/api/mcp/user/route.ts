import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { UserSessionContext } from "@/mcp/src/common/types";

// User tool imports
import { profileToolDefinitions, handleProfileTool } from "@/mcp/src/user-server/tools/profile";
import { trainingToolDefinitions, handleTrainingTool } from "@/mcp/src/user-server/tools/training";
import { toolkitToolDefinitions, handleToolkitTool } from "@/mcp/src/user-server/tools/toolkits";
import { digitalCardToolDefinitions, handleDigitalCardTool } from "@/mcp/src/user-server/tools/digital-card";
import { marketplaceToolDefinitions, handleMarketplaceTool } from "@/mcp/src/user-server/tools/marketplace";
import { networkToolDefinitions, handleNetworkTool } from "@/mcp/src/user-server/tools/network";
import { spaceToolDefinitions, handleSpaceTool } from "@/mcp/src/user-server/tools/spaces";
import { supportToolDefinitions, handleSupportTool } from "@/mcp/src/user-server/tools/support";
import { affiliateToolDefinitions, handleAffiliateTool } from "@/mcp/src/user-server/tools/affiliate";
import { feedToolDefinitions, handleFeedTool } from "@/mcp/src/user-server/tools/feed";
import { userResourceDefinitions, handleUserResourceRead } from "@/mcp/src/user-server/resources/user-resources";
import { userPromptDefinitions, handleUserGetPrompt } from "@/mcp/src/user-server/prompts/user-prompts";
import { resolveUserFromToken } from "@/lib/mcp-auth";

const allUserTools = [
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

async function authenticateUser(req: NextRequest): Promise<UserSessionContext | null> {
  // 1. Check Bearer token or custom header (Personal API Key, Session Token, or dev fallback)
  const authHeader = req.headers.get("authorization");
  const emailHeader = req.headers.get("x-user-email");
  const idHeader = req.headers.get("x-user-id");
  const keyHeader = req.headers.get("x-api-key");

  let token = keyHeader || emailHeader || idHeader;
  if (!token && authHeader?.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "").trim();
  }

  if (token) {
    const userFromToken = await resolveUserFromToken(token);
    if (userFromToken) return userFromToken;
  }

  // 2. Check session cookie
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (session?.user) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, email: true, name: true, role: true, tier: true },
      });
      if (user) {
        return {
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tier: user.tier,
        };
      }
    }
  } catch (err) {
    // Ignore session extraction failure
  }

  return null;
}

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) {
    return NextResponse.json(
      {
        name: "taxcomppro-user-mcp",
        status: "unauthorized",
        message: "Please provide Authorization: Bearer <email_or_user_id> or x-user-email header.",
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    name: "taxcomppro-user-mcp",
    version: "1.0.0",
    status: "ready",
    authenticatedAs: user.email,
    tier: user.tier,
    role: user.role,
    capabilities: {
      tools: allUserTools.length,
      resources: userResourceDefinitions.length,
      prompts: userPromptDefinitions.length,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Unauthorized: Please provide Authorization: Bearer <email_or_user_id> header.",
        },
      },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }

  const { jsonrpc = "2.0", id, method, params = {} } = body;

  try {
    switch (method) {
      case "tools/list": {
        return NextResponse.json({
          jsonrpc,
          id,
          result: { tools: allUserTools },
        });
      }

      case "tools/call": {
        const { name, arguments: args = {} } = params;

        let result: any;
        if (profileToolDefinitions.some((t) => t.name === name)) {
          result = await handleProfileTool(name, args, user);
        } else if (trainingToolDefinitions.some((t) => t.name === name)) {
          result = await handleTrainingTool(name, args, user);
        } else if (toolkitToolDefinitions.some((t) => t.name === name)) {
          result = await handleToolkitTool(name, args, user);
        } else if (digitalCardToolDefinitions.some((t) => t.name === name)) {
          result = await handleDigitalCardTool(name, args, user);
        } else if (marketplaceToolDefinitions.some((t) => t.name === name)) {
          result = await handleMarketplaceTool(name, args, user);
        } else if (networkToolDefinitions.some((t) => t.name === name)) {
          result = await handleNetworkTool(name, args, user);
        } else if (spaceToolDefinitions.some((t) => t.name === name)) {
          result = await handleSpaceTool(name, args, user);
        } else if (supportToolDefinitions.some((t) => t.name === name)) {
          result = await handleSupportTool(name, args, user);
        } else if (affiliateToolDefinitions.some((t) => t.name === name)) {
          result = await handleAffiliateTool(name, args, user);
        } else if (feedToolDefinitions.some((t) => t.name === name)) {
          result = await handleFeedTool(name, args, user);
        } else {
          return NextResponse.json({
            jsonrpc,
            id,
            error: { code: -32601, message: `Tool not found: ${name}` },
          });
        }

        return NextResponse.json({
          jsonrpc,
          id,
          result,
        });
      }

      case "resources/list": {
        return NextResponse.json({
          jsonrpc,
          id,
          result: { resources: userResourceDefinitions },
        });
      }

      case "resources/read": {
        const resource = await handleUserResourceRead(params.uri, user);
        return NextResponse.json({
          jsonrpc,
          id,
          result: {
            contents: [resource],
          },
        });
      }

      case "prompts/list": {
        return NextResponse.json({
          jsonrpc,
          id,
          result: { prompts: userPromptDefinitions },
        });
      }

      case "prompts/get": {
        const prompt = handleUserGetPrompt(params.name, params.arguments);
        return NextResponse.json({
          jsonrpc,
          id,
          result: prompt,
        });
      }

      default:
        return NextResponse.json({
          jsonrpc,
          id,
          error: { code: -32601, message: `Method not supported: ${method}` },
        });
    }
  } catch (error: any) {
    return NextResponse.json({
      jsonrpc,
      id,
      error: { code: -32603, message: error.message || "Internal error" },
    });
  }
}

