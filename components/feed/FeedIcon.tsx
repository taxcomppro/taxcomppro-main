import type { SVGProps } from "react";

const paths = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  people: "M16 21v-3a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v3m18 0v-3a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  bell: "M5 9a7 7 0 0 1 14 0v5l2 3H3l2-3Zm4 11a3 3 0 0 0 6 0",
  message: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z",
  heart: "M20.5 4.8a5.3 5.3 0 0 0-7.5 0L12 5.9l-1.1-1.1a5.3 5.3 0 0 0-7.5 7.5L12 21l8.5-8.7a5.3 5.3 0 0 0 0-7.5Z",
  send: "m22 2-7 20-4-9-9-4 20-7Zm0 0L11 13",
  shop: "M4 8h16l1 13H3L4 8Zm4 0V6a4 4 0 0 1 8 0v2",
  mic: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-4 6v1a7 7 0 0 0 14 0v-1m-7 8v3m-4 0h8",
  search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6",
  edit: "m14 5 5 5M3 21l5-1L21 7l-5-5L3 15v6Z",
  grid: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
} as const;
export type FeedIconName = keyof typeof paths;

/** Shared geometry keeps outline and selected states aligned without layout shifts. */
export default function FeedIcon({ name, active = false, size = 24, ...props }: SVGProps<SVGSVGElement> & { name: FeedIconName; active?: boolean; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" data-filled={active} {...props}><path d={paths[name]} /></svg>;
}
