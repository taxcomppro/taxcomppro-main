"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { hasPhoneNumber } from "@/lib/phone-number";
import PhoneCapture from "./PhoneCapture";

export default function PhoneRequirementGate({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const id = session?.user?.id;
  const phone = (session?.user as { phone?: string | null } | undefined)?.phone;
  const exempt = pathname === "/complete-profile" || ["/privacy", "/terms", "/cookie-policy", "/login", "/forgot-password", "/reset-password"].includes(pathname);
  const [result, setResult] = useState<{ id: string; required: boolean } | null>(null);

  useEffect(() => {
    // Normal sessions already contain phone. Only resolve older/partial sessions in the background.
    if (!id || exempt || phone !== undefined) return;
    const controller = new AbortController();
    fetch("/api/user/phone", { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("Phone status unavailable"); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setResult({ id, required: data.required === true }); })
      .catch(() => { /* Protected pages and mutations also enforce the requirement on the server. */ });
    return () => controller.abort();
  }, [id, exempt, phone]);

  if (!id || exempt) return children;
  const required = phone !== undefined ? !hasPhoneNumber(phone) : result?.id === id && result.required;
  if (required) return <PhoneCapture returnTo={typeof window === "undefined" ? pathname : pathname + window.location.search + window.location.hash} />;
  return children;
}
