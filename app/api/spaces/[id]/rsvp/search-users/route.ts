import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/spaces/[id]/rsvp/search-users
 * Admin-only search for platform users to manually RSVP them to a Pro Talk.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { id: spaceId } = await params;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 50);

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      headline: true,
      role: true,
      tier: true,
      isBrandAmbassador: true,
      spaceRsvps: {
        where: { spaceId },
        select: { id: true },
      },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  const results = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    headline: u.headline,
    role: u.role,
    tier: u.tier,
    isBrandAmbassador: u.isBrandAmbassador,
    isRsvped: u.spaceRsvps.length > 0,
    rsvpId: u.spaceRsvps[0]?.id || null,
  }));

  return NextResponse.json(results);
}
