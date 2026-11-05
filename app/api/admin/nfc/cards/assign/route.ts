import { timingSafeEqual, randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 to avoid confusion

function generateCardId(length = 6): string {
  let id = "";
  for (let i = 0; i < length; i++) {
    id += ALPHABET[randomInt(ALPHABET.length)];
  }
  return id;
}

async function uniqueCardId(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = generateCardId();
    const existing = await prisma.nfcCard.findUnique({ where: { cardId: id } });
    if (!existing) return id;
  }
  throw new Error("Failed to generate unique cardId after 20 attempts");
}

function requireAdminKey(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_NFC_API_KEY;
  if (!key || !expected) return false;
  const a = Buffer.from(key), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://taxcomppro.com";

export async function POST(req: NextRequest) {
  if (!requireAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username = (body.username ?? "").trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  // Verify the username exists as a TaxCompPro Connect Card
  const digitalCard = await prisma.digitalCard.findUnique({
    where: { username },
    select: { username: true, isActivated: true, user: { select: { name: true } } },
  });

  if (!digitalCard?.isActivated) {
    return NextResponse.json(
      { error: `No TaxCompPro Connect Card found for username "${username}". The user must have an activated Connect Card.` },
      { status: 404 }
    );
  }

  // Check if username already has an active NFC card
  const existing = await prisma.nfcCard.findFirst({
    where: { username, status: "ACTIVE" },
    select: { cardId: true, url: true },
  });

  if (existing) {
    return NextResponse.json(
      {
        error: `Username "${username}" already has an active NFC card (${existing.cardId}). Deactivate it first or reassign the existing card.`,
        existingCard: existing,
      },
      { status: 409 }
    );
  }

  // Generate unique cardId and build URL
  const cardId = await uniqueCardId();
  const url = `${APP_URL}/c/${cardId}`;

  const card = await prisma.nfcCard.create({
    data: { cardId, username, url, status: "ACTIVE" },
  });

  return NextResponse.json({
    cardId: card.cardId,
    username: card.username,
    url: card.url,
    name: digitalCard.user.name,
  });
}
