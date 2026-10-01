import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: list people to discover (not yet connected, not self)
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const search = new URL(req.url).searchParams.get("search") ?? "";

  // Get IDs of people already in a connection with me (any status)
  const existing = await prisma.connection.findMany({
    where: { OR: [{ requesterId: userId }, { receiverId: userId }] },
    select: { requesterId: true, receiverId: true },
  });
  const excludeIds = new Set<string>([userId]);
  existing.forEach(c => { excludeIds.add(c.requesterId); excludeIds.add(c.receiverId); });

  const limitParam = new URL(req.url).searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 500, 1), 2000) : 500;

  const people = await prisma.user.findMany({
    where: {
      aiSpecialist: null,
      id:   { notIn: Array.from(excludeIds) },
      ...(search ? { OR: [
        { name:     { contains: search, mode: "insensitive" } },
        { headline: { contains: search, mode: "insensitive" } },
      ]} : {}),
    },
    select: { id: true, profileSlug: true, name: true, image: true, headline: true, professionalTitle: true, location: true, role: true, tier: true, isBrandAmbassador: true },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(people);
}
