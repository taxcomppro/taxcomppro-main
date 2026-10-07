import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Email OTP for registration.
 *
 * Reuses the existing `Verification` table (identifier / value / expiresAt) so this
 * needs no Prisma migration. Codes are never stored in plaintext - only a peppered
 * SHA-256 digest is persisted.
 */

const OTP_TTL_MS = 10 * 60 * 1000;          // code is valid for 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;       // one send per minute per address
const MAX_ATTEMPTS = 5;

const OTP_PREFIX = "email-otp:";

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = OTP_TTL_MS / 60000;
export const OTP_RESEND_COOLDOWN_SECONDS = RESEND_COOLDOWN_MS / 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Cryptographically uniform 6-digit code (no modulo bias, leading zeros allowed). */
function generateCode(): string {
  const max = 10 ** OTP_LENGTH;
  const limit = Math.floor(0xffffffff / max) * max;
  let n: number;
  do {
    n = crypto.randomBytes(4).readUInt32BE(0);
  } while (n >= limit);
  return String(n % max).padStart(OTP_LENGTH, "0");
}

function hashCode(email: string, code: string): string {
  const pepper = process.env.BETTER_AUTH_SECRET || "";
  return crypto.createHash("sha256").update(`${email}:${code}:${pepper}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

interface StoredOtp {
  hash: string;
  attempts: number;
}

export interface CreateOtpResult {
  ok: boolean;
  code?: string;
  /** Seconds the caller must wait before requesting another code. */
  retryAfter?: number;
}

/**
 * Issues a fresh code for `email`, replacing any outstanding one.
 * Returns `ok: false` with `retryAfter` while the resend cooldown is active.
 */
export async function createOtp(email: string): Promise<CreateOtpResult> {

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"email-otp:" + normalizeEmail(email)}))`;
  const identifier = OTP_PREFIX + normalizeEmail(email);

  const existing = await tx.verification.findFirst({
    where: { identifier },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const age = Date.now() - existing.createdAt.getTime();
    if (age < RESEND_COOLDOWN_MS) {
      return { ok: false, retryAfter: Math.ceil((RESEND_COOLDOWN_MS - age) / 1000) };
    }
  }

  const code = generateCode();
  const payload: StoredOtp = { hash: hashCode(normalizeEmail(email), code), attempts: 0 };

  // Replace rather than accumulate, so only the newest code is ever live.
  await tx.verification.deleteMany({ where: { identifier } });
  await tx.verification.create({
    data: {
      identifier,
      value: JSON.stringify(payload),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  return { ok: true, code };
  });
}

export type VerifyOtpReason = "invalid" | "expired" | "too_many_attempts" | "not_found";

export interface VerifyOtpResult {
  ok: boolean;
  reason?: VerifyOtpReason;
  attemptsLeft?: number;
}

/**
 * Checks a submitted code. Wrong guesses are counted and the code is burned after
 * MAX_ATTEMPTS. On success the code is consumed so it cannot be replayed.
 */
export async function verifyOtp(email: string, code: string): Promise<VerifyOtpResult> {

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"email-otp:" + normalizeEmail(email)}))`;
  const normalized = normalizeEmail(email);
  const identifier = OTP_PREFIX + normalized;

  const row = await tx.verification.findFirst({
    where: { identifier },
    orderBy: { createdAt: "desc" },
  });

  if (!row) return { ok: false, reason: "not_found" };

  if (row.expiresAt.getTime() < Date.now()) {
    await tx.verification.deleteMany({ where: { identifier } });
    return { ok: false, reason: "expired" };
  }

  let stored: StoredOtp;
  try {
    stored = JSON.parse(row.value) as StoredOtp;
  } catch {
    await tx.verification.deleteMany({ where: { identifier } });
    return { ok: false, reason: "not_found" };
  }

  if (stored.attempts >= MAX_ATTEMPTS) {
    await tx.verification.deleteMany({ where: { identifier } });
    return { ok: false, reason: "too_many_attempts" };
  }

  const submitted = code.replace(/\D/g, "");
  if (!safeEqual(hashCode(normalized, submitted), stored.hash)) {
    const attempts = stored.attempts + 1;
    await tx.verification.update({
      where: { id: row.id },
      data: { value: JSON.stringify({ ...stored, attempts }) },
    });
    const attemptsLeft = MAX_ATTEMPTS - attempts;
    if (attemptsLeft <= 0) {
      await tx.verification.deleteMany({ where: { identifier } });
      return { ok: false, reason: "too_many_attempts", attemptsLeft: 0 };
    }
    return { ok: false, reason: "invalid", attemptsLeft };
  }

  // Correct code: burn it so it cannot be replayed. The caller creates the account
  // in the same request, so no separate proof-of-verification marker is needed.
  await tx.verification.deleteMany({ where: { identifier } });

  return { ok: true };
  });
}
