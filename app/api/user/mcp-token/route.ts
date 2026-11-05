import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUserMcpToken, generateAdminMcpToken } from "@/lib/mcp-auth";

// GET /api/user/mcp-token — returns the authenticated user's unique MCP API Key
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tier: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const apiKey = generateUserMcpToken(user.id);
  const adminApiKey = user.role === "ADMIN" ? generateAdminMcpToken(user.id) : null;

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tier: user.tier,
    apiKey,
    adminApiKey,
  });
}

