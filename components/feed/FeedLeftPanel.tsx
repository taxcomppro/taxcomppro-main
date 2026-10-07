"use client";

import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import FeedIcon, { type FeedIconName } from "./FeedIcon";

const navigation: { label: string; href: string; icon: FeedIconName }[] = [
  { label: "Home feed", href: "/feed", icon: "home" },
  { label: "Connections", href: "/connections", icon: "people" },
  { label: "Messages", href: "/messages", icon: "message" },
  { label: "Notifications", href: "/notifications", icon: "bell" },
  { label: "Pro Networks", href: "/pro-networks?filter=mine", icon: "grid" },
  { label: "Pro Talks", href: "/pro-talks", icon: "mic" },
  { label: "Marketplace", href: "/marketplace", icon: "shop" },
];

export default function FeedLeftPanel() {
  const user = useAppSelector(state => state.auth.user);
  if (!user) return null;
  const canSell = user.role === "ADMIN" || user.tier === "MARKETPLACE" || user.tier === "MARKETPLACE_PLUS";
  return <div className="feed-rail">
    <Link href="/profile" className="feed-account">
      <span className="feed-account-avatar">{user.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : user.name?.[0]?.toUpperCase()}</span>
      <span><strong>{user.name}</strong><small>View your profile</small></span>
    </Link>
    <Link href="/find-a-pro" className="feed-find"><FeedIcon name="search" size={19} />Find a professional</Link>
    <nav className="feed-rail-nav" aria-label="Community navigation">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={item.href === "/feed" ? "page" : undefined}><FeedIcon name={item.icon} active={item.href === "/feed"} /><span>{item.label}</span></Link>)}</nav>
    <button type="button" className="feed-write" onClick={() => { document.querySelector<HTMLButtonElement>("[data-feed-compose-trigger]")?.click(); const composer = document.querySelector<HTMLElement>(".feed-composer textarea, [data-feed-compose-trigger]"); composer?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); composer?.focus({ preventScroll: true }); }}><FeedIcon name="edit" size={20} />Create a post</button>
    <details className="feed-more"><summary>More from TaxCompPro</summary><Link href="/groups">Groups</Link><Link href="/marketplace-purchases">My purchases</Link>{canSell && <Link href="/my-listings">My listings</Link>}<a href="https://academy.taxcomppro.com" target="_blank" rel="noopener noreferrer">Access Academy ↗</a><Link href="/upgrade">Membership plan</Link>{user.role === "ADMIN" && <Link href="/admin">Admin panel</Link>}</details>
    <p className="feed-rail-note">A place for tax professionals<br />to learn, share, and connect.</p>
  </div>;
}
