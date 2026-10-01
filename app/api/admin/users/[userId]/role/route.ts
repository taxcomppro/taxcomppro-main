import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins can change roles or tiers
  const caller = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (caller?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const { role, tier, isBrandAmbassador } = await req.json();

  const updateData: any = {};

  if (role !== undefined) {
    const validRoles = ["MEMBER", "ADMIN"];
    if (!validRoles.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    updateData.role = role;
  }

  if (tier !== undefined) {
    const validTiers = ["FREE", "VIP", "MARKETPLACE", "MARKETPLACE_PLUS"];
    if (!validTiers.includes(tier)) return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    updateData.tier = tier;
  }

  if (isBrandAmbassador !== undefined) {
    updateData.isBrandAmbassador = Boolean(isBrandAmbassador);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, tier: true, isBrandAmbassador: true },
  });

  return NextResponse.json(updated);
}
