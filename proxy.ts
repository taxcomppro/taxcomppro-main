import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { protectApiRequest } from "@/lib/request-security";

// Pages anyone can visit without being logged in
const PUBLIC_PAGES = new Set([
  "/",
  "/login",
  "/sign-in",
  "/sign-up",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/about",
  "/terms",
  "/privacy",
  "/cookie-policy",
  "/community-guidelines",
  "/contact",
  "/courses",
  "/toolkits",
  "/tools",
  "/connect",
  "/verify-certificate",
  "/security",
  "/find-a-pro",
  "/pro-talks",
  "/upgrade",
  "/unsubscribe",
]);

// Prefix-based public paths (any sub-path is also public)
const PUBLIC_PREFIXES = [
  "/member/",
  "/courses/",
  "/toolkits/",
  "/tools/",
  "/connect/",
  "/verify-certificate/",
  "/find-a-pro/",
  "/pro-talks/",
  "/upgrade/",
  "/reset-password/",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PAGES.has(pathname) || PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

function nextResponseWithReferralCookie(request: NextRequest) {
  const response = NextResponse.next();
  const ref = request.nextUrl.searchParams.get("ref");

  if (ref && /^[a-zA-Z0-9_-]{6,32}$/.test(ref)) {
    response.cookies.set("ref_code", ref, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  }

  return response;
}

export async function proxy(request: NextRequest) {
  let pathname: string;
  try { pathname = decodeURIComponent(request.nextUrl.pathname); }
  catch { return NextResponse.json({ error: "Invalid request path" }, { status: 400 }); }

  // Email sign-up must go through /api/auth/otp/verify, which only creates the account
  // after the emailed code is accepted. Blocking better-auth's public sign-up endpoint
  // stops that check being skipped. The OTP route calls auth.api.signUpEmail in-process,
  // so it never crosses this HTTP path. Google OAuth uses /api/auth/callback/* and is
  // unaffected: Google has already verified the address.
  if (pathname.replace(/\/$/, "") === "/api/auth/sign-up/email" && request.method === "POST") {
    return NextResponse.json(
      { message: "Email verification is required. Start at /register." },
      { status: 403 }
    );
  }

  // API protection runs before prefetch/static shortcuts; client headers cannot bypass it.
  if (pathname.startsWith("/api/")) {
    const rejected = await protectApiRequest(request, async () => (await auth.api.getSession({ headers: request.headers }))?.user?.id);
    return rejected || NextResponse.next();
  }

  // Static assets pass through. Route handlers retain their own authorization.
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Do not issue middleware redirects for client prefetch requests
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("x-middleware-prefetch") === "1";

  if (isPrefetch) {
    return NextResponse.next();
  }

  // Public pages must not depend on a database-backed session lookup. This
  // prevents a temporary auth/database issue from taking down public content.
  if (isPublicPath(pathname)) {
    return nextResponseWithReferralCookie(request);
  }

  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;

  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      message: "Proxy session lookup failed",
      pathname,
      requestId: request.headers.get("x-vercel-id"),
      error: error instanceof Error ? error.message : String(error),
    }));

    // Fail closed for protected content, but return a usable page instead of a
    // platform 500. /login is public, so this redirect cannot recurse.
    const dest = new URL("/login", request.url);
    dest.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(dest);
  }

  if (!session) {
    const dest = new URL("/login", request.url);
    dest.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(dest);
  }

  // Admin-only routes
  if (pathname.startsWith("/admin")) {
    const u = session?.user as unknown as { role?: string } | undefined;
    if (!session || u?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/feed", request.url));
    }
  }

  return nextResponseWithReferralCookie(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
