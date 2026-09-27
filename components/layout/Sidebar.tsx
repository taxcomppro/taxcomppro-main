"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BookOpen,
  BarChart2,
  Calendar,
  Images,
  Gift,
  Bot,
  CreditCard,
  ChevronRight,
  LifeBuoy,
  Ticket,
  Mail,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { useSidebar } from "@/components/layout/SidebarContext";

type NavLink = { icon: React.ElementType; label: string; href: string; exact?: boolean };

const tierStyle: Record<string, string> = {
  FREE:             "bg-white/10 text-white/60",
  VIP:              "bg-amber-400/20 text-amber-300",
  MARKETPLACE:      "bg-blue-400/20 text-blue-300",
  MARKETPLACE_PLUS: "bg-emerald-400/20 text-emerald-300",
};
const tierLabel: Record<string, string> = {
  FREE: "Free", VIP: "VIP", MARKETPLACE: "Marketplace", MARKETPLACE_PLUS: "Plus",
};

const memberLinks: NavLink[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", exact: true },
];

const adminLinks: NavLink[] = [
  { icon: LayoutDashboard, label: "Dashboard",        href: "/admin",                 exact: true },
  { icon: Users,           label: "Users",             href: "/admin/users" },
  { icon: CreditCard,      label: "Payments",          href: "/admin/payments" },
  { icon: Ticket,          label: "Coupons",           href: "/admin/coupons" },
  { icon: Mail,            label: "Emails",            href: "/admin/emails" },
  { icon: CheckSquare,     label: "Approvals",         href: "/admin/approvals" },
  { icon: BarChart2,       label: "Analytics",         href: "/admin/analytics" },
  { icon: Calendar,        label: "Content Calendar",  href: "/admin/content-calendar" },
  { icon: Images,          label: "Media Gallery",     href: "/admin/media-gallery" },
  { icon: Gift,            label: "Affiliate",         href: "/admin/affiliate" },
  { icon: Bot,             label: "Atlas AI",          href: "/admin/atlas" },
  { icon: LifeBuoy,        label: "Support Tickets",   href: "/admin/support" },
];

const navGroups = [
  { label: "Overview",   items: adminLinks.slice(0, 5) },
  { label: "Management", items: adminLinks.slice(5, 8) },
  { label: "Tools",      items: adminLinks.slice(8) },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const user     = useAppSelector((s) => s.auth.user);
  const { collapsed } = useSidebar();

  const [activeModal, setActiveModal] = useState<"marketplace" | "communities" | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const links: NavLink[] = isAdmin ? adminLinks : memberLinks;

  const handleConfirmClear = async () => {
    if (!activeModal) return;
    setIsClearing(true);
    try {
      const endpoint = activeModal === "marketplace" ? "/api/admin/listings" : "/api/admin/communities";
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        const typeLabel = activeModal === "marketplace" ? "marketplace listings" : "communities";
        setToastMsg(`Successfully cleared ${data.count ?? "all"} ${typeLabel}!`);
        setActiveModal(null);
        setTimeout(() => setToastMsg(""), 4000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to clear records");
      }
    } catch {
      alert("Error occurred while clearing records");
    } finally {
      setIsClearing(false);
    }
  };

  const renderSidebarContent = (isMobile: boolean) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Logo area */}
        <div
          className={`border-b border-white/10 flex items-center transition-all ${
            isCollapsed
              ? "py-4 px-2 justify-center min-h-[73px]"
              : "px-5 py-5 justify-between min-h-[73px]"
          }`}
        >
          {isCollapsed ? (
            <Link href="/" title="Tax Compliance Pro" className="flex items-center justify-center group">
              <img
                src="/fevicon.webp"
                alt="TaxCompPro"
                className="h-9 w-9 object-contain group-hover:scale-105 transition-transform"
              />
            </Link>
          ) : (
            <>
              <div>
                <Link href="/" className="flex items-center gap-2">
                  <img src="/logo_dark.webp" alt="Tax Compliance Pro" className="h-12 w-auto max-w-[200px] object-contain" />
                </Link>
                {isAdmin && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 bg-amber-400/15 text-amber-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full w-fit">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Admin Panel
                  </div>
                )}
              </div>
              {isMobile && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Nav list */}
        <nav
          className={`flex-1 py-4 flex flex-col gap-4 overflow-y-auto overflow-x-hidden ${
            isCollapsed ? "px-2" : "px-3"
          }`}
        >
          {isAdmin ? (
            <>
              {navGroups.map((group) => (
                <div key={group.label}>
                  {!isCollapsed ? (
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2.5 mb-1.5 select-none">
                      {group.label}
                    </p>
                  ) : (
                    <div className="h-px bg-white/10 my-1 mx-2" />
                  )}
                  <div className="flex flex-col gap-1">
                    {group.items.map((l) => {
                      const isActive = l.exact
                        ? pathname === l.href
                        : pathname === l.href || pathname.startsWith(l.href + "/");

                      return (
                        <Link
                          key={l.href + l.label}
                          href={l.href}
                          onClick={() => {
                            if (isMobile && onClose) onClose();
                          }}
                          title={isCollapsed ? l.label : undefined}
                          className={`group relative flex items-center rounded-xl font-semibold transition-all ${
                            isCollapsed
                              ? "justify-center px-0 py-2.5 w-full"
                              : "gap-3 px-3 py-2.5 text-sm"
                          } ${
                            isActive
                              ? "bg-[#ffbe24] !text-black shadow-lg shadow-amber-400/20 font-bold"
                              : "text-white/60 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          <l.icon
                            className={`shrink-0 transition-transform ${
                              isCollapsed ? "w-5 h-5" : "w-4 h-4"
                            } ${
                              isActive
                                ? "!text-black"
                                : "text-white/40 group-hover:text-white/80 group-hover:scale-105"
                            }`}
                          />
                          {!isCollapsed && (
                            <>
                              <span className={`flex-1 truncate ${isActive ? "!text-black font-bold" : ""}`}>{l.label}</span>
                              {isActive && (
                                <ChevronRight className="w-3.5 h-3.5 !text-black/70 shrink-0" />
                              )}
                            </>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Admin Actions / Danger Zone */}
              <div className={`pt-3 border-t border-white/10 ${isCollapsed ? "px-0" : ""}`}>
                {!isCollapsed ? (
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400/80 px-2.5 mb-2 flex items-center justify-between select-none">
                    <span>Admin Actions</span>
                    <span className="bg-rose-500/20 text-rose-300 text-[9px] px-1.5 py-0.5 rounded font-bold">
                      DANGER
                    </span>
                  </p>
                ) : (
                  <div className="h-px bg-rose-500/20 my-1 mx-2" />
                )}

                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveModal("marketplace")}
                    title={isCollapsed ? "Clear Marketplace" : undefined}
                    className={`flex items-center rounded-xl font-semibold text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-all group cursor-pointer ${
                      isCollapsed
                        ? "justify-center px-0 py-2.5 w-full"
                        : "gap-2.5 w-full text-left px-3 py-2 text-xs"
                    }`}
                  >
                    <Trash2 className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
                    {!isCollapsed && <span className="truncate">Clear Marketplace</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModal("communities")}
                    title={isCollapsed ? "Clear Groups" : undefined}
                    className={`flex items-center rounded-xl font-semibold text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-all group cursor-pointer ${
                      isCollapsed
                        ? "justify-center px-0 py-2.5 w-full"
                        : "gap-2.5 w-full text-left px-3 py-2 text-xs"
                    }`}
                  >
                    <Trash2 className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
                    {!isCollapsed && <span className="truncate">Clear Groups</span>}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              {links.map((l) => {
                const isActive = l.exact ? pathname === l.href : pathname.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => {
                      if (isMobile && onClose) onClose();
                    }}
                    title={isCollapsed ? l.label : undefined}
                    className={`flex items-center rounded-xl font-semibold transition-all ${
                      isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5 text-sm"
                    } ${
                      isActive
                        ? "bg-[#ffbe24] !text-black font-bold shadow-lg shadow-amber-400/20"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <l.icon className={`w-5 h-5 shrink-0 ${isActive ? "!text-black" : ""}`} />
                    {!isCollapsed && <span className={isActive ? "!text-black font-bold" : ""}>{l.label}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* User Footer */}
        <div
          className={`border-t border-white/10 transition-all ${
            isCollapsed
              ? "p-3 flex items-center justify-center"
              : "px-4 py-4 flex items-center gap-3"
          }`}
          title={isCollapsed ? `${user.name} (${tierLabel[user.tier ?? "FREE"]})` : undefined}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-amber-400/30">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[#0a1628] font-black text-sm">
                {user.name?.[0]?.toUpperCase()}
              </span>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-bold truncate">{user.name}</div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block ${
                  tierStyle[user.tier ?? "FREE"] ?? tierStyle.FREE
                }`}
              >
                {tierLabel[user.tier ?? "FREE"]}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-2 bg-emerald-600 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#0f1d33] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-white">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black">
                {activeModal === "marketplace" ? "Clear All Marketplace Listings?" : "Clear All Groups?"}
              </h3>
              <p className="text-sm text-white/65 leading-relaxed">
                {activeModal === "marketplace"
                  ? "This will permanently delete all marketplace listings, purchases, and related records across the entire platform. This action cannot be undone."
                  : "This will permanently delete all groups, member memberships, group discussion posts, and comments across the entire platform. This action cannot be undone."}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setActiveModal(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-white/15 text-white/80 font-bold text-sm hover:bg-white/10 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleConfirmClear}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  "Yes, Clear All"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar (Collapsible) */}
      <aside
        className={`hidden lg:flex shrink-0 h-screen sticky top-0 bg-[#0a1628] border-r border-white/10 flex-col z-20 shadow-2xl transition-all duration-300 ease-in-out ${
          collapsed ? "w-[72px]" : "w-[230px]"
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          {/* Drawer Panel */}
          <aside className="fixed top-0 bottom-0 left-0 w-[280px] bg-[#0a1628] z-50 flex flex-col shadow-2xl border-r border-white/10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
