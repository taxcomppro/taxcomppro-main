import { createHmac, randomInt } from "node:crypto";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOrigins } from "@/lib/auth-navigation";

export type RatePolicy = { key: string; limit: number; seconds: number };
const namespace = "tcp-rate-limit-v1";

export function clientNetwork(headers: Headers): string {
  // Only trust a header that the hosting proxy overwrites, never arbitrary client headers.
  const header = process.env.VERCEL === "1" ? "x-vercel-forwarded-for" : process.env.TRUSTED_PROXY_IP_HEADER;
  const value = header ? headers.get(header)?.split(",")[0]?.trim() : null;
  if (!value || !isIP(value)) return "unknown-network";
  if (isIP(value) === 4) return value;
  const canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const [left, right] = canonical.split("::");
  const first = left ? left.split(":") : [];
  const last = right ? right.split(":") : [];
  const full = canonical.includes("::") ? [...first, ...Array(8 - first.length - last.length).fill("0"), ...last] : first;
  // IPv4-mapped IPv6 addresses share the IPv4 bucket.
  if (full.slice(0, 5).every(part => parseInt(part, 16) === 0) && parseInt(full[5], 16) === 65535) {
    return [parseInt(full[6], 16) >> 8, parseInt(full[6], 16) & 255, parseInt(full[7], 16) >> 8, parseInt(full[7], 16) & 255].join(".");
  }
  return full.slice(0, 4).map(part => parseInt(part, 16).toString(16)).join(":") + "::/64";
}

export function ratePolicy(path: string, method: string): RatePolicy {
  if (/^\/api\/auth\/(?:sign-in|sign-up|forget-password|request-password-reset|reset-password)/.test(path)) return { key: "credentials", limit: 12, seconds: 900 };
  if (path === "/api/user/phone" && method !== "GET") return { key: "phone-setup", limit: 10, seconds: 600 };
  if (path === "/api/auth/otp/send") return { key: "otp-send", limit: 15, seconds: 3600 };
  if (path === "/api/auth/otp/verify") return { key: "otp-verify", limit: 30, seconds: 900 };
  if (path.startsWith("/api/upload") || path === "/api/user/voice-memo") return { key: "uploads", limit: 40, seconds: 600 };
  if (path === "/api/atlas-chat") return { key: "ai", limit: 20, seconds: 60 };
  if (/checkout|stripe-connect|\/refund$|coupons\/validate|\/payout$/.test(path)) return { key: "payments", limit: 30, seconds: 300 };
  if (/export-attendees|\/admin\/pro-talks\/attendance/.test(path)) return { key: "exports", limit: 20, seconds: 60 };
  if (/guest-token|\/token$|\/invite|\/send|message-blast|sync-irs|auto-init/.test(path) && method !== "OPTIONS") return { key: "sensitive", limit: 30, seconds: 300 };
  return ["GET", "HEAD", "OPTIONS"].includes(method) ? { key: "reads", limit: 900, seconds: 60 } : { key: "writes", limit: 120, seconds: 60 };
}

/** Atomic database counter shared by all server instances. No in-memory fallback. */
export async function consumeRateLimit(identity: string, policy: RatePolicy) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("Rate limit secret unavailable");
  const id = namespace + ":" + createHmac("sha256", secret || "local-development").update(`${policy.key}:${identity}`).digest("hex");
  const rows = await prisma.$queryRaw<{ value: string; expiresAt: Date }[]>`
    INSERT INTO "verifications" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
    VALUES (${id}, ${namespace}, '1', NOW() + ${policy.seconds} * INTERVAL '1 second', NOW(), NOW())
    ON CONFLICT ("id") DO UPDATE SET
      "value" = CASE WHEN "verifications"."expiresAt" <= NOW() THEN '1'
        ELSE LEAST("verifications"."value"::integer + 1, ${policy.limit + 1})::text END,
      "expiresAt" = CASE WHEN "verifications"."expiresAt" <= NOW() THEN NOW() + ${policy.seconds} * INTERVAL '1 second'
        ELSE "verifications"."expiresAt" END,
      "updatedAt" = NOW()
    RETURNING "value", "expiresAt"
  `;
  const row = rows[0];
  if (!row) throw new Error("Rate limit counter unavailable");
  // Bounded cleanup only touches our namespace, never authentication tokens.
  if (randomInt(100) === 0) await prisma.$executeRaw`
    DELETE FROM "verifications" WHERE "id" IN (
      SELECT "id" FROM "verifications" WHERE "identifier" = ${namespace}
        AND "expiresAt" < NOW() - INTERVAL '1 day' LIMIT 500
    )
  `.catch(() => {});
  return { allowed: Number(row.value) <= policy.limit, remaining: Math.max(0, policy.limit - Number(row.value)), retryAfter: Math.max(1, Math.ceil((row.expiresAt.getTime() - Date.now()) / 1000)) };
}

export async function enforceRateLimit(identity: string, policy: RatePolicy) {
  try {
    const result = await consumeRateLimit(identity, policy);
    if (result.allowed) return null;
    return NextResponse.json({ error: "Too many requests. Please wait and try again.", code: "RATE_LIMITED", retryAfter: result.retryAfter }, { status: 429, headers: { "Retry-After": String(result.retryAfter), "X-RateLimit-Limit": String(policy.limit), "X-RateLimit-Remaining": "0", "Cache-Control": "private, no-store" } });
  } catch {
    console.error("[security] Shared rate limiter unavailable", policy.key);
    return NextResponse.json({ error: "This service is temporarily unavailable. Please try again shortly.", code: "TEMPORARILY_UNAVAILABLE" }, { status: 503, headers: { "Retry-After": "30", "Cache-Control": "private, no-store" } });
  }
}

export function trustedMutation(request: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const allowed = new Set(authOrigins);
  for (const raw of [process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`]) {
    if (raw) { try { allowed.add(new URL(raw).origin); } catch { /* Ignore invalid configuration. */ } }
  }
  if (process.env.NODE_ENV !== "production") allowed.add(request.nextUrl.origin);
  const origin = request.headers.get("origin");
  if (origin) return allowed.has(origin);
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const referer = request.headers.get("referer");
  if (referer) { try { return allowed.has(new URL(referer).origin); } catch { return false; } }
  // Cookie-authenticated writes must identify their browser origin. Server clients without cookies still require route-level authentication.
  return !request.headers.has("cookie");
}

export async function protectApiRequest(request: NextRequest, authenticatedUser?: () => Promise<string | undefined>) {
  let path: string;
  try { path = decodeURIComponent(request.nextUrl.pathname).replace(/\/+$/, ""); }
  catch { return NextResponse.json({ error: "Invalid request path" }, { status: 400 }); }
  // Exact exemptions: Stripe validates its signature; cron routes verify their bearer secret.
  if (path === "/api/stripe/webhook" || path === "/api/cron/specialists" || path === "/api/cron/academy-membership") return null;
  // Better Auth validates its own callback origins, including OAuth provider responses.
  if ((!path.startsWith("/api/auth/") || path.startsWith("/api/auth/otp/")) && !trustedMutation(request)) {
    return NextResponse.json({ error: "Request origin is not allowed" }, { status: 403 });
  }
  const declaredSize = Number(request.headers.get("content-length") || 0);
  const multipart = request.headers.get("content-type")?.startsWith("multipart/form-data");
  const maxSize = multipart ? 50 * 1024 * 1024 : 1024 * 1024;
  if (!Number.isFinite(declaredSize) || declaredSize < 0 || declaredSize > maxSize) return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
  const policy = ratePolicy(path, request.method);
  const limited = await enforceRateLimit(`network:${clientNetwork(request.headers)}`, policy);
  if (limited) return limited;
  if (authenticatedUser && ["uploads", "ai", "payments", "exports", "sensitive"].includes(policy.key)) {
    try {
      const id = await authenticatedUser();
      if (id) return enforceRateLimit(`user:${id}`, policy);
    } catch {
      return NextResponse.json({ error: "Unable to verify your session. Please retry." }, { status: 503, headers: { "Retry-After": "30" } });
    }
  }
  return null;
}
