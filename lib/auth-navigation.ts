// Keep identical across independently deployed web apps. See scripts/test-shared-auth.cjs.
export const productionAuthOrigins = [
  "https://taxcomppro.com", "https://www.taxcomppro.com",
  "https://academy.taxcomppro.com", "https://proconnect.taxcomppro.com",
  "https://30daylaunch.taxcomppro.com", "https://auditplaybook.taxcomppro.com",
  "https://irsfinedefense.taxcomppro.com", "https://schedulecrecon.taxcomppro.com",
  "https://credits.taxcomppro.com", "https://affiliate.taxcomppro.com",
  "https://staffaudit.taxcomppro.com", "https://staffauditready.taxcomppro.com",
  "https://staff-audit.taxcomppro.com", "https://staff-audit-ready.taxcomppro.com",
  "https://ultimate.taxcomppro.com", "https://ultimateplus.taxcomppro.com",
];
export const authOrigins = [
  ...productionAuthOrigins,
  ...(process.env.NODE_ENV !== "production"
    ? [3000,3001,3003,3004,3005,3006,3007,3008,3009,3010,3011].map(port => `http://localhost:${port}`)
    : []),
];

// Never pass an unchecked query parameter to navigation or an OAuth callback.
export function safeAuthReturn(value: string | null | undefined, fallback = "/feed"): string {
  if (!value || /[\\\u0000-\u0020\u007f]/.test(value) || /%2f|%5c|%0[ad]/i.test(value.split(/[?#]/)[0])) return fallback;
  const relative = value.startsWith("/") && !value.startsWith("//");
  if (!relative && !/^https?:\/\//.test(value)) return fallback;
  try {
    const url = new URL(value, "https://www.taxcomppro.com");
    if (url.username || url.password || (!relative && !authOrigins.includes(url.origin))) return fallback;
    if (/^\/(?:login|register|sign-in|sign-up|forgot-password|reset-password|api)(?:\/|$)/i.test(decodeURIComponent(url.pathname))) return fallback;
    return relative ? url.pathname + url.search + url.hash : url.href;
  } catch { return fallback; }
}

export function accountUrl(path: string, next: string): string {
  return `${path}?next=${encodeURIComponent(next)}`;
}

// One cookie name/prefix (Better Auth default) and scope across every web app.
export const sharedCookieOptions = {
  crossSubDomainCookies: {
    enabled: process.env.NODE_ENV === "production",
    domain: process.env.NODE_ENV === "production" ? ".taxcomppro.com" : undefined,
  },
  crossSubdomainCookies: {
    enabled: process.env.NODE_ENV === "production",
    domain: process.env.NODE_ENV === "production" ? ".taxcomppro.com" : undefined,
  },
  defaultCookieAttributes: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    domain: process.env.NODE_ENV === "production" ? ".taxcomppro.com" : undefined,
  },
};
