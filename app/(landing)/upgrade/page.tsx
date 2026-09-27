"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { Tick02Icon, LockKeyIcon, ArrowRight01Icon, ArrowDown01Icon } from "hugeicons-react";
import { useAppSelector } from "@/store/hooks";

import { PRICING_PLANS, TIER_RANK, PlanTier } from "@/lib/pricing-plans";
import PricingCard, { DiscountInfo } from "@/components/pricing/PricingCard";
import "@/components/landing/member-pages.css";
import { Tag, Sparkles, X, Check, Loader2, AlertCircle } from "lucide-react";

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const checkoutPending = useRef(false);
  const { user, isLoading } = useAppSelector((s) => s.auth);
  const userTier = (user?.tier as PlanTier) ?? "FREE";
  const userRank = TIER_RANK[userTier] ?? 0;

  // Promo code state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountInfo | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [showPromoInput, setShowPromoInput] = useState(false);

  const handleApplyCoupon = async (codeToTry?: string) => {
    const raw = (codeToTry ?? couponCode).trim().toUpperCase();
    if (!raw) {
      setCouponError("Please enter a promo code");
      setCouponSuccess("");
      setAppliedCoupon(null);
      return;
    }
    setCouponLoading(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: raw,
          tier: "VIP",
        }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        const info: DiscountInfo = {
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
          durationMonths: data.durationMonths,
          label: data.label,
          savings: data.savings,
        };
        setAppliedCoupon(info);
        setCouponCode(data.code);
        setCouponSuccess(`✓ Promo code "${data.code}" applied: ${data.label}!`);
        setCouponError("");
      } else {
        setAppliedCoupon(null);
        setCouponError(data.error || "Invalid or expired promo code");
        setCouponSuccess("");
      }
    } catch {
      setAppliedCoupon(null);
      setCouponError("Failed to validate promo code. Please try again.");
      setCouponSuccess("");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
    setCouponSuccess("");
  };

  const handleUpgrade = async (tier: PlanTier) => {
    if (checkoutPending.current) return;
    checkoutPending.current = true;
    setLoading(tier);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          couponCode: (appliedCoupon?.code || couponCode).trim() || undefined,
        }),
      });
      if (res.status === 401) {
        window.location.assign("/login?next=%2Fupgrade");
        return;
      }
      const data = await res.json();
      if (!res.ok || typeof data.url !== "string" || !data.url) {
        throw new Error("Checkout could not be started. Please try again or contact support.");
      }
      window.location.assign(data.url);
    } catch {
      setError("Checkout could not be started. Please try again or contact support.");
    } finally {
      checkoutPending.current = false;
      setLoading(null);
    }
  };

  return (
    <div className="mp-page pricing-page">
      <div className="mp-container">
        <header className="mp-hero">
          <p className="mp-eyebrow">Memberships for your next chapter</p>
          <h1>
            Upgrade your plan.
            <br />
            <span>Move your practice forward.</span>
          </h1>
          <p>All paid plans include 2 months free community access. Cancel anytime.</p>
          <div className="mp-hero-links">
            <a href="#plans">
              Explore plans <ArrowDown01Icon size={18} />
            </a>
            <Link href="/contact">
              Need help choosing? <ArrowRight01Icon size={18} />
            </Link>
          </div>
        </header>

        <section id="plans" aria-label="Membership plans">
          <div className="pricing-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p>Find the right fit for your practice</p>
              <span>Monthly memberships · USD</span>
            </div>

            {/* Promo Code Input Trigger / Toggle */}
            <div className="flex items-center gap-2">
              {!showPromoInput && !appliedCoupon ? (
                <button
                  type="button"
                  onClick={() => setShowPromoInput(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Have a promo code?</span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Tag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="PROMO CODE"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          if (couponError) setCouponError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        className="bg-white dark:bg-[#0c1a2e] text-[#0a1628] dark:text-white border border-slate-300 dark:border-white/20 rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono uppercase tracking-wider outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                      />
                    </div>
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="px-3 py-1.5 rounded-xl border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={couponLoading || !couponCode.trim()}
                        onClick={() => handleApplyCoupon()}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {couponLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>Apply</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {couponSuccess && (
            <div className="mb-4 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-4 py-2.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{couponSuccess}</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-emerald-600 dark:text-emerald-400 hover:underline text-[11px] cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}

          {couponError && (
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl px-4 py-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{couponError}</span>
            </div>
          )}

          {error && (
            <div className="mp-error" role="alert">
              {error} <Link href="/contact">Contact support</Link>
            </div>
          )}

          <div className="pricing-grid">
            {PRICING_PLANS.map((plan) => {
              const isCurrent = !!user && userTier === plan.tier;
              const included = !!user && (TIER_RANK[plan.tier] ?? 0) < userRank;
              return (
                <PricingCard
                  key={plan.tier}
                  plan={plan}
                  mode="upgrade"
                  isCurrent={isCurrent}
                  included={included}
                  user={user}
                  isLoading={isLoading}
                  upgradeLoadingTier={loading}
                  discountInfo={appliedCoupon}
                  onUpgrade={handleUpgrade}
                  expanded={expanded}
                />
              );
            })}
          </div>
          <div className="pricing-compare">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-controls={PRICING_PLANS.map((p) => `features-${p.tier}`).join(" ")}
            >
              {expanded ? "Show key features" : "Compare all plan features"}
              <ArrowDown01Icon size={18} className={expanded ? "mp-rotate" : ""} />
            </button>
          </div>
        </section>
        <div className="pricing-trust"><LockKeyIcon size={21} aria-hidden="true" /><p>Secure payments powered by <strong>Stripe</strong>. Cancel anytime. No hidden fees.</p><Link href="/contact">Contact support <ArrowRight01Icon size={17} /></Link></div>
        <section className="mp-faq" aria-labelledby="pricing-faq">
          <div><p className="mp-eyebrow">A little clarity</p><h2 id="pricing-faq">Before you choose.</h2><p>Have a question about the right membership for your practice? <Link href="/contact">Talk to our team.</Link></p></div>
          <div className="mp-faq-items">
            <details><summary>Can I get started for free?<ArrowDown01Icon size={18} /></summary><p>Yes. Basic membership includes email support, member directory access, and view access to the marketplace and groups. Create an account to get started.</p></details>
            <details><summary>Which plan is right for my practice?<ArrowDown01Icon size={18} /></summary><p>Choose VIP for training and professional connections. The Marketplace Bundle adds a professional listing and seller profile. Marketplace Plus adds live audio and video hosting and the ability to post ads, products, and services.</p></details>
            <details><summary>How am I billed?<ArrowDown01Icon size={18} /></summary><p>Paid plans are monthly memberships, with prices shown in US dollars. Review your payment details in Stripe checkout before confirming your subscription.</p></details>
            <details><summary>Can I cancel my membership?<ArrowDown01Icon size={18} /></summary><p>You can cancel anytime. Contact support if you need help with your membership or billing.</p></details>
          </div>
        </section>
      </div>
    </div>
  );
}


