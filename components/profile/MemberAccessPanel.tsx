"use client";

import { useState } from "react";
import { BookOpen, Package, Layers, Search, RefreshCw, CheckCircle2, KeyRound } from "lucide-react";

type ProductType = "bundle" | "toolkit" | "course";
interface AccessItem { id: string; name?: string; title?: string; hasAccess: boolean; accessSource: string; grantedAt?: string; category?: string; badgeImage?: string; thumbnail?: string }
interface AcademyLicense { id: string; title: string; productKey: string; status: string; seats: number; expiresAt: string | null; organization: string }
export interface MemberAccessData { bundles: AccessItem[]; toolkits: AccessItem[]; courses: AccessItem[]; academyLicenses?: AcademyLicense[] }
interface Props { data: MemberAccessData | null; loading: boolean; error: string | null; onRefresh: () => void; onGrant: (type: ProductType, id: string) => void }
const sources: Record<string, string> = { ACADEMY_LICENSE: "Academy license", NONE: "No access", MANUAL_GRANT: "Admin grant", STRIPE_PURCHASE: "Purchased", DIRECT_PURCHASE: "Purchased", TRAINING_LICENSE: "Training license", ENROLLED: "Enrolled", BUNDLE_INCLUDED: "Included in bundle" };

function ProductImage({ item, kind }: { item: AccessItem; kind: ProductType }) {
  const [failed, setFailed] = useState(false);
  const src = item.thumbnail || item.badgeImage;
  const Icon = kind === "course" ? BookOpen : kind === "bundle" ? Layers : Package;
  return <div className="member-product-image">{src && !failed ? <img src={src} alt="" width={80} height={64} loading="lazy" onError={() => setFailed(true)} /> : <Icon size={24} aria-hidden="true" />}</div>;
}

export function MemberAccessPanel({ data, loading, error, onRefresh, onGrant }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const groups = [
    { type: "bundle" as const, label: "Bundles", icon: Layers, items: data?.bundles ?? [] },
    { type: "toolkit" as const, label: "Toolkits", icon: Package, items: data?.toolkits ?? [] },
    { type: "course" as const, label: "Courses", icon: BookOpen, items: data?.courses ?? [] },
  ];
  const matches = (item: AccessItem) => `${item.name ?? item.title} ${item.category ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()) && (filter === "all" || (filter === "active" ? item.hasAccess : !item.hasAccess));
  return <section className="member-access" aria-label="Learning access" aria-busy={loading}>
    <div className="member-access-heading"><div><h3>Learning access</h3><p>Review toolkits, courses, and bundles before granting access.</p></div><button type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh access"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button></div>
    {error && <div role="alert" className="member-access-error">{error} <button onClick={onRefresh}>Try again</button></div>}
    <div className="member-access-controls"><label><Search size={18}/><input aria-label="Search learning products" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search courses, toolkits, or bundles"/></label><select aria-label="Filter access" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All access</option><option value="active">Has access</option><option value="missing">Needs access</option></select></div>
    {!data && loading ? <p role="status">Loading access records…</p> : groups.map(group => {
      const Icon = group.icon; const items = group.items.filter(matches);
      return <section key={group.type}><h4><Icon size={18}/>{group.label}<span>{group.items.filter(i => i.hasAccess).length} / {group.items.length} unlocked</span></h4>{items.length ? items.map(item => <div className="member-access-row" key={item.id}><ProductImage item={item} kind={group.type}/><div className="member-access-product"><strong>{item.name ?? item.title}</strong><small>{item.category?.replaceAll("_", " ")}{item.grantedAt ? ` · Added ${new Date(item.grantedAt).toLocaleDateString()}` : ""}</small></div><span className={item.hasAccess ? "member-access-status active" : "member-access-status"}>{item.hasAccess && <CheckCircle2 size={14}/>} {sources[item.accessSource] ?? item.accessSource}</span>{!item.hasAccess && <button type="button" onClick={() => onGrant(group.type, item.id)}><KeyRound size={15}/>Grant access</button>}</div>) : <p className="member-access-empty">No {group.label.toLowerCase()} match this filter.</p>}</section>;
    })}
    <section><h4><BookOpen size={18}/>Academy licenses <span>{data?.academyLicenses?.length ?? 0} records</span></h4><p className="member-access-help">Academy licenses are shown separately from the main site’s purchase and enrollment records. Organization and assigned licenses may also provide access.</p>{data?.academyLicenses?.map(license => <div className="member-access-row" key={license.id}><div className="member-access-product"><strong>{license.title}</strong><small>{license.organization} · {license.seats} seats · {license.expiresAt ? `Expires ${new Date(license.expiresAt).toLocaleDateString()}` : "No expiry"}</small></div><span className="member-access-status">{license.status}</span></div>)}{data && !data.academyLicenses?.length && <p className="member-access-empty">No Academy license records linked to this member.</p>}</section>
  </section>;
}
