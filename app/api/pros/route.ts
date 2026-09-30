import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { directoryUserWhere } from "@/lib/proDirectory";

const publicSelect = {
  id: true, profileSlug: true, name: true, image: true, coverImage: true, headline: true, bio: true,
  mission: true, location: true, yearsExperience: true, website: true, linkedIn: true, twitter: true,
  specialties: true, certifications: true, languages: true, createdAt: true,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q    = searchParams.get("q") ?? "";
  const spec = searchParams.get("specialty") ?? "";

  const pros = await prisma.user.findMany({
    where: {
      AND: [directoryUserWhere],
      ...(q ? { OR: [
        { name: { contains: q, mode: "insensitive" } },
        { headline: { contains: q, mode: "insensitive" } },
      ]} : {}),
      ...(spec ? { specialties: { has: spec } } : {}),
    },
    select: publicSelect,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(pros);
}
