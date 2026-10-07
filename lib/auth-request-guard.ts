import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/request-security";

/** Bound credential bodies and limit attempts against an account across different IPs. */
export async function guardAuthRequest(request: NextRequest) {
  const path = decodeURIComponent(request.nextUrl.pathname).replace(/\/+$/, "");
  if (!/^\/api\/auth\/(?:sign-in\/email|request-password-reset|forget-password|reset-password)$/.test(path)) return null;
  const reader = request.clone().body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 65536) {
        void reader.cancel();
        return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
      }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    if (email && email.length <= 254) {
      const reset = !path.endsWith("/sign-in/email");
      return enforceRateLimit(`email:${email}`, { key: reset ? "password-reset-address" : "login-address", limit: reset ? 5 : 25, seconds: 900 });
    }
  } catch { /* Better Auth returns its normal validation error for invalid input. */ }
  finally { reader.releaseLock(); }
  return null;
}
