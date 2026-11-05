import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  const admin = session?.user ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (!["APPROVED", "REJECTED", "PAID"].includes(status) || (body.note != null && (typeof body.note !== "string" || body.note.length > 2000))) return NextResponse.json({ error: "Invalid status or note" }, { status: 400 });
  try {
    const result = await prisma.$transaction(async tx => {
      const candidate = await tx.affiliatePayout.findUnique({ where: { id } });
      if (!candidate) return { status: 404, body: { error: "Payout not found" } };
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"affiliate-payout:" + candidate.affiliateId}, 0))`;
      const payout = await tx.affiliatePayout.findUniqueOrThrow({ where: { id } });
      if (payout.status === status) return { status: 200, body: payout };
      if (!["PENDING", "APPROVED"].includes(payout.status) || (payout.status === "APPROVED" && status === "APPROVED")) return { status: 409, body: { error: "This payout is already finalized" } };
      if (!Number.isFinite(payout.amount) || payout.amount <= 0) return { status: 409, body: { error: "Invalid historical payout amount; review this record." } };
      if (status === "PAID") {
        const changed = await tx.affiliateProfile.updateMany({ where: { id: payout.affiliateId, pendingBalance: { gte: payout.amount } }, data: { pendingBalance: { decrement: payout.amount }, totalPaid: { increment: payout.amount }, updatedAt: new Date() } });
        if (changed.count !== 1) return { status: 409, body: { error: "Insufficient balance; review this payout before proceeding." } };
      }
      const updated = await tx.affiliatePayout.update({ where: { id }, data: { status, note: body.note ?? payout.note, updatedAt: new Date() } });
      if (status === "PAID" || status === "REJECTED") {
        const profile = await tx.affiliateProfile.findUniqueOrThrow({ where: { id: payout.affiliateId } });
        await tx.notification.create({ data: { userId: profile.userId, type: "system", title: status === "PAID" ? "Payout Processed" : "Payout Request Rejected", message: status === "PAID" ? `Your affiliate payout of $${payout.amount.toFixed(2)} has been processed.` : "Your payout request was rejected. Please review the payout details." } });
      }
      return { status: 200, body: updated };
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "Unable to update payout. Please retry." }, { status: 503 });
  }
}
