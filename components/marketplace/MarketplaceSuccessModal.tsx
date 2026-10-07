"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clearMarketplaceCart } from "@/lib/marketplace-cart";
import { CheckCircle2, Sparkles, X, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export function MarketplaceSuccessModal() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const stripeAccount = searchParams.get("stripe_account");
  const isSuccess = searchParams.get("checkout_success") === "true" || searchParams.get("success") === "true";
  const [dismissedSession, setDismissedSession] = useState<string | null>(null);
  const [result, setResult] = useState<{ sessionId: string; error: string | null } | null>(null);
  const isOpen = isSuccess && !!sessionId && dismissedSession !== sessionId;
  const verifying = result?.sessionId !== sessionId;
  const error = result?.sessionId === sessionId ? result.error : null;

  useEffect(() => {

    if (!isSuccess || !sessionId) return;
    let cancelled = false;
    fetch("/api/stripe/verify-session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, stripeAccount: stripeAccount || undefined }),
    }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to verify payment. Please reload to retry.");
      if (!cancelled) { clearMarketplaceCart(); setResult({ sessionId, error: null }); }
    }).catch(error => { if (!cancelled) setResult({ sessionId, error: error.message }); });
    return () => { cancelled = true; };
  }, [isSuccess, sessionId, stripeAccount]);

  if (!isOpen) return null;

  const handleClose = () => {
    setDismissedSession(sessionId);
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout_success");
    url.searchParams.delete("success");
    url.searchParams.delete("session_id");
    url.searchParams.delete("stripe_account");
    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
  };

  return (
    <div
      className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-[#0a1628] border border-[#ffbe24]/30 shadow-2xl rounded-2xl p-6 sm:p-8 max-w-md w-full text-center text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffbe24]/10 border border-[#ffbe24]/20 text-[#ffbe24] text-[11px] font-extrabold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{verifying ? "Confirming payment" : error ? "Confirmation pending" : "Payment successful"}</span>
        </div>

        <h3 className="text-xl font-bold text-white mb-2">{verifying ? "Checking your receipt" : error ? "Payment needs verification" : "Item unlocked and ready!"}</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          {verifying ? "Please wait while we confirm your payment with Stripe." : error || "Your purchase is confirmed. You can now access your listing from My Purchases."}
        </p>

        {verifying && (
          <div className="flex items-center justify-center gap-2 text-xs text-[#ffbe24] mb-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Verifying receipt &amp; notifying seller…</span>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <Link
            href="/marketplace?view=purchases"
            onClick={handleClose}
            className="w-full bg-[#ffbe24] hover:bg-[#f0b01c] text-[#0a1628] font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#ffbe24]/20 transition-all hover:-translate-y-0.5"
          >
            <span>View My Purchases</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={handleClose}
            className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs py-2.5 rounded-xl border border-white/10 transition-colors"
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
}
