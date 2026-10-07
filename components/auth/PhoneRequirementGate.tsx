"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import PhoneCapture from "./PhoneCapture";

export default function PhoneRequirementGate({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const id = session?.user?.id;
  const exempt = pathname === "/complete-profile" || ["/privacy", "/terms", "/cookie-policy", "/login", "/forgot-password", "/reset-password"].includes(pathname);
  const [result, setResult] = useState<{ id: string; required: boolean } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!id || exempt) return;
    const controller = new AbortController();
    fetch("/api/user/phone", { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("Phone status unavailable"); return response.json(); })
      .then(data => { if (!controller.signal.aborted) { setResult({ id, required: data.required }); setError(false); } })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [id, exempt, retry]);
  if (!id || exempt) return children;
  if (error) return <main className="phone-setup"><section className="phone-setup-card"><h1>We couldn’t check your account</h1><p>Please try again to continue.</p><button className="phone-setup-submit" onClick={() => { setError(false); setRetry(value => value + 1); }}>Try again</button></section></main>;
  if (result?.id !== id) return <main className="phone-setup" role="status">Checking your account…</main>;
  if (result.required) return <PhoneCapture returnTo={typeof window === "undefined" ? pathname : pathname + window.location.search + window.location.hash} />;
  return children;
}
