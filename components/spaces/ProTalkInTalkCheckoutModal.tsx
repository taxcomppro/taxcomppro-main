"use client";

import React, { useState } from "react";
import {
  ShoppingBag01Icon as ShoppingBag,
  CheckmarkCircle02Icon as CheckCircle2,
  LockIcon as Lock,
  Cancel01Icon as X,
  Loading03Icon as Loader2,
  AlertCircleIcon as AlertCircle,
  SparklesIcon as Sparkles,
  CheckmarkBadge01Icon as VerifiedBadge,
} from "hugeicons-react";
import "./pro-talk-product.css";

interface ProTalkInTalkCheckoutModalProps {
  spaceId: string;
  product: any;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onPurchased: () => void;
}

export default function ProTalkInTalkCheckoutModal({
  spaceId,
  product,
  isOpen,
  onClose,
  currentUser,
  onPurchased,
}: ProTalkInTalkCheckoutModalProps) {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  if (!isOpen || !product) return null;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          listingId: product.listingId || product.id,
          sellerId: product.user?.id || product.seller?.id,
          subtotal: product.price || 0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(data);
      } else {
        setCouponError(data.error || "Invalid promo code");
      }
    } catch (err: any) {
      setCouponError(err.message || "Failed to validate code");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleExecutePurchase = async () => {
    setCheckingOut(true);
    setCheckoutError("");
    try {
      const res = await fetch("/api/stripe/marketplace-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: product.listingId || product.id,
          couponCode: appliedCoupon?.code || (couponCode.trim() ? couponCode.trim() : undefined),
          source: "PRO_TALK",
          networkId: spaceId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Checkout failed.");
      }

      if (data.isFree || data.success) {
        setPurchaseSuccess(true);
        onPurchased();
        setTimeout(() => {
          onClose();
        }, 2200);
        return;
      }

      if (data.url) {
        // Open Stripe Connect checkout in new window so talk audio/video stays live!
        window.open(data.url, "_blank");
        onClose();
        return;
      }

      if (data.alreadyPurchased) {
        setPurchaseSuccess(true);
        onPurchased();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setCheckoutError(err.message || "An unexpected error occurred.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="pt-product-modal-overlay">
      <div className="pt-product-modal-panel max-w-md">
        {/* Modal Header */}
        <div className="pt-product-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                Live Pro Talk Checkout
              </h3>
              <p className="text-[11px] text-slate-400">
                Purchase without leaving this live session
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="pt-product-modal-body space-y-4">
          {purchaseSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-white">
                Purchase Complete! 🎉
              </h4>
              <p className="text-xs text-slate-300">
                You now have full access to &ldquo;{product.title}&rdquo;.
              </p>
            </div>
          ) : (
            <>
              {checkoutError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Product Info */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <img
                  src={product.images?.[0] || "/courses-hero.webp"}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white/10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/courses-hero.webp";
                  }}
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">
                    {product.category || "Marketplace Product"}
                  </span>
                  <h4 className="text-xs font-black text-white line-clamp-2 mt-0.5">
                    {product.title}
                  </h4>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <span>Seller: {product.user?.name || product.seller?.name || "Host"}</span>
                    <VerifiedBadge className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Promo Code Field */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Have a Promo / Discount Code?
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="ENTER CODE (e.g. LIVE2026)"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setAppliedCoupon(null);
                      setCouponError("");
                    }}
                    className="flex-1 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-white uppercase placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/10 transition-all disabled:opacity-50"
                  >
                    {applyingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                  </button>
                </div>

                {appliedCoupon && (
                  <div className="mt-1.5 text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Promo applied: {appliedCoupon.discountFormatted || "Discount Applied"}</span>
                  </div>
                )}
                {couponError && (
                  <p className="mt-1 text-xs text-rose-400">{couponError}</p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Price</span>
                  <span className="font-bold text-white">
                    {product.price ? `$${product.price.toFixed(2)}` : "FREE"}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>Discount</span>
                    <span className="font-bold">
                      -{appliedCoupon.discountFormatted || "Applied"}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm">
                  <span className="font-bold text-white">Total</span>
                  <span className="font-black text-amber-400 text-base">
                    {appliedCoupon?.finalPrice !== undefined
                      ? appliedCoupon.finalPrice <= 0
                        ? "FREE"
                        : `$${appliedCoupon.finalPrice.toFixed(2)}`
                      : product.price
                      ? `$${product.price.toFixed(2)}`
                      : "FREE"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Secure Stripe Connect checkout. Your live talk stream will stay active.</span>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!purchaseSuccess && (
          <div className="pt-product-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecutePurchase}
              disabled={checkingOut}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {checkingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {(product.price ?? 0) <= 0 ? "Claim Free Item" : "Complete Purchase"}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
