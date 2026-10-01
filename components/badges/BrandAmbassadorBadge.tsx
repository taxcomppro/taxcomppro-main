import Image from "next/image";

interface Props {
  /** Size in pixels (number) or semantic size ('xs' | 'sm' | 'md' | 'lg' | 'xl') */
  size?: number | "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showTooltip?: boolean;
  tooltipPosition?: "top" | "bottom";
}

const sizeMap: Record<string, number> = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
};

/**
 * TCP Brand Ambassador Shield Badge
 * Awarded to designated Brand Ambassadors.
 * Displays the official TCP Brand Ambassador shield with a hover tooltip.
 */
export function BrandAmbassadorBadge({
  size = 20,
  className = "",
  showTooltip = true,
  tooltipPosition = "bottom",
}: Props) {
  const pixelSize = typeof size === "number" ? size : sizeMap[size] || 20;

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none ${
        showTooltip ? "group/ambassador relative cursor-pointer" : ""
      } ${className}`}
      aria-label="TCP Brand Ambassador"
    >
      <Image
        src="/brand-ambassador-badge.png"
        alt="TCP Brand Ambassador"
        width={pixelSize}
        height={pixelSize}
        style={{ width: pixelSize, height: pixelSize }}
        className="object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.35)] transition-transform duration-200 group-hover/ambassador:scale-110"
        unoptimized
      />
      {showTooltip && (
        <span
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#071326] border border-amber-500/40 text-white text-[11px] font-bold px-3 py-2 opacity-0 group-hover/ambassador:opacity-100 transition-all duration-200 z-[9999] shadow-2xl backdrop-blur-md ${
            tooltipPosition === "top"
              ? "bottom-full mb-2.5"
              : "top-full mt-2.5"
          }`}
        >
          {tooltipPosition === "top" ? (
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#071326]" />
          ) : (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#071326]" />
          )}
          <span className="flex items-center gap-1.5 text-amber-400 font-extrabold tracking-wide uppercase text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            TCP Brand Ambassador
          </span>
          <span className="block text-slate-300 font-medium text-[10px] mt-0.5">
            Official Platform Brand Ambassador
          </span>
        </span>
      )}
    </span>
  );
}

export default BrandAmbassadorBadge;
