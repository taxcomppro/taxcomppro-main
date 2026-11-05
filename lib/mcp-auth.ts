import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { UserSessionContext, AdminSessionContext } from "@/mcp/src/common/types";

function getMcpSecret(): string {
  return (
    process.env.MCP_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    process.env.STRIPE_SECRET_KEY ||
    "taxcomppro-mcp-cryptographic-salt-2026"
  );
}

/**
 * Generates an unforgeable, cryptographically signed personal MCP API Key for a user.
 * Format: tcp_mcp_<userId>_<32-char-hmac-signature>
 */
export function generateUserMcpToken(userId: string): string {
  const secret = getMcpSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`taxcomppro:mcp:user:${userId}`)
    .digest("hex")
    .slice(0, 32);
  return `tcp_mcp_${userId}_${signature}`;
}

/**
 * Verifies a user MCP token signature and returns the userId if valid.
 */
export function verifyUserMcpTokenSignature(token: string): string | null {
  if (!token || !token.startsWith("tcp_mcp_")) return null;
  const payload = token.slice("tcp_mcp_".length);
  const lastUnderscore = payload.lastIndexOf("_");
  if (lastUnderscore === -1) return null;

  const userId = payload.slice(0, lastUnderscore);
  const signature = payload.slice(lastUnderscore + 1);

  if (!userId || !signature || signature.length !== 32) return null;

  const secret = getMcpSecret();
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`taxcomppro:mcp:user:${userId}`)
    .digest("hex")
    .slice(0, 32);

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
  } catch {
    return null;
  }

  return userId;
}

/**
 * Generates a signed Admin MCP API key for platform administrators.
 */
export function generateAdminMcpToken(adminId: string): string {
  const secret = getMcpSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`taxcomppro:mcp:admin:${adminId}`)
    .digest("hex")
    .slice(0, 32);
  return `tcp_admin_${adminId}_${signature}`;
}

/**
 * Verifies an admin MCP token signature and returns the adminId if valid.
 */
export function verifyAdminMcpTokenSignature(token: string): string | null {
  if (!token || !token.startsWith("tcp_admin_")) return null;
  const payload = token.slice("tcp_admin_".length);
  const lastUnderscore = payload.lastIndexOf("_");
  if (lastUnderscore === -1) return null;

  const adminId = payload.slice(0, lastUnderscore);
  const signature = payload.slice(lastUnderscore + 1);

  if (!adminId || !signature || signature.length !== 32) return null;

  const secret = getMcpSecret();
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`taxcomppro:mcp:admin:${adminId}`)
    .digest("hex")
    .slice(0, 32);

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
  } catch {
    return null;
  }

  return adminId;
}

/**
 * Resolves a UserSessionContext from a token string (signed MCP token, session token, or email).
 */
export async function resolveUserFromToken(token: string): Promise<UserSessionContext | null> {
  const clean = token.replace(/^Bearer\s+/i, "").trim();
  if (!clean) return null;

  // 1. Signed MCP Token (tcp_mcp_<userId>_<sig>)
  const verifiedUserId = verifyUserMcpTokenSignature(clean);
  if (verifiedUserId) {
    const user = await prisma.user.findUnique({
      where: { id: verifiedUserId },
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

  // 2. Active Better-Auth Session Token
  const dbSession = await prisma.session.findUnique({
    where: { token: clean },
    include: {
      user: {
        select: { id: true, email: true, name: true, role: true, tier: true },
      },
    },
  });

  if (dbSession && dbSession.user && new Date() < dbSession.expiresAt) {
    return {
      userId: dbSession.user.id,
      email: dbSession.user.email,
      name: dbSession.user.name,
      role: dbSession.user.role,
      tier: dbSession.user.tier,
    };
  }

  // 3. Fallback for development/testing: match by email or userId if explicitly enabled or in dev
  const allowEmailAuth =
    process.env.NODE_ENV === "development" ||
    process.env.TAXCOMPRO_ALLOW_EMAIL_AUTH === "true";

  if (allowEmailAuth) {
    const fallbackUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: clean }, { email: clean }],
      },
      select: { id: true, email: true, name: true, role: true, tier: true },
    });
    if (fallbackUser) {
      return {
        userId: fallbackUser.id,
        email: fallbackUser.email,
        name: fallbackUser.name,
        role: fallbackUser.role,
        tier: fallbackUser.tier,
      };
    }
  }

  return null;
}

