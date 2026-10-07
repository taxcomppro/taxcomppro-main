export function hasPhoneNumber(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizePhoneNumber(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40 || !/^\+?[\d\s().-]+$/.test(value.trim())) return null;
  const normalized = value.trim().replace(/[\s().-]/g, "");
  // Member numbers without a country prefix default to the US/Canada calling code.
  if (/^\d{10}$/.test(normalized)) return `+1${normalized}`;
  if (/^1\d{10}$/.test(normalized)) return `+${normalized}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

export function phoneReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]|%2f|%5c|%0[ad]/i.test(value)) return "/feed";
  const pathname = value.split(/[?#]/)[0];
  if (pathname === "/" || /^\/(?:complete-profile|api|login|register|sign-in|sign-up)(?:\/|$)/i.test(pathname)) return "/feed";
  return value;
}
