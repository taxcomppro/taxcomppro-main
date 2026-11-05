import { timingSafeEqual, randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function requireAdminKey(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_NFC_API_KEY;
  if (!key || !expected) return false;
  const a = Buffer.from(key), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!requireAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const username = (searchParams.get("username") ?? "").trim().toLowerCase();

  if (!username) {
    return NextResponse.json({ error: "username query param is required" }, { status: 400 });
  }

  const digitalCard = await prisma.digitalCard.findUnique({
    where: { username },
    select: {
      username: true,
      isActivated: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!digitalCard) {
    return NextResponse.json({ exists: false, error: `No Connect Card found for username "${username}"` }, { status: 404 });
  }

  // Check if already has an active NFC card assigned
  const existingNfcCard = await prisma.nfcCard.findFirst({
    where: { username, status: "ACTIVE" },
    select: { cardId: true, url: true, createdAt: true },
  });

  return NextResponse.json({
    exists: true,
    username: digitalCard.username,
    name: digitalCard.user.name,
    email: digitalCard.user.email,
    isActivated: digitalCard.isActivated,
    existingNfcCard: existingNfcCard ?? null,
  });
}
