import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.affiliateProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json([]);
  return NextResponse.json(await prisma.affiliatePayout.findMany({ where: { affiliateId: profile.id }, orderBy: { createdAt: "desc" } }));
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const amount = typeof body?.amount === "number" || typeof body?.amount === "string" ? Number(body.amount) : NaN;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001 || typeof body?.details !== "string" || !body.details.trim() || body.details.length > 2000 || (body.method !== undefined && (typeof body.method !== "string" || body.method.length > 50))) {
    return NextResponse.json({ error: "Enter a positive payout amount with at most two decimal places and valid payment details." }, { status: 400 });
  }
  try {
    const result = await prisma.$transaction(async tx => {
      const profile = await tx.affiliateProfile.findUnique({ where: { userId: session.user.id } });
      if (!profile) return { status: 404, body: { error: "No affiliate profile" } };
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"affiliate-payout:" + profile.id}, 0))`;
      const current = await tx.affiliateProfile.findUniqueOrThrow({ where: { id: profile.id } });
      const settings = await tx.affiliateSettings.findFirst();
      const minimum = settings?.minPayoutAmount ?? 50;
      if (amount < minimum || amount > current.pendingBalance) return { status: 400, body: { error: "Amount must meet the minimum payout and fit your available balance." } };
      const existing = await tx.affiliatePayout.findFirst({ where: { affiliateId: profile.id, status: { in: ["PENDING", "APPROVED"] } } });
      if (existing) return { status: 409, body: { error: "You already have a payout awaiting processing." } };
      const payout = await tx.affiliatePayout.create({ data: { affiliateId: profile.id, amount, method: body.method || "paypal", details: body.details.trim(), updatedAt: new Date() } });
      // Funds are deducted once, when the administrator records the payout as PAID.
      return { status: 201, body: { ...payout, payout, newPendingBalance: current.pendingBalance } };
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "Unable to request payout. Please retry." }, { status: 503 });
  }
}
