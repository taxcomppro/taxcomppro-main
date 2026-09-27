"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag01Icon as ShoppingBag,
  SparklesIcon as Sparkles,
  CheckmarkCircle02Icon as CheckCircle2,
  Cancel01Icon as X,
  CrownIcon as Crown,
  ArrowRight01Icon as ChevronRight,
  Download01Icon as Download,
  Settings01Icon as Settings,
} from "hugeicons-react";
import ProTalkInTalkCheckoutModal from "./ProTalkInTalkCheckoutModal";
import "./pro-talk-product.css";

interface TaggedProductData {
  id: string;
  listingId: string;
  slug: string;
  title: string;
  description?: string | null;
  category: string;
  price: number | null;
  images: string[];
  tags?: string[];
  isNetworkExclusive?: boolean;
  isPurchased?: boolean;
  user?: {
    id: string;
    name: string;
    image?: string | null;
  };
}

interface ProTalkProductSpotlightProps {
  spaceId: string;
  taggedProduct: TaggedProductData | null;
  isHost: boolean;
  currentUser?: any;
  onOpenTagModal?: () => void;
  onUntag?: () => void;
}

export default function ProTalkProductSpotlight({
  spaceId,
  taggedProduct,
  isHost,
  currentUser,
  onOpenTagModal,
  onUntag,
}: ProTalkProductSpotlightProps) {
  const [minimized, setMinimized] = useState(false);
  const [highlightPulse, setHighlightPulse] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isPurchased, setIsPurchased] = useState(Boolean(taggedProduct?.isPurchased));

  // Trigger pulse effect when tagged product changes
  useEffect(() => {
    if (taggedProduct) {
      setHighlightPulse(true);
      setMinimized(false);
      setIsPurchased(Boolean(taggedProduct.isPurchased));
      const timer = setTimeout(() => setHighlightPulse(false), 4500);
      return () => clearTimeout(timer);
    }
  }, [taggedProduct?.id, taggedProduct?.listingId, taggedProduct?.title]);

  if (!taggedProduct) return null;

  const priceVal = taggedProduct.price ?? 0;
  const priceDisplay = priceVal > 0 ? `$${priceVal.toFixed(2)}` : "FREE";
  const coverImg = taggedProduct.images?.[0] || "/courses-hero.webp";

  if (minimized) {
    return (
      <>
        <div
          onClick={() => setMinimized(false)}
          className="pt-spotlight-minimized group"
          title="Click to view featured product spotlight"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-black text-white truncate max-w-[140px]">
            {taggedProduct.title}
          </span>
          <span className="text-[11px] font-bold text-amber-300">
            {priceDisplay}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </div>

        <ProTalkInTalkCheckoutModal
          spaceId={spaceId}
          product={taggedProduct}
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          currentUser={currentUser}
          onPurchased={() => setIsPurchased(true)}
        />
      </>
    );
  }

  return (
    <>
      <div className={`pt-spotlight-card ${highlightPulse ? "pt-spotlight-pulse" : ""}`}>
        {/* Header Bar */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
              Live Product Spotlight
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isHost && onOpenTagModal && (
              <button
                type="button"
                onClick={onOpenTagModal}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Change or untag product"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-[10px] font-bold"
              title="Minimize spotlight banner"
            >
              Minimize
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-3.5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-amber-400/30 bg-black/40">
              <img
                src={coverImg}
                alt={taggedProduct.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/courses-hero.webp";
                }}
              />
              {taggedProduct.isNetworkExclusive && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-amber-400 text-slate-950 rounded-tl flex items-center justify-center text-[8px]">
                  👑
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-black text-amber-400/90 uppercase tracking-wide">
                {taggedProduct.category || "Marketplace Product"}
              </span>
              <h4 className="text-xs font-black text-white line-clamp-2 leading-tight mt-0.5">
                {taggedProduct.title}
              </h4>
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                by {taggedProduct.user?.name || "Host"}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-semibold block">Price</span>
              <span className="text-sm font-black text-amber-400">
                {priceDisplay}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isPurchased ? (
                <Link
                  href={`/${taggedProduct.slug}`}
                  target="_blank"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Access</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(true)}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                  <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{priceVal <= 0 ? "Claim Free" : "Buy Now"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ProTalkInTalkCheckoutModal
        spaceId={spaceId}
        product={taggedProduct}
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        currentUser={currentUser}
        onPurchased={() => setIsPurchased(true)}
      />
    </>
  );
}
