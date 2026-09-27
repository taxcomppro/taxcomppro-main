"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Tick02Icon, ArrowRight01Icon, CheckmarkCircle02Icon } from "hugeicons-react";
import { Check } from "lucide-react";
import { PricingPlan, PlanTier } from "@/lib/pricing-plans";
import "@/components/landing/member-pages.css";

export interface DiscountInfo {
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  durationMonths?: number;
  label?: string;
  savings?: number;
}

export interface PricingCardProps {
  plan: PricingPlan;
  mode?: "select" | "landing" | "upgrade";
  selected?: boolean;
  onSelect?: (tier: PlanTier) => void;
  // Upgrade mode props
  isCurrent?: boolean;
  included?: boolean;
  user?: any;
  isLoading?: boolean;
  upgradeLoadingTier?: string | null;
  onUpgrade?: (tier: PlanTier) => void;
  // Optional features expansion 
  expanded?: boolean;
  compact?: boolean;
  className?: string;
  discountInfo?: DiscountInfo | null;
}

export function PricingCard({
  plan,
  mode = "landing",
  selected = false,
  onSelect,
  isCurrent = false,
  included = false,
  user,
  isLoading = false,
  upgradeLoadingTier = null,
  onUpgrade,
  expanded = false,
  compact = false,
  className = "",
  discountInfo = null,
}: PricingCardProps) {
  const isSelected = mode === "select" && selected;
  const isSelectable = mode === "select";

  const handleCardClick = () => {
    if (isSelectable && onSelect) {
      onSelect(plan.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isSelectable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onSelect?.(plan.id);
    }
  };

  // Calculate discount if applicable
  let finalPrice = plan.priceAmount;
  let discountSavings = 0;
  const hasDiscount = Boolean(discountInfo && plan.priceAmount > 0);

  if (hasDiscount && discountInfo) {
    if (discountInfo.discountType === "PERCENT") {
      discountSavings = (plan.priceAmount * discountInfo.discountValue) / 100;
    } else {
      discountSavings = Math.min(plan.priceAmount, discountInfo.discountValue);
    }
    discountSavings = Math.round(discountSavings * 100) / 100;
    finalPrice = Math.max(0, Math.round((plan.priceAmount - discountSavings) * 100) / 100);
  }

  // Determine features to display
  const displayedFeatures = expanded
    ? plan.features
    : plan.tier === "MARKETPLACE_PLUS"
    ? [...plan.features.slice(-3), ...plan.features.slice(0, 2)]
    : plan.features.slice(0, 5);

  const cardClasses = [
    "pricing-card",
    compact ? "pricing-card-compact" : "",
    plan.popular ? "pricing-featured" : "",
    isSelected ? "pricing-selected" : "",
    isSelectable ? "pricing-selectable" : "",
    hasDiscount ? "border-emerald-500/40" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={cardClasses}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role={isSelectable ? "radio" : undefined}
      aria-checked={isSelectable ? isSelected : undefined}
      tabIndex={isSelectable ? 0 : undefined}
    >
      {/* Top Visual Art Box */}
      <div className="pricing-art">
        <Image
          src={plan.img}
          alt=""
          width={120}
          height={120}
          className="object-contain"
        />

        {/* Badge or Status Badge */}
        {mode === "upgrade" && (isCurrent || included || plan.badge) && (
          <span className="pricing-badge">
            {isCurrent ? "Current plan" : included ? "Included" : plan.badge}
          </span>
        )}

        {mode === "landing" && plan.badge && (
          <span className="pricing-badge">{plan.badge}</span>
        )}

        {mode === "select" && (
          <>
            {plan.badge && (
              <span className="pricing-badge pricing-badge-left">
                {plan.badge}
              </span>
            )}
            <div
              className={`pricing-select-indicator ${
                isSelected ? "is-selected" : ""
              }`}
              aria-hidden="true"
            >
              {isSelected ? (
                <Check size={14} strokeWidth={3} />
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Card Content Body */}
      <div className="pricing-body">
        <div className="flex items-center justify-between gap-2 min-h-[52px]">
          <h2 className="!min-h-0">{plan.name}</h2>
          {hasDiscount && discountInfo && (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
              {discountInfo.discountType === "PERCENT"
                ? `${discountInfo.discountValue}% OFF`
                : `$${discountInfo.discountValue} OFF`}
            </span>
          )}
        </div>
        <p className="pricing-description">{plan.description}</p>

        {/* Price & Period */}
        <div className="pricing-price">
          {hasDiscount && discountInfo ? (
            <div className="flex items-baseline gap-2 flex-wrap">
              <del className="text-slate-400 dark:text-slate-500 text-lg font-normal line-through opacity-70">
                ${plan.priceAmount.toFixed(2)}
              </del>
              <strong className="text-emerald-500 dark:text-emerald-400 font-black text-4xl">
                {finalPrice === 0 ? "$0" : `$${finalPrice.toFixed(2)}`}
              </strong>
              <span>{plan.period || "Forever"}</span>
            </div>
          ) : (
            <>
              <strong>{plan.price}</strong>
              <span>{plan.period || "Forever"}</span>
            </>
          )}
        </div>

        {/* Savings / Value Subtitle */}
        <p className="pricing-savings">
          {hasDiscount && discountInfo ? (
            <span className="text-emerald-500 dark:text-emerald-400 font-bold">
              {finalPrice === 0
                ? discountInfo.durationMonths && discountInfo.durationMonths > 1
                  ? `🎉 100% Free for ${discountInfo.durationMonths} Months with code ${discountInfo.code}`
                  : `🎉 100% Free with code ${discountInfo.code}`
                : discountInfo.durationMonths && discountInfo.durationMonths > 1
                ? `Save $${discountSavings.toFixed(2)} (${discountInfo.durationMonths} Mo) with code ${discountInfo.code}`
                : `Save $${discountSavings.toFixed(2)} with code ${discountInfo.code}`}
            </span>
          ) : (
            plan.savings ||
            (plan.priceAmount === 0
              ? "Start with the essentials"
              : "Invest in your professional growth")
          )}
        </p>

        {/* Action Button Area */}
        <div className="pricing-action">
          {mode === "select" && (
            <button
              type="button"
              className={`mp-button ${isSelected ? "" : "mp-button-secondary"}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(plan.id);
              }}
            >
              {isSelected ? (
                <>
                  <Tick02Icon size={18} />
                  <span>Selected</span>
                </>
              ) : (
                <span>Choose {plan.tier === "FREE" ? "Free" : "Plan"}</span>
              )}
            </button>
          )}

          {mode === "landing" && (
            <Link
              href={plan.href}
              className={`mp-button ${plan.popular ? "" : "mp-button-secondary"}`}
            >
              <span>{plan.cta}</span>
              <ArrowRight01Icon size={17} />
            </Link>
          )}

          {mode === "upgrade" && (
            <>
              {isCurrent || included ? (
                <span className="mp-button mp-button-secondary">
                  <Tick02Icon size={18} />
                  {isCurrent ? "Current plan" : "Included in your plan"}
                </span>
              ) : !user && !isLoading ? (
                <Link
                  className={`mp-button ${
                    plan.popular ? "" : "mp-button-secondary"
                  }`}
                  href={
                    plan.tier === "FREE"
                      ? "/register"
                      : "/login?next=%2Fupgrade"
                  }
                >
                  {plan.tier === "FREE"
                    ? "Get started free"
                    : "Sign in to upgrade"}
                  <ArrowRight01Icon size={17} />
                </Link>
              ) : (
                <button
                  type="button"
                  className={`mp-button ${
                    plan.popular ? "" : "mp-button-secondary"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpgrade?.(plan.id);
                  }}
                  disabled={Boolean(upgradeLoadingTier) || isLoading}
                >
                  {isLoading
                    ? "Loading your plan…"
                    : upgradeLoadingTier === plan.id
                    ? "Opening checkout…"
                    : plan.cta}
                  <ArrowRight01Icon size={17} />
                </button>
              )}
            </>
          )}
        </div>

        {/* Features Checklist */}
        <p className="pricing-list-label">What’s included</p>
        <ul id={`features-${plan.tier}`} className="pricing-features">
          {displayedFeatures.map((feature) => (
            <li key={feature}>
              <Tick02Icon size={17} aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default PricingCard;
