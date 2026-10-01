import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== "ADMIN") return null;
  return session;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const role   = searchParams.get("role") ?? "ALL";
  const tier   = searchParams.get("tier") ?? "ALL";
  const limit  = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "1000", 10) || 1000, 1), 5000);

  const users = await prisma.user.findMany({
    where: {
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
      ...(role !== "ALL" ? { role: role as "MEMBER" | "ADMIN" } : {}),
      ...(tier !== "ALL" ? { tier: tier as "FREE" | "VIP" | "MARKETPLACE" | "MARKETPLACE_PLUS" } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      tier: true,
      isBrandAmbassador: true,
      image: true,
      createdAt: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
      digitalCard: {
        select: {
          isPurchased: true,
          isActivated: true,
          username: true,
        },
      },
      toolkitPurchases: {
        select: {
          id: true,
          toolkitId: true,
          createdAt: true,
          membershipMonths: true,
          membershipTier: true,
          stripeSessionId: true,
        },
        orderBy: { createdAt: "desc" },
      },
      enrollments: {
        select: {
          id: true,
          courseId: true,
          completedAt: true,
          createdAt: true,
          course: {
            select: { id: true, title: true, slug: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      trainingLicenses: {
        select: {
          id: true,
          toolkitId: true,
          totalSeats: true,
          expiresAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(users);
}
