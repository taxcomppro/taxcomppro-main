"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  DashboardSquare01Icon,
  UserGroupIcon,
  SparklesIcon,
  Settings01Icon,
  ChartHistogramIcon,
  Calendar03Icon,
  Mail01Icon,
  CustomerSupportIcon,
  Menu01Icon,
  Cancel01Icon,
  ArrowUpRight01Icon,
  Sun03Icon,
  Moon02Icon,
  Search01Icon,
  CreditCardIcon,
  Image01Icon,
  GiftIcon,
} from "hugeicons-react";
const groups = [
  {
    name: "Workspace",
    links: [
      { label: "Overview", href: "/admin", icon: DashboardSquare01Icon },
      { label: "Members", href: "/admin/users", icon: UserGroupIcon },
      { label: "Approvals", href: "/admin/approvals", icon: Settings01Icon },
      {
        label: "Analytics",
        href: "/admin/analytics",
        icon: ChartHistogramIcon,
      },
    ],
  },
  {
    name: "Content & community",
    links: [
      {
        label: "AI specialists",
        href: "/admin/specialists",
        icon: SparklesIcon,
      },
      {
        label: "Pro Hub",
        href: "/admin/content?tab=forums",
        icon: UserGroupIcon,
      },
      {
        label: "Pro Networks",
        href: "/admin/content?tab=networks",
        icon: UserGroupIcon,
      },
      {
        label: "Content calendar",
        href: "/admin/content-calendar",
        icon: Calendar03Icon,
      },
      {
        label: "Media library",
        href: "/admin/media-gallery",
        icon: Image01Icon,
      },
    ],
  },
  {
    name: "Business & operations",
    links: [
      { label: "Payments", href: "/admin/payments", icon: CreditCardIcon },
      { label: "Coupons", href: "/admin/coupons", icon: GiftIcon },
      { label: "Emails", href: "/admin/emails", icon: Mail01Icon },
      { label: "Support", href: "/admin/support", icon: CustomerSupportIcon },
      { label: "Atlas settings", href: "/admin/atlas", icon: Settings01Icon },
    ],
  },
];
export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const params = useSearchParams();
  const activePath =
    path === "/admin/content"
      ? `${path}?tab=${params.get("tab") || "forums"}`
      : path;
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const title =
    groups.flatMap((g) => g.links).find((l) => l.href === activePath)?.label ||
    "Content management";
  return (
    <div className="admin-shell">
      {open && (
        <button
          className="admin-nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
        <header>
          <Link href="/admin" className="admin-brand-logo">
            <img
              src="/Tonique_blanchard_upscale_upscaled (1).png"
              alt="Tax Compliance Pro"
              className="admin-logo-light"
            />
            <img
              src="/logo_dark 1.webp"
              alt="Tax Compliance Pro"
              className="admin-logo-dark"
            />
          </Link>
          <span>ADMIN WORKSPACE</span>
          <button
            className="admin-mobile-close"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <Cancel01Icon size={20} />
          </button>
        </header>
        <label className="admin-nav-search">
          <Search01Icon size={17} />
          <input
            aria-label="Find an admin section"
            placeholder="Find a section…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <nav>
          {groups.map((g) => (
            <section key={g.name}>
              <p>{g.name}</p>
              {g.links
                .filter((l) =>
                  l.label.toLowerCase().includes(search.toLowerCase()),
                )
                .map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={
                      l.href === activePath ||
                      (l.href !== "/admin" &&
                        !l.href.includes("?") &&
                        path.startsWith(l.href + "/"))
                        ? "active"
                        : ""
                    }
                  >
                    <l.icon size={20} />
                    {l.label}
                  </Link>
                ))}
            </section>
          ))}
        </nav>
        <footer>
          <Link href="/feed">
            View your platform <ArrowUpRight01Icon size={18} />
          </Link>
          <small>Tax Compliance Pro · Admin</small>
        </footer>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <button
              className="admin-menu-button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu01Icon size={23} />
            </button>
            <span>
              Workspace / <strong>{title}</strong>
            </span>
          </div>
          <div>
            <button
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              aria-label="Toggle color theme"
            >
              <Sun03Icon size={18} />
              <Moon02Icon size={18} />
            </button>
            <Link href="/profile">
              My profile <ArrowUpRight01Icon size={16} />
            </Link>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
