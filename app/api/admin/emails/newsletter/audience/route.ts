import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIENCE_SEGMENTS, resolveAudienceRecipients, AudienceSegmentKey } from "@/lib/newsletter";

async function requireAdmin(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (user?.role !== "ADMIN") return null;
  return { session, user };
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const unsubscribedCount = await prisma.newsletterUnsubscribe.count();

    // Query segment counts in parallel
    const [allCount, verifiedCount, prosCount, membersCount, vipCount, marketplaceCount, freeCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { emailVerified: true } }),
        prisma.user.count({ where: { tier: { in: ["MARKETPLACE", "MARKETPLACE_PLUS"] } } }),
        prisma.user.count({ where: { role: "MEMBER" } }),
        prisma.user.count({ where: { tier: "VIP" } }),
        prisma.user.count({ where: { tier: { in: ["MARKETPLACE", "MARKETPLACE_PLUS"] } } }),
        prisma.user.count({ where: { tier: "FREE" } }),
      ]);

    const countMap: Record<string, number> = {
      ALL: allCount,
      VERIFIED: verifiedCount,
      PROS: prosCount,
      MEMBERS: membersCount,
      TIER_VIP: vipCount,
      TIER_MARKETPLACE: marketplaceCount,
      TIER_FREE: freeCount,
      CUSTOM: 0,
    };

    const segmentsWithCounts = AUDIENCE_SEGMENTS.map((seg) => ({
      ...seg,
      count: countMap[seg.key] ?? 0,
    }));

    return NextResponse.json({
      segments: segmentsWithCounts,
      totalUsers: allCount,
      unsubscribedCount,
    });
  } catch (err) {
    console.error("[Audience Route] Error calculating audience sizes:", err);
    return NextResponse.json(
      { error: "Failed to calculate audience sizes" },
      { status: 500 }
    );
  }
}
