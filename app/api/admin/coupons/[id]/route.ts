import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

// PATCH /api/admin/coupons/[id] - Update coupon
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const {
    code,
    discountType,
    discountValue,
    appliesTo,
    durationMonths,
    maxUses,
    expiresAt,
    isActive,
  } = body;

  const updateData: any = {};

  if (code !== undefined && typeof code === "string") {
    const cleanCode = code.toUpperCase().trim();
    if (cleanCode.length === 0) {
      return NextResponse.json({ error: "Code cannot be empty" }, { status: 400 });
    }
    // Check if code taken by another coupon
    const existing = await prisma.marketplaceCoupon.findFirst({
      where: { code: cleanCode, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: `Code '${cleanCode}' is already in use` }, { status: 400 });
    }
    updateData.code = cleanCode;
  }

  if (discountType !== undefined) {
    updateData.discountType = discountType === "FIXED" ? "FIXED" : "PERCENT";
  }

  if (discountValue !== undefined) {
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      return NextResponse.json({ error: "Invalid discount value" }, { status: 400 });
    }
    updateData.discountValue = val;
  }

  if (appliesTo !== undefined) {
    let validListingId: string | null = null;
    if (appliesTo && appliesTo !== "ALL") {
      const listing = await prisma.marketplaceListing.findUnique({
        where: { id: appliesTo },
        select: { id: true },
      });
      if (listing) {
        validListingId = listing.id;
      } else {
        validListingId = appliesTo;
      }
    }
    updateData.listingId = validListingId;
  }

  if (durationMonths !== undefined) {
    updateData.durationMonths = durationMonths
      ? Math.max(1, Math.min(120, parseInt(String(durationMonths), 10) || 1))
      : 1;
  }

  if (maxUses !== undefined) {
    updateData.maxUses = maxUses === null || maxUses === "" ? null : parseInt(maxUses, 10);
  }

  if (expiresAt !== undefined) {
    updateData.expiresAt = expiresAt === null || expiresAt === "" ? null : new Date(expiresAt);
  }

  if (isActive !== undefined) {
    updateData.isActive = Boolean(isActive);
  }

  try {
    const updated = await prisma.marketplaceCoupon.update({
      where: { id },
      data: updateData,
      include: {
        seller: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json({ success: true, coupon: updated });
  } catch (error: any) {
    console.error("Failed to update coupon:", error);
    return NextResponse.json({ error: error.message || "Failed to update coupon" }, { status: 500 });
  }
}

// DELETE /api/admin/coupons/[id] - Delete coupon
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });

  try {
    await prisma.marketplaceCoupon.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("Failed to delete coupon:", error);
    return NextResponse.json({ error: error.message || "Failed to delete coupon" }, { status: 500 });
  }
}
