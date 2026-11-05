import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AdminSessionContext } from "@/mcp/src/common/types";
import { verifyAdminMcpTokenSignature } from "@/lib/mcp-auth";

// Admin tool imports
import { adminAnalyticsToolDefinitions, handleAdminAnalyticsTool } from "@/mcp/src/admin-server/tools/analytics";
import { adminUserToolDefinitions, handleAdminUserTool } from "@/mcp/src/admin-server/tools/users";
import { adminProvisioningToolDefinitions, handleAdminProvisioningTool } from "@/mcp/src/admin-server/tools/provisioning";
import { adminModerationToolDefinitions, handleAdminModerationTool } from "@/mcp/src/admin-server/tools/moderation";
import { adminCouponToolDefinitions, handleAdminCouponTool } from "@/mcp/src/admin-server/tools/coupons";
import { adminCourseToolDefinitions, handleAdminCourseTool } from "@/mcp/src/admin-server/tools/courses";
import { adminSpaceToolDefinitions, handleAdminSpaceTool } from "@/mcp/src/admin-server/tools/spaces";
import { adminAffiliateToolDefinitions, handleAdminAffiliateTool } from "@/mcp/src/admin-server/tools/affiliate";
import { adminProHubToolDefinitions, handleAdminProHubTool } from "@/mcp/src/admin-server/tools/pro-hub";
import { adminAtlasToolDefinitions, handleAdminAtlasTool } from "@/mcp/src/admin-server/tools/atlas";
import { adminCommunicationsToolDefinitions, handleAdminCommunicationsTool } from "@/mcp/src/admin-server/tools/communications";
import { adminNfcToolDefinitions, handleAdminNfcTool } from "@/mcp/src/admin-server/tools/nfc";
import { adminResourceDefinitions, handleAdminResourceRead } from "@/mcp/src/admin-server/resources/admin-resources";
import { adminPromptDefinitions, handleAdminGetPrompt } from "@/mcp/src/admin-server/prompts/admin-prompts";

const allAdminTools = [
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

async function authenticateAdmin(req: NextRequest): Promise<AdminSessionContext | null> {
  const authHeader = req.headers.get("authorization");
  const emailHeader = req.headers.get("x-admin-email");
  const keyHeader = req.headers.get("x-admin-key");

  let token = emailHeader;
  if (!token && authHeader?.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "").trim();
  }

  // Master admin key check
  const masterKey = process.env.ADMIN_NFC_API_KEY || process.env.ADMIN_API_KEY;
  if ((token && token === masterKey) || (keyHeader && keyHeader === masterKey)) {
    const defaultAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true, email: true, name: true, role: true },
    });
    if (defaultAdmin) {
      return {
        adminId: defaultAdmin.id,
        email: defaultAdmin.email,
        name: defaultAdmin.name,
        role: "ADMIN",
      };
    }
  }

  // Signed Admin MCP Key check (tcp_admin_<adminId>_<sig>)
  if (token) {
    const verifiedAdminId = verifyAdminMcpTokenSignature(token);
    if (verifiedAdminId) {
      const adminUser = await prisma.user.findUnique({
        where: { id: verifiedAdminId },
        select: { id: true, email: true, name: true, role: true },
      });
      if (adminUser && adminUser.role === "ADMIN") {
        return {
          adminId: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: "ADMIN",
        };
      }
    }
  }

  // Check email / ID with role === ADMIN
  if (token) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: token }, { email: token }],
      },
      select: { id: true, email: true, name: true, role: true },
    });

    if (user && user.role === "ADMIN") {
      return {
        adminId: user.id,
        email: user.email,
        name: user.name,
        role: "ADMIN",
      };
    }
  }

  // Check session cookie
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (session?.user) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, email: true, name: true, role: true },
      });
      if (user && user.role === "ADMIN") {
        return {
          adminId: user.id,
          email: user.email,
          name: user.name,
          role: "ADMIN",
        };
      }
    }
  } catch (err) {}

  return null;
}

export async function GET(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) {
    return NextResponse.json(
      {
        name: "taxcomppro-admin-mcp",
        status: "forbidden",
        message: "Admin privileges required. Provide Authorization: Bearer <admin_email_or_key> header.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    name: "taxcomppro-admin-mcp",
    version: "1.0.0",
    status: "ready",
    authenticatedAs: admin.email,
    role: "ADMIN",
    capabilities: {
      tools: allAdminTools.length,
      resources: adminResourceDefinitions.length,
      prompts: adminPromptDefinitions.length,
    },
  });
}

export async function POST(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Forbidden: Admin privileges required.",
        },
      },
      { status: 403 }
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
          result: { tools: allAdminTools },
        });
      }

      case "tools/call": {
        const { name, arguments: args = {} } = params;

        let result: any;
        if (adminAnalyticsToolDefinitions.some((t) => t.name === name)) {
          result = await handleAdminAnalyticsTool(name, args, admin);
        } else if (adminUserToolDefinitions.some((t) => t.name === name)) {
          result = await handleAdminUserTool(name, args, admin);
        } else if (adminProvisioningToolDefinitions.some((t) => t.name === name)) {
          result = await handleAdminProvisioningTool(name, args, admin);
        } else if (adminModerationToolDefinitions.some((t) => t.name === name)) {
          result = await handleAdminModerationTool(name, args, admin);
        } else if (adminCouponToolDefinitions.some((t) => t.name === name)) {
          result = await handleAdminCouponTool(name, args, admin);
        } else if (adminCourseToolDefinitions.some((t) => t.name === name)) {
          result = await handleAdminCourseTool(name, args, admin);
        } else if (adminSpaceToolDefinitions.some((t) => t.name === name)) {
          result = await handleAdminSpaceTool(name, args, admin);
        } else if (adminAffiliateToolDefinitions.some((t) => t.name === name)) {
          result = await handleAdminAffiliateTool(name, args, admin);
        } else if (adminProHubToolDefinitions.some((t) => t.name === name)) {
          result = await handleAdminProHubTool(name, args, admin);
        } else if (adminAtlasToolDefinitions.some((t) => t.name === name)) {
          result = await handleAdminAtlasTool(name, args, admin);
        } else if (adminCommunicationsToolDefinitions.some((t) => t.name === name)) {
          result = await handleAdminCommunicationsTool(name, args, admin);
        } else if (adminNfcToolDefinitions.some((t) => t.name === name)) {
          result = await handleAdminNfcTool(name, args, admin);
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
          result: { resources: adminResourceDefinitions },
        });
      }

      case "resources/read": {
        const resource = await handleAdminResourceRead(params.uri, admin);
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
          result: { prompts: adminPromptDefinitions },
        });
      }

      case "prompts/get": {
        const prompt = handleAdminGetPrompt(params.name, params.arguments);
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

