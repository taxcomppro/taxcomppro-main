import type { ReactionType } from "@/lib/reactions";

/** Hand-drawn SVG geometry shared by the picker, totals, and reaction lists. */
export default function ReactionIcon({ type = "LIKE", active = false, size = 24 }: { type?: ReactionType; active?: boolean; size?: number }) {
  const fill = active ? "currentColor" : "none";
  return <svg className="feed-reaction-icon" data-filled={active} data-reaction={type} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {type === "LIKE" ? <><path fill={fill} d="M8 10 12 3c.4-.8 2-.3 2 1v5h5a2 2 0 0 1 2 2.4l-1.5 8A2 2 0 0 1 17.5 21H8V10Z" /><path d="M3 10h2v11H3z" fill={fill} /></>
    : type === "LOVE" ? <path fill={fill} d="M20.5 4.8a5.3 5.3 0 0 0-7.5 0L12 5.9l-1.1-1.1a5.3 5.3 0 0 0-7.5 7.5L12 21l8.5-8.7a5.3 5.3 0 0 0 0-7.5Z" />
    : type === "CARE" ? <><path fill={fill} d="m12 14-5-5a3 3 0 0 1 5-3 3 3 0 0 1 5 3Z" /><path d="m2 12 3 7 7 3 7-3 3-7M5 12l4 5h6l4-5" /></>
    : <><circle cx="12" cy="12" r="9" fill={active ? "currentColor" : "none"} fillOpacity={active ? .16 : 1} />
      {type === "HAHA" ? <><path d="m6.5 9 2-1.5L10 9m4 0 1.5-1.5L18 9" /><path fill={fill} d="M7 13h10a5 5 0 0 1-10 0Z" /></>
      : type === "WOW" ? <><circle cx="8.5" cy="9" r=".9" fill="currentColor" /><circle cx="15.5" cy="9" r=".9" fill="currentColor" /><ellipse cx="12" cy="15" rx="2.2" ry="3" fill={fill} /></>
      : type === "SAD" ? <><path d="m7 8 3 1m4 0 3-1m-9 9q4-4 8 0" /><path fill={fill} d="M6 11s-2 2-2 3a2 2 0 0 0 4 0c0-1-2-3-2-3Z" /></>
      : <><path d="m6.5 8 4 2m3 0 4-2m-9 9q3.5-3 7 0" /><circle cx="9" cy="11" r=".7" fill="currentColor" /><circle cx="15" cy="11" r=".7" fill="currentColor" /></>}
    </>}
  </svg>;
}
