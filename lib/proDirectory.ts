import type { Prisma } from "@prisma/client";

/** Plans that include a Find a Pro listing ($79.99/mo Marketplace and up). */
export const DIRECTORY_TIERS = ["MARKETPLACE", "MARKETPLACE_PLUS"] as const;

/** Who appears on Find a Pro: anyone on a Marketplace plan. */
export const directoryUserWhere: Prisma.UserWhereInput = {
  tier: { in: [...DIRECTORY_TIERS] },
};
