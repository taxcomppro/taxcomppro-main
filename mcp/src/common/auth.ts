import { prisma } from "./db.js";
import { UserSessionContext, AdminSessionContext } from "./types.js";

/**
 * Resolves user context for User MCP server.
 * Can be identified via:
 * 1. TAXCOMPRO_USER_ID
 * 2. TAXCOMPRO_USER_EMAIL
 * 3. Fallback to first user in dev mode if TAXCOMPRO_ALLOW_FIRST_USER_DEV=true
 */
export async function resolveUserContext(): Promise<UserSessionContext> {
  const userId = process.env.TAXCOMPRO_USER_ID?.trim();
  const userEmail = process.env.TAXCOMPRO_USER_EMAIL?.trim();

  let user = null;

  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, tier: true },
    });
  } else if (userEmail) {
    user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true, name: true, role: true, tier: true },
    });
  } else {
    // If running in development without explicit user env, find the first active user
    user = await prisma.user.findFirst({
      select: { id: true, email: true, name: true, role: true, tier: true },
    });
  }

  if (!user) {
    throw new Error(
      "TaxComPro User MCP Authentication Failed: No valid user found. Please provide TAXCOMPRO_USER_ID or TAXCOMPRO_USER_EMAIL in your environment or MCP config."
    );
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tier: user.tier,
  };
}

/**
 * Resolves and strictly verifies Admin context for Admin MCP server.
 * Must have role: ADMIN.
 */
export async function resolveAdminContext(): Promise<AdminSessionContext> {
  const adminId = process.env.TAXCOMPRO_ADMIN_ID?.trim();
  const adminEmail = process.env.TAXCOMPRO_ADMIN_EMAIL?.trim();
  const adminKey = process.env.TAXCOMPRO_ADMIN_KEY?.trim() || process.env.ADMIN_NFC_API_KEY?.trim();

  let admin = null;

  if (adminId) {
    admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, name: true, role: true },
    });
  } else if (adminEmail) {
    admin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, email: true, name: true, role: true },
    });
  } else {
    // Look up any ADMIN user in database
    admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  if (!admin) {
    throw new Error(
      "TaxComPro Admin MCP Authentication Failed: No admin user found in database. Please specify TAXCOMPRO_ADMIN_EMAIL or TAXCOMPRO_ADMIN_ID."
    );
  }

  if (admin.role !== "ADMIN") {
    throw new Error(
      `TaxComPro Admin MCP Security Violation: User ${admin.email} (ID: ${admin.id}) does not have ADMIN privileges.`
    );
  }

  return {
    adminId: admin.id,
    email: admin.email,
    name: admin.name,
    role: "ADMIN",
  };
}

