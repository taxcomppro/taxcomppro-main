"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SellerSetupState = "checking" | "unconnected" | "incomplete" | "pending" | "review" | "ready" | "error";
export function useSellerSetup(userId: string | undefined) {
  const [state, setState] = useState<SellerSetupState>("checking");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const connectLock = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const id = ++request.current;
    setState("checking");
    setError("");
    try {
      const response = await fetch("/api/seller/stripe-connect", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || typeof data.onboarded !== "boolean") throw new Error("Unable to check Stripe status.");
      if (id !== request.current) return;
      setState(data.accountDetails?.requiresSetupReview ? "review" :
        data.connected && data.onboarded ? "ready" :
        !data.connected ? "unconnected" :
        data.accountDetails?.pendingVerification ? "pending" : "incomplete");
    } catch {
      if (id === request.current) setState("error");
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void refresh(); });
    const recheck = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", recheck);
    window.addEventListener("online", recheck);
    return () => { active = false; request.current++; window.removeEventListener("focus", recheck); window.removeEventListener("online", recheck); };
  }, [refresh]);

  const connect = useCallback(async (returnUrl: string, saveDraft: () => boolean) => {
    if (connectLock.current) return;
    if (!saveDraft()) { setError("Save your draft before leaving this page. Your content is still here."); return; }
    if (state === "checking" || state === "error" || state === "pending") { await refresh(); return; }
    if (state === "review") { window.location.assign("/contact?topic=stripe-setup"); return; }
    connectLock.current = true;
    setConnecting(true);
    setError("");
    try {
      const response = await fetch("/api/seller/stripe-connect", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnUrl }),
      });
      const data = await response.json();
      if (data.code === "STRIPE_SETUP_REVIEW_REQUIRED") { setState("review"); return; }
      if (!response.ok || !data.url) throw new Error(data.error || "We couldn't open Stripe. Your draft is saved; please try again.");
      window.location.assign(data.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to open Stripe. Please try again.");
    } finally { connectLock.current = false; setConnecting(false); }
  }, [state, refresh]);

  return { state, ready: state === "ready", connecting, error, refresh, connect };
}
