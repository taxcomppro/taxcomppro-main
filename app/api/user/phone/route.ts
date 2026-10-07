import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPhoneNumber, normalizePhoneNumber } from "@/lib/phone-number";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true } });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  return NextResponse.json({ required: !hasPhoneNumber(user.phone) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const phone = normalizePhoneNumber(body?.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid 10-digit phone number, including your area code." }, { status: 400 });
  try {
    await prisma.user.update({ where: { id: session.user.id }, data: { phone }, select: { id: true } });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "We couldn't save your number. Please try again." }, { status: 503 });
  }
}
