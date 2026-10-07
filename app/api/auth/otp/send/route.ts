import { enforceRateLimit } from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createOtp, normalizeEmail, OTP_TTL_MINUTES } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

const bodySchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().trim().min(1).max(120).optional(),
});

export async function POST(request: NextRequest) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const limited = await enforceRateLimit(`email:${email}`, { key: "otp-address", limit: 5, seconds: 3600 });
  if (limited) return limited;

  // An address that already has an account should go to sign-in, not get a new code.
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in instead.", code: "email_taken" },
      { status: 409 }
    );
  }

  const result = await createOtp(email);
  if (!result.ok || !result.code) {
    return NextResponse.json(
      { error: `Please wait ${result.retryAfter ?? 60} seconds before requesting another code.`, retryAfter: result.retryAfter },
      { status: 429 }
    );
  }

  try {
    await sendOtpEmail({
      to: email,
      code: result.code,
      userName: parsed.data.name,
      expiresInMinutes: OTP_TTL_MINUTES,
    });
  } catch (err) {
    console.error("[OTP] Failed to send verification email:", err);
    return NextResponse.json(
      { error: "We could not send the verification email. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, expiresInMinutes: OTP_TTL_MINUTES });
}
