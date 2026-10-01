"use client";

import Link from "next/link";
import Image from "next/image";
import {
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser, clearUser, type AuthUser } from "@/store/slices/authSlice";
import { useTheme } from "next-themes";
import {
  Menu01Icon,
  Cancel01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  Home01Icon,
  Notification01Icon,
  Search01Icon,
  UserGroupIcon,
  Message01Icon,
  BookOpen01Icon,
  ShoppingBag01Icon,
  Store01Icon,
  Rocket01Icon,
  Radio01Icon,
  UserCircleIcon,
  UserAdd01Icon,
  Logout01Icon,
  Shield01Icon,
  ComputerIcon,
  GiftIcon,
  Sun01Icon,
  Moon02Icon,
} from "hugeicons-react";
import "./navbar.css";
import { SiteSearch } from "./SiteSearch";

const groups = [
  {
    label: "Pros",
    links: [
      {
        label: "Find a Pro",
        href: "/find-a-pro",
        icon: UserGroupIcon,
        description: "Find your next connection",
      },
      {
        label: "Pro Talks",
        href: "/pro-talks",
        icon: Radio01Icon,
        description: "Ideas worth talking about",
      },
      {
        label: "Groups",
        href: "/groups",
        icon: UserGroupIcon,
        description: "Find your people",
      },
      {
        label: "Pro Hub",
        href: "/pro-hub",
        icon: Store01Icon,
        description: "Your professional home",
      },
      {
        label: "Pro Network",
        href: "/pro-networks",
        icon: UserAdd01Icon,
        description: "Grow your circle",
      },
    ],
  },
  {
    label: "More",
    links: [
      {
        label: "Pro Marketing",
        href: "/pro-marketing",
        icon: Rocket01Icon,
        description: "Grow your presence",
      },
      { label: "Tools", href: "/tools", icon: Rocket01Icon, description: "Coming soon" },
      {
        label: "Pricing & plans",
        href: "/upgrade",
        icon: Rocket01Icon,
        description: "Find the right membership",
      },
      {
        label: "Become an Affiliate",
        href: "https://affiliate.taxcomppro.com",
        icon: GiftIcon,
        description: "Share the community",
      },
      {
        label: "About us",
        href: "/about",
        icon: Shield01Icon,
        description: "Get to know TaxCompPro",
      },
    ],
  },
];
const subscribe = () => () => {};
function SiteLink({
  href,
  children,
  ...props
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
  "aria-current"?: "page";
}) {
  return (
    <Link
      href={href}
      {...(href.startsWith("https://")
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      {...props}
    >
      {children}
    </Link>
  );
}
function NavModal({
  title,
  children,
  onClose,
  drawer = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`site-nav-modal ${drawer ? "site-nav-drawer" : ""}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="site-modal-top">
        <span>{title}</span>
        <button
          className="site-icon"
          onClick={onClose}
          aria-label={`Close ${title.toLowerCase()}`}
        >
          <Cancel01Icon size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function Navbar() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const dispatch = useAppDispatch();
  const storeUser = useAppSelector((state) => state.auth.user);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const isDark = mounted && resolvedTheme === "dark";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [counts, setCounts] = useState({ notifications: 0, messages: 0 });
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (isPending) return;
    if (!session) {
      dispatch(clearUser());
      return;
    }
    const controller = new AbortController();
    const fallback = session.user as unknown as AuthUser;
    fetch("/api/user/me", { cache: "no-store", signal: controller.signal })
      .then(async (response) => (response.ok ? response.json() : fallback))
      .then((profile: AuthUser) => {
        if (!controller.signal.aborted)
          dispatch(
            setUser({
              ...profile,
              role: profile.role ?? "MEMBER",
              tier: profile.tier ?? "FREE",
            }),
          );
      })
      .catch(() => {
        if (!controller.signal.aborted)
          dispatch(
            setUser({
              ...fallback,
              role: fallback.role ?? "MEMBER",
              tier: fallback.tier ?? "FREE",
            }),
          );
      });
    return () => controller.abort();
  }, [session, isPending, dispatch]);
  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    Promise.all([
      fetch("/api/notifications", { signal: controller.signal }).then(
        (response) => (response.ok ? response.json() : []),
      ),
      fetch("/api/messages/unread", { signal: controller.signal }).then(
        (response) => (response.ok ? response.json() : { count: 0 }),
      ),
    ])
      .then(([notifications, messages]) => {
        if (!controller.signal.aborted)
          setCounts({
            notifications: Array.isArray(notifications)
              ? notifications.filter(
                  (item: { isRead: boolean }) => !item.isRead,
                ).length
              : 0,
            messages: messages.count || 0,
          });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [user?.id]);
  useEffect(() => {
    function outside(event: MouseEvent) {
      headerRef.current
        ?.querySelectorAll<HTMLDetailsElement>("details[open]")
        .forEach((detail) => {
          if (!detail.contains(event.target as Node)) detail.open = false;
        });
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape")
        headerRef.current
          ?.querySelectorAll<HTMLDetailsElement>("details[open]")
          .forEach((detail) => {
            detail.open = false;
            detail.querySelector("summary")?.focus();
          });
    }
    document.addEventListener("click", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  function closeMenus() {
    setMobileOpen(false);
    headerRef.current
      ?.querySelectorAll<HTMLDetailsElement>("details[open]")
      .forEach((detail) => {
        detail.open = false;
      });
  }
  const home = user ? "/feed" : "/";
  const accountLinks =
    storeUser?.role === "ADMIN"
      ? [{ label: "Admin panel", href: "/admin", icon: Shield01Icon }]
      : [
          { label: "My profile", href: "/profile", icon: UserCircleIcon },
          {
            label: "My listings",
            href: "/marketplace?mine=true",
            icon: Store01Icon,
          },
          ...(["MARKETPLACE", "MARKETPLACE_PLUS"].includes(
            storeUser?.tier || "",
          )
            ? [
                {
                  label: "Seller dashboard",
                  href: "/seller-dashboard",
                  icon: BriefcaseIcon,
                },
              ]
            : []),
          {
            label: "Marketplace purchases",
            href: "/marketplace-purchases",
            icon: ShoppingBag01Icon,
          },
          { label: "Connections", href: "/connections", icon: UserAdd01Icon },
          { label: "Upgrade plan", href: "/upgrade", icon: Rocket01Icon },
        ];
  function accountContent() {
    return (
      <>
        <div className="site-account-info">
          <strong>{user?.name}</strong>
          <span>{user?.email}</span>
          {storeUser?.tier && storeUser.tier !== "FREE" && (
            <small>{storeUser.tier.replaceAll("_", " ")}</small>
          )}
        </div>
        {accountLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="site-account-link"
            onClick={closeMenus}
          >
            <item.icon size={17} />
            {item.label}
          </Link>
        ))}
        <button
          className="site-signout"
          onClick={async () => {
            closeMenus();
            await signOut();
            dispatch(clearUser());
            window.location.assign("/");
          }}
        >
          <Logout01Icon size={17} />
          Sign out
        </button>
      </>
    );
  }
  const countBadge = (value: number) =>
    value > 0 ? (
      <span className="site-count">{value > 9 ? "9+" : value}</span>
    ) : null;
  return (
    <>
      <header className="site-navbar" ref={headerRef}>
        <div className="site-navbar-inner">
          <Link
            href={home}
            className="site-logo"
            aria-label="Tax Compliance Pro home"
          >
            <Image
              src="/Tonique_blanchard_upscale_upscaled (1).png"
              alt="Tax Compliance Pro"
              width={220}
              height={70}
              className="site-logo-light"
              priority
            />
            <Image
              src="/logo_dark 1.webp"
              alt="Tax Compliance Pro"
              width={220}
              height={70}
              className="site-logo-dark"
              priority
            />
          </Link>
          <nav className="site-desktop-nav" aria-label="Main navigation">
            <Link
              href={home}
              className="site-nav-link"
              aria-current={pathname === home ? "page" : undefined}
            >
              <Home01Icon size={16} />
              Home
            </Link>
            <Link href="/courses" className="site-nav-link" aria-current={pathname.startsWith("/courses") ? "page" : undefined}>Courses</Link>
            <Link href="/toolkits" className="site-nav-link" aria-current={pathname.startsWith("/toolkits") ? "page" : undefined}>Toolkits</Link>
            <Link href="/marketplace" className="site-nav-link" aria-current={pathname.startsWith("/marketplace") ? "page" : undefined}><ShoppingBag01Icon size={16} />Marketplace</Link>
            {groups.map((group) => (
              <div key={group.label} className="site-nav-group">
                <details className="site-disclosure site-mega-disclosure" name="main-navigation">
                  <summary
                    className={
                      group.links.some((link) => pathname.startsWith(link.href))
                        ? "site-nav-link is-current"
                        : "site-nav-link"
                    }
                  >
                    {group.label}
                    <ArrowDown01Icon size={13} />
                  </summary>
                  <div className="site-dropdown site-mega-menu">
                    <div className="site-mega-directory">
                    <span className="site-dropdown-label">
                      {group.label === "Pros"
                        ? "YOUR PROFESSIONAL COMMUNITY"
                        : "MORE FROM TAXCOMPPRO"}
                    </span>
                    <div className="site-mega-links">
                    {group.links.map((item) => (
                      <SiteLink
                        key={item.href}
                        href={item.href}
                        onClick={closeMenus}
                        className="site-dropdown-link"
                        aria-current={
                          pathname === item.href ? "page" : undefined
                        }
                      >
                        <span className="site-menu-icon">
                          <item.icon size={19} />
                        </span>
                        <span>
                          <strong>{item.label}</strong>
                          <small>{item.description}</small>
                        </span>
                        <ArrowRight01Icon size={14} />
                      </SiteLink>
                    ))}
                    </div>
                    </div>
                    <aside className="site-mega-feature">
                      <span className="site-mega-eyebrow">{group.label === "Pros" ? "Make your next connection" : "Make more of your membership"}</span>
                      {group.label === "Pros" ? <UserGroupIcon size={32} /> : <Rocket01Icon size={32} />}
                      <h2>{group.label === "Pros" ? "Good company. Great possibilities." : "Your next step starts here."}</h2>
                      <p>{group.label === "Pros" ? "Meet tax professionals, join a conversation, and build your circle." : "Explore membership options, find helpful resources, or talk to our team."}</p>
                      <Link href={group.label === "Pros" ? "/find-a-pro" : "/upgrade"} onClick={closeMenus} className="site-mega-cta">
                        {group.label === "Pros" ? "Find your people" : "Compare plans"}<ArrowRight01Icon size={18} />
                      </Link>
                      <Link href={group.label === "Pros" ? "/pro-talks" : "/contact"} onClick={closeMenus} className="site-mega-secondary">
                        {group.label === "Pros" ? "Explore Pro Talks" : "Contact & support"}<ArrowRight01Icon size={16} />
                      </Link>
                    </aside>
                  </div>
                </details>
              </div>
            ))}
          </nav>
          <div className="site-nav-actions">
            <a
              href="https://alwaysaskatlas.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="site-atlas"
            >
              <Image
                src="/atlas-button.webp"
                alt="Try Atlas AI"
                width={150}
                height={54}
              />
            </a>
            <span className="site-action-divider" />
            <button
              type="button"
              className="site-theme-toggle"
              role="switch"
              aria-checked={isDark}
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label="Dark mode"
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
              <span className="site-theme-thumb" aria-hidden="true" />
              <span className="site-theme-option site-theme-light" aria-hidden="true"><Sun01Icon size={17} /></span>
              <span className="site-theme-option site-theme-dark" aria-hidden="true"><Moon02Icon size={17} /></span>
            </button>
            <button
              className="site-icon site-search-toggle"
              onClick={() => setSearchOpen(true)}
              aria-label="Search the site"
            >
              <Search01Icon size={20} />
            </button>
            {user && (
              <div className="site-quick-actions">
                <Link
                  href="/notifications"
                  className="site-icon"
                  aria-label={`Notifications${counts.notifications ? `, ${counts.notifications} unread` : ""}`}
                >
                  <Notification01Icon size={20} />
                  {countBadge(counts.notifications)}
                </Link>
                <Link
                  href="/messages"
                  className="site-icon"
                  aria-label={`Messages${counts.messages ? `, ${counts.messages} unread` : ""}`}
                >
                  <Message01Icon size={20} />
                  {countBadge(counts.messages)}
                </Link>
              </div>
            )}
            <div className="site-desktop-account">
              {isPending ? (
                <span
                  className="site-account-loading"
                  aria-label="Loading account"
                />
              ) : user ? (
                <details className="site-disclosure site-account">
                  <summary className="site-account-trigger">
                    <span className="site-user-avatar">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt=""
                          width={30}
                          height={30}
                          unoptimized
                        />
                      ) : (
                        user.name?.[0]
                      )}
                    </span>
                    <span>{user.name?.split(" ")[0]}</span>
                    <ArrowDown01Icon size={13} />
                  </summary>
                  <div className="site-dropdown site-account-dropdown">
                    {accountContent()}
                  </div>
                </details>
              ) : (
                <div className="site-auth-links">
                  <Link href="/login">Sign in</Link>
                  <Link href="/register" className="site-join">
                    Get started <ArrowRight01Icon size={15} />
                  </Link>
                </div>
              )}
            </div>
            <button
              className="site-icon site-mobile-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              aria-haspopup="dialog"
            >
              <Menu01Icon size={23} />
            </button>
          </div>
        </div>
      </header>
      {searchOpen && (
        <NavModal
          title="Search TaxCompPro"
          onClose={() => setSearchOpen(false)}
        >
          <SiteSearch onClose={() => setSearchOpen(false)} />
        </NavModal>
      )}
      {mobileOpen && (
        <NavModal
          title="Explore TaxCompPro"
          onClose={() => setMobileOpen(false)}
          drawer
        >
          <button type="button" className="site-mobile-search ss-mobile-trigger" onClick={() => { setMobileOpen(false); setSearchOpen(true); }}><Search01Icon size={19} />Search all of TaxCompPro<ArrowRight01Icon size={19} /></button>
          <nav aria-label="Mobile navigation">
            <div className="site-mobile-primary">
              <Link href={home} onClick={closeMenus}>
                <Home01Icon size={20} />
                Home
                <ArrowRight01Icon size={16} />
              </Link>
              <Link href="/courses" onClick={closeMenus}><BookOpen01Icon size={20} />Courses<ArrowRight01Icon size={16} /></Link>
              <Link href="/toolkits" onClick={closeMenus}><ComputerIcon size={20} />Toolkits<ArrowRight01Icon size={16} /></Link>
              <Link href="/marketplace" onClick={closeMenus}>
                <ShoppingBag01Icon size={20} />
                Marketplace
                <ArrowRight01Icon size={16} />
              </Link>
            </div>
            {groups.map((group) => (
              <details
                className="site-mobile-section"
                key={group.label}
                open={group.label === "Pros"}
              >
                <summary>
                  {group.label}
                  <ArrowDown01Icon size={15} />
                </summary>
                <div>
                  {group.links.map((item) => (
                    <SiteLink
                      href={item.href}
                      key={item.href}
                      onClick={closeMenus}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                      <ArrowRight01Icon size={14} />
                    </SiteLink>
                  ))}
                </div>
              </details>
            ))}
          </nav>
          <a
            href="https://alwaysaskatlas.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="site-mobile-atlas"
          >
            <Image
              src="/atlas-button.webp"
              alt="Try Atlas AI"
              width={160}
              height={57}
            />
            <ArrowRight01Icon size={18} />
          </a>
          <div className="site-mobile-account">
            {user ? (
              <>
                <div className="site-mobile-alerts">
                  <Link href="/notifications" onClick={closeMenus}>
                    <Notification01Icon size={18} />
                    Notifications{countBadge(counts.notifications)}
                  </Link>
                  <Link href="/messages" onClick={closeMenus}>
                    <Message01Icon size={18} />
                    Messages{countBadge(counts.messages)}
                  </Link>
                </div>
                {accountContent()}
              </>
            ) : (
              <div className="site-auth-links">
                <Link href="/login" onClick={closeMenus}>
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="site-join"
                  onClick={closeMenus}
                >
                  Get started
                  <ArrowRight01Icon size={16} />
                </Link>
              </div>
            )}
          </div>
        </NavModal>
      )}
    </>
  );
}
const BriefcaseIcon = Store01Icon;
