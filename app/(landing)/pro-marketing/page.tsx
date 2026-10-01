"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { Loader2, Send, Users, DollarSign, CheckCircle2, Clock, XCircle, ChevronRight, Megaphone, BarChart3, Lock, MonitorPlay, Image as ImageIcon, Calendar, ExternalLink, Tv, Star, ShoppingBag, Trash2 } from "lucide-react";
import { canAccessProMarketing } from "@/lib/marketingAccess";
import { BLAST_TIERS } from "@/lib/blast-pricing";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

interface Blast { id: string; subject: string; recipientCount: number; priceUsd: number; status: string; createdAt: string; deliveredAt?: string; rejectionReason?: string; }
interface Quota { used: number; limit: number; remaining: number; }

const STATUS_UI: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING_PAYMENT:   { label: "Awaiting Payment",  color: "text-amber-600 bg-amber-50 border-amber-200",  icon: Clock },
  PENDING_APPROVAL:  { label: "Pending Review",     color: "text-blue-600 bg-blue-50 border-blue-200",    icon: Clock },
  APPROVED:          { label: "Approved",           color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  DELIVERED:         { label: "Delivered",          color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  REJECTED:          { label: "Rejected",           color: "text-red-600 bg-red-50 border-red-200",       icon: XCircle },
  ACTIVE:            { label: "Active",             color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  EXPIRED:           { label: "Expired",            color: "text-slate-500 bg-slate-50 border-slate-200",  icon: Clock },
};

const AD_PLACEMENTS = [
  { key: "CENTER_COLUMN", label: "Center Column", desc: "In-feed ad between posts", price: 199, dims: "1200 × 628 px", icon: MonitorPlay },
  { key: "LEFT_COLUMN",   label: "Left Column",   desc: "Sidebar ad panel",        price: 299, dims: "300 × 600 px",  icon: Tv },
] as const;

const AD_DURATIONS = [1, 3, 6, 12];

interface ProAd { id: string; title: string; placement: string; durationMonths: number; priceUsd: number; status: string; createdAt: string; startsAt?: string; endsAt?: string; rejectionReason?: string; }
interface FeaturedReq { id: string; listingId: string; durationMonths: number; priceUsd: number; status: string; createdAt: string; endsAt?: string; rejectionReason?: string; listing: { id: string; title: string; category: string; images: string[] }; }
interface MyListing { id: string; title: string; category: string; images: string[]; status: string; }
const FEATURED_DURATIONS = [1, 3, 6, 12];

function ProMarketingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppSelector(s => s.auth.user);

  const [step, setStep]           = useState<1|2|3>(1);
  const [roles, setRoles]         = useState<string[]>([]);
  const [cities, setCities]       = useState("");
  const [states, setStates]       = useState<string[]>([]);
  const [audience, setAudience]   = useState<{ count: number; price: number } | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const [subject, setSubject]     = useState("");
  const [content, setContent]     = useState("");

  const [checking, setChecking]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  const [blasts, setBlasts]       = useState<Blast[]>([]);
  const [quota, setQuota]         = useState<Quota | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [mounted, setMounted]     = useState(false);

  // ── Pro Advertising state ──
  const [mainTab, setMainTab]         = useState<"blast"|"advertising"|"featured">("blast");
  const [adPlacement, setAdPlacement] = useState<"CENTER_COLUMN"|"LEFT_COLUMN">("CENTER_COLUMN");
  const [adDuration, setAdDuration]   = useState(1);
  const [adTitle, setAdTitle]         = useState("");
  const [adDesc, setAdDesc]           = useState("");
  const [adImageUrl, setAdImageUrl]   = useState("");
  const [adLinkUrl, setAdLinkUrl]     = useState("");
  const [adStartDate, setAdStartDate] = useState("");
  const [adSubmitting, setAdSubmitting] = useState(false);
  const [adError, setAdError]         = useState("");
  const [adSuccess, setAdSuccess]     = useState("");
  const [myAds, setMyAds]             = useState<ProAd[]>([]);
  const [adsLoading, setAdsLoading]   = useState(true);

  const adPrice = (adPlacement === "CENTER_COLUMN" ? 199 : 299) * adDuration;

  // ── Delete state ──
  const [deletingAdId, setDeletingAdId]     = useState("");
  const [deletingFeatId, setDeletingFeatId] = useState("");

  const handleDeleteAd = async (id: string) => {
    if (!confirm("Remove this ad?")) return;
    setDeletingAdId(id);
    const res = await fetch(`/api/pro-ads/${id}`, { method: "DELETE" });
    if (res.ok) setMyAds(p => p.filter(a => a.id !== id));
    setDeletingAdId("");
  };

  const handleDeleteFeat = async (id: string) => {
    if (!confirm("Cancel this featured request?")) return;
    setDeletingFeatId(id);
    const res = await fetch(`/api/featured-listing/${id}`, { method: "DELETE" });
    if (res.ok) setMyFeatured(p => p.filter(f => f.id !== id));
    setDeletingFeatId("");
  };

  // ── Featured Listing state ──
  const [featuredListingId, setFeaturedListingId] = useState("");
  const [featuredDuration, setFeaturedDuration]   = useState(1);
  const [featuredSubmitting, setFeaturedSubmitting] = useState(false);
  const [featuredError, setFeaturedError]         = useState("");
  const [featuredSuccess, setFeaturedSuccess]     = useState("");
  const [myListings, setMyListings]               = useState<MyListing[]>([]);
  const [myFeatured, setMyFeatured]               = useState<FeaturedReq[]>([]);
  const [listingsLoading, setListingsLoading]     = useState(true);
  const [featuredLoading, setFeaturedLoading]     = useState(true);

  const featuredPrice = 79 * featuredDuration;

  const hasMarketingAccess = mounted && canAccessProMarketing(user);


  useEffect(() => { setMounted(true); }, []);

  // Load history
  const loadHistory = useCallback(() => {
    if (!hasMarketingAccess) return;
    setHistoryLoading(true);
    fetch("/api/message-blast/my")
      .then(r => r.json())
      .then(d => { setBlasts(d.blasts ?? []); setQuota(d.quota ?? null); })
      .finally(() => setHistoryLoading(false));
  }, [hasMarketingAccess]);

  const loadMyAds = useCallback(() => {
    if (!hasMarketingAccess) return;
    setAdsLoading(true);
    fetch("/api/pro-ads/my").then(r => r.json())
      .then(d => setMyAds(Array.isArray(d) ? d : []))
      .finally(() => setAdsLoading(false));
  }, [hasMarketingAccess]);

  const loadFeatured = useCallback(() => {
    if (!hasMarketingAccess) return;
    setListingsLoading(true);
    setFeaturedLoading(true);
    fetch("/api/listings/my").then(r => r.json())
      .then(d => setMyListings(Array.isArray(d) ? d : []))
      .finally(() => setListingsLoading(false));
    fetch("/api/featured-listing/my").then(r => r.json())
      .then(d => setMyFeatured(Array.isArray(d) ? d : []))
      .finally(() => setFeaturedLoading(false));
  }, [hasMarketingAccess]);

  useEffect(() => { loadHistory(); loadMyAds(); loadFeatured(); }, [loadHistory, loadMyAds, loadFeatured]);

  // Handle return from Stripe — blast
  useEffect(() => {
    const blastId   = searchParams.get("blast_id");
    const sessionId = searchParams.get("session_id");
    const ok        = searchParams.get("blast_success");
    if (ok && blastId && sessionId) {
      setChecking(true);
      fetch("/api/message-blast/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blastId, sessionId }),
      })
        .then(() => { setSuccess("Payment received! Your blast is pending admin review."); loadHistory(); router.replace("/pro-marketing"); })
        .finally(() => setChecking(false));
    }
    // Handle return from Stripe — ad
    const adId = searchParams.get("ad_id");
    const adSess = searchParams.get("session_id");
    const adOk = searchParams.get("ad_success");
    if (adOk && adId && adSess) {
      setChecking(true);
      fetch("/api/pro-ads/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId, sessionId: adSess }),
      })
        .then(() => { setAdSuccess("Payment received! Your ad is pending admin review and will go live once approved."); loadMyAds(); router.replace("/pro-marketing"); })
        .finally(() => setChecking(false));
    }
    // Handle return from Stripe — featured listing
    const featuredId = searchParams.get("featured_id");
    const featSess = searchParams.get("session_id");
    const featOk = searchParams.get("featured_success");
    if (featOk && featuredId && featSess) {
      setChecking(true);
      fetch("/api/featured-listing/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featuredId, sessionId: featSess }),
      })
        .then(() => { setFeaturedSuccess("Payment received! Your listing is pending admin approval to become Featured."); loadFeatured(); router.replace("/pro-marketing"); })
        .finally(() => setChecking(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calcAudience = async () => {
    setCalcLoading(true); setAudience(null);
    const params = new URLSearchParams();
    if (roles.length)  params.set("roles",  roles.join(","));
    if (cities.trim()) params.set("cities", cities);
    if (states.length) params.set("states", states.join(","));
    const r = await fetch(`/api/message-blast/audience?${params}`);
    const d = await r.json();
    setAudience(d); setCalcLoading(false);
  };

  const handleCheckout = async () => {
    setError(""); setSubmitting(true);
    const cityList = cities.split(",").map(s => s.trim()).filter(Boolean);
    const r = await fetch("/api/message-blast/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, content, filterRoles: roles, filterCities: cityList, filterStates: states }),
    });
    const d = await r.json();
    setSubmitting(false);
    if (!r.ok) { setError(d.error ?? "Failed"); return; }
    window.location.href = d.url;
  };

  const toggleRole  = (r: string) => setRoles(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);
  const toggleState = (s: string) => setStates(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const handleAdCheckout = async () => {
    setAdError(""); setAdSubmitting(true);
    if (!adTitle.trim() || !adImageUrl.trim() || !adLinkUrl.trim()) { setAdError("Title, image URL, and link URL are required."); setAdSubmitting(false); return; }
    const r = await fetch("/api/pro-ads/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: adTitle, description: adDesc, imageUrl: adImageUrl, linkUrl: adLinkUrl, placement: adPlacement, durationMonths: adDuration, startsAt: adStartDate || null }),
    });
    const d = await r.json();
    setAdSubmitting(false);
    if (!r.ok) { setAdError(d.error ?? "Checkout failed"); return; }
    window.location.href = d.url;
  };

  const handleFeaturedCheckout = async () => {
    setFeaturedError(""); setFeaturedSubmitting(true);
    if (!featuredListingId) { setFeaturedError("Please select a listing."); setFeaturedSubmitting(false); return; }
    const r = await fetch("/api/featured-listing/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: featuredListingId, durationMonths: featuredDuration }),
    });
    const d = await r.json();
    setFeaturedSubmitting(false);
    if (!r.ok) { setFeaturedError(d.error ?? "Checkout failed"); return; }
    window.location.href = d.url;
  };

  // Upgrade gate
  if (!hasMarketingAccess) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#0a1628] flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8 text-[#ffbe24]" />
          </div>
          <h1 className="text-2xl font-black text-[#0a1628] mb-2">Marketplace Plus Required</h1>
          <p className="text-slate-500 text-sm mb-8">Pro Marketing message blasts are exclusive to Marketplace Plus members. Upgrade to send targeted sponsored messages to thousands of platform members.</p>
          <div className="space-y-3 text-left mb-8">
            {BLAST_TIERS.map(t => (
              <div key={t.label} className="flex items-center justify-between text-sm border border-slate-100 rounded-xl px-4 py-2.5">
                <span className="text-slate-600">{t.label}</span>
                <span className="font-bold text-[#0a1628]">{t.price ? `$${t.price}` : "Custom"}</span>
              </div>
            ))}
          </div>
          <Link href="/upgrade" className="block w-full text-center bg-[#0a1628] text-[#ffbe24] font-black py-3.5 rounded-2xl hover:bg-[#1a3a6b] transition-all">
            Upgrade to Marketplace Plus
          </Link>
        </div>
      </div>
    );
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><Loader2 className="w-8 h-8 animate-spin text-[#0a1628] mx-auto mb-2" /><p className="text-slate-500 text-sm">Verifying payment…</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      {/* Hero */}
      <div className="bg-[#0a1628] text-white px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#ffbe24]/20 flex items-center justify-center"><Megaphone className="w-5 h-5 text-[#ffbe24]" /></div>
            <span className="text-[#ffbe24] text-sm font-bold uppercase tracking-widest">Pro Marketing</span>
          </div>
          <h1 className="text-4xl font-black mb-2">Pro Marketing</h1>
          <p className="text-white/60 text-base max-w-xl">Grow your reach with message blasts and display advertising. Marketplace Plus exclusive.</p>
          {/* ── Main Tabs ── */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {([
              { key: "blast",       icon: Megaphone,    label: "Message Blast",    sub: "Targeted inbox campaigns" },
              { key: "advertising", icon: MonitorPlay,  label: "Pro Advertising",   sub: "Banner ads on the platform" },
              { key: "featured",    icon: Star,         label: "Featured Listing",  sub: "Top placement in marketplace" },
            ] as const).map(t => {
              const Icon = t.icon;
              const active = mainTab === t.key;
              return (
                <button key={t.key} onClick={() => setMainTab(t.key)}
                  className={`flex flex-col items-start gap-1 px-5 py-4 rounded-2xl font-bold text-base transition-all ${
                    active ? "bg-[#ffbe24] text-[#0a1628]" : "bg-white/10 text-white hover:bg-white/20"
                  }`}>
                  <Icon className="w-5 h-5 mb-0.5" />
                  <span className="font-black text-base">{t.label}</span>
                  <span className={`text-xs font-normal leading-tight ${active ? "text-[#0a1628]/60" : "text-white/50"}`}>{t.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Blast tab content */}
        {mainTab === "blast" && (<>
        {/* Quota pill — only in blast tab */}
        {quota && (
          <div className="flex items-center gap-3 bg-[#0a1628] text-white rounded-2xl px-5 py-3.5">
            <BarChart3 className="w-5 h-5 text-[#ffbe24] shrink-0" />
            <div>
              <span className="text-sm font-bold">{quota.remaining} of {quota.limit} blasts remaining this month</span>
              {quota.remaining === 0 && <p className="text-xs text-white/50 mt-0.5">You've used all your blasts for this month.</p>}
            </div>
            <div className="ml-auto flex gap-1">
              {Array.from({ length: quota.limit }).map((_, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < quota.used ? "bg-[#ffbe24]" : "bg-white/20"}`} />
              ))}
            </div>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-emerald-700 text-sm font-medium">{success}</p>
          </div>
        )}

        {/* Step indicator */}
        {!success && (
          <div className="flex items-center gap-2">
            {([1,2,3] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <button onClick={() => step > s && setStep(s)}
                  className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-all ${step === s ? "bg-[#0a1628] text-white" : step > s ? "bg-emerald-500 text-white cursor-pointer" : "bg-slate-200 text-slate-400"}`}>
                  {step > s ? "✓" : s}
                </button>
                <span className={`text-sm font-medium ${step === s ? "text-[#0a1628]" : "text-slate-400"}`}>
                  {["Audience","Message","Checkout"][i]}
                </span>
                {i < 2 && <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />}
              </div>
            ))}
          </div>
        )}

        {/* STEP 1 — Audience */}
        {step === 1 && !success && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6">
            <h2 className="text-xl font-black text-[#0a1628]">Define Your Audience</h2>


            {/* City filter */}
            <div>
              <label className="block text-sm font-bold text-[#0a1628] mb-2">Cities <span className="text-slate-400 font-normal">(comma-separated)</span></label>
              <input value={cities} onChange={e => setCities(e.target.value)}
                placeholder="e.g. Dallas, Houston, Austin"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1628]/20 focus:border-[#0a1628]/40" />
            </div>

            {/* State filter */}
            <div>
              <label className="block text-sm font-bold text-[#0a1628] mb-3">States <span className="text-slate-400 font-normal">(leave blank for all)</span></label>
              <div className="flex flex-wrap gap-2">
                {US_STATES.map(s => (
                  <button key={s} onClick={() => toggleState(s)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${states.includes(s) ? "bg-[#0a1628] text-white border-[#0a1628]" : "border-slate-200 text-slate-500 hover:border-slate-400"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button onClick={calcAudience} disabled={calcLoading}
                className="flex items-center gap-2 bg-[#0a1628] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#1a3a6b] disabled:opacity-50 transition-all">
                {calcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                Calculate Audience
              </button>
              {audience && (
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3">
                  <div className="text-center"><p className="text-2xl font-black text-[#0a1628]">{audience.count.toLocaleString()}</p><p className="text-xs text-slate-400">recipients</p></div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center"><p className="text-2xl font-black text-emerald-600">${audience.price}</p><p className="text-xs text-slate-400">one-time</p></div>
                </div>
              )}
            </div>

            {audience && audience.count > 0 && (
              <button onClick={() => setStep(2)}
                className="w-full bg-[#ffbe24] text-[#0a1628] font-black py-3.5 rounded-2xl hover:bg-[#ffbe24] transition-all">
                Continue to Message →
              </button>
            )}
            {audience && audience.count === 0 && (
              <p className="text-red-500 text-sm">No members match these filters. Try broadening your selection.</p>
            )}
          </div>
        )}

        {/* STEP 2 — Message */}
        {step === 2 && !success && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6">
            <h2 className="text-xl font-black text-[#0a1628]">Compose Your Message</h2>

            <div>
              <label className="block text-sm font-bold text-[#0a1628] mb-2">Subject Line</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={100}
                placeholder="e.g. Special offer for tax professionals…"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1628]/20" />
              <p className="text-xs text-slate-400 mt-1 text-right">{subject.length}/100</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#0a1628] mb-2">Message Body</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={6} maxLength={1000}
                placeholder="Write your sponsored message here…"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1628]/20 resize-none" />
              <p className="text-xs text-slate-400 mt-1 text-right">{content.length}/1000</p>
            </div>

            {/* Preview */}
            {(subject || content) && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black bg-amber-400 text-[#0a1628] px-2 py-0.5 rounded-full uppercase tracking-wide">Sponsored</span>
                  <span className="text-xs text-slate-500">Preview in recipient's inbox</span>
                </div>
                <p className="font-bold text-[#0a1628] text-sm">{subject || "Your subject here"}</p>
                <p className="text-slate-600 text-sm mt-1 whitespace-pre-wrap">{content || "Your message here…"}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">← Back</button>
              <button onClick={() => setStep(3)} disabled={!subject.trim() || !content.trim()}
                className="flex-1 bg-[#ffbe24] text-[#0a1628] font-black py-3 rounded-2xl hover:bg-[#ffbe24] disabled:opacity-40 transition-all">
                Review & Checkout →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Checkout */}
        {step === 3 && !success && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6">
            <h2 className="text-xl font-black text-[#0a1628]">Review & Pay</h2>

            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Recipients</span><span className="font-bold text-[#0a1628]">{audience?.count.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Subject</span><span className="font-bold text-[#0a1628] max-w-[240px] text-right truncate">{subject}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Filters</span>
                <span className="font-medium text-[#0a1628] text-right text-xs max-w-[240px]">
                  {[roles.join(", "), cities, states.join(", ")].filter(Boolean).join(" · ") || "All members"}
                </span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex justify-between"><span className="font-bold text-[#0a1628]">Total</span><span className="text-2xl font-black text-emerald-600">${audience?.price}</span></div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-700 space-y-1">
              <p className="font-bold">What happens next:</p>
              <p>1. Complete Stripe payment</p>
              <p>2. An admin reviews your blast (usually within 24h)</p>
              <p>3. Upon approval, messages are delivered to all recipients with a <strong>Sponsored</strong> badge</p>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">← Back</button>
              <button onClick={handleCheckout} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-[#0a1628] text-white font-black py-3.5 rounded-2xl hover:bg-[#1a3a6b] disabled:opacity-50 transition-all">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                Pay ${audience?.price} via Stripe
              </button>
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8">
          <h2 className="text-xl font-black text-[#0a1628] mb-6">My Blasts</h2>
          {historyLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
          ) : blasts.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No blasts yet. Create your first one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blasts.map(b => {
                const s = STATUS_UI[b.status] ?? STATUS_UI.PENDING_PAYMENT;
                const Icon = s.icon;
                return (
                  <div key={b.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#0a1628] text-base truncate">{b.subject}</p>
                      <p className="text-sm text-slate-400 mt-0.5">{b.recipientCount.toLocaleString()} recipients · ${b.priceUsd} · {new Date(b.createdAt).toLocaleDateString()}</p>
                      {b.rejectionReason && <p className="text-sm text-red-500 mt-0.5">Reason: {b.rejectionReason}</p>}
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs font-semibold border px-3 py-1 rounded-full ${s.color}`}>
                      <Icon className="w-3 h-3" />{s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </>)}

        {/* Advertising tab content */}
        {mainTab === "advertising" && (<>
          {adSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-emerald-700 text-sm font-medium">{adSuccess}</p>
            </div>
          )}

          {/* ── 2-column layout: form left, preview right ── */}
          <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">

            {/* LEFT: form cards */}
            <div className="space-y-6">
              {/* Placement picker */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-black text-[#0a1628] mb-1">Choose Placement</h2>
                  <p className="text-slate-500 text-sm">Select where your ad will appear on the platform.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {AD_PLACEMENTS.map(p => {
                    const Icon = p.icon;
                    const active = adPlacement === p.key;
                    return (
                      <button key={p.key} onClick={() => setAdPlacement(p.key as "CENTER_COLUMN"|"LEFT_COLUMN")}
                        className={`text-left p-4 rounded-2xl border-2 transition-all ${active ? "border-[#0a1628] bg-[#0a1628]/5" : "border-slate-200 hover:border-slate-300"}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 ${active ? "bg-[#0a1628]" : "bg-slate-100"}`}>
                          <Icon className={`w-4 h-4 ${active ? "text-[#ffbe24]" : "text-slate-500"}`} />
                        </div>
                        <p className={`font-black text-sm ${active ? "text-[#0a1628]" : "text-slate-700"}`}>{p.label}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{p.desc}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className={`font-black text-base ${active ? "text-emerald-600" : "text-slate-500"}`}>${p.price}<span className="text-xs font-medium">/mo</span></span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{p.dims}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-bold text-[#0a1628] mb-2">Duration</label>
                  <div className="flex flex-wrap gap-2">
                    {AD_DURATIONS.map(d => (
                      <button key={d} onClick={() => setAdDuration(d)}
                        className={`px-4 py-2 rounded-xl border font-bold text-sm transition-all ${adDuration === d ? "bg-[#0a1628] text-white border-[#0a1628]" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                        {d} Month{d > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="text-slate-600 text-sm">Total ({adDuration} mo, {adPlacement === "CENTER_COLUMN" ? "Center Col." : "Left Col."})</span>
                  <span className="text-xl font-black text-emerald-600">${adPrice}</span>
                </div>
              </div>

              {/* Ad details form */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-lg font-black text-[#0a1628]">Ad Details</h2>

                <div>
                  <label className="block text-sm font-bold text-[#0a1628] mb-1.5">Ad Title <span className="text-red-400">*</span></label>
                  <input value={adTitle} onChange={e => setAdTitle(e.target.value)} maxLength={80}
                    placeholder="e.g. TaxCompPro Premium Services"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1628]/20" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#0a1628] mb-1.5">Short Description <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input value={adDesc} onChange={e => setAdDesc(e.target.value)} maxLength={140}
                    placeholder="One-line tagline shown below your banner"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1628]/20" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#0a1628] mb-1">Banner Image URL <span className="text-red-400">*</span></label>
                  <p className="text-xs text-slate-400 mb-1.5">{adPlacement === "CENTER_COLUMN" ? "1200 × 628 px (landscape)" : "300 × 600 px (portrait)"}</p>
                  <input value={adImageUrl} onChange={e => setAdImageUrl(e.target.value)}
                    placeholder="https://yoursite.com/banner.jpg"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1628]/20" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#0a1628] mb-1.5"><ExternalLink className="w-3.5 h-3.5 inline mr-1" />Link URL <span className="text-red-400">*</span></label>
                  <input value={adLinkUrl} onChange={e => setAdLinkUrl(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1628]/20" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#0a1628] mb-1.5"><Calendar className="w-3.5 h-3.5 inline mr-1" />Start Date <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="date" value={adStartDate} onChange={e => setAdStartDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1628]/20" />
                </div>

                {adError && <p className="text-red-500 text-sm">{adError}</p>}

                <button onClick={handleAdCheckout} disabled={adSubmitting || !adTitle.trim() || !adImageUrl.trim() || !adLinkUrl.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-[#0a1628] text-white font-black py-3.5 rounded-2xl hover:bg-[#1a3a6b] disabled:opacity-40 transition-all">
                  {adSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <DollarSign className="w-5 h-5" />}
                  Pay ${adPrice} via Stripe
                </button>
              </div>
            </div>

            {/* RIGHT: sticky live preview */}
            <div className="lg:sticky lg:top-[80px] space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
                <h3 className="font-black text-[#0a1628] text-sm">Live Preview</h3>
                <p className="text-[11px] text-slate-400">{adPlacement === "CENTER_COLUMN" ? "Center column — between feed posts" : "Left sidebar panel"}</p>

                {adPlacement === "CENTER_COLUMN" ? (
                  <div className="bg-slate-50 rounded-2xl p-3 space-y-2">
                    <div className="bg-white rounded-xl p-2.5 flex gap-2.5 border border-slate-100">
                      <div className="w-7 h-7 rounded-full bg-slate-200 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5 pt-0.5">
                        <div className="h-2 bg-slate-200 rounded animate-pulse w-1/3" />
                        <div className="h-1.5 bg-slate-100 rounded animate-pulse w-2/3" />
                      </div>
                    </div>
                    <div className="rounded-xl overflow-hidden border-2 border-[#ffbe24] shadow relative">
                      <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 bg-[#ffbe24] text-[#0a1628] text-[8px] font-black px-1.5 py-0.5 rounded-full"><MonitorPlay className="w-2 h-2" />SPONSORED</div>
                      {adImageUrl ? (
                        <img src={adImageUrl} alt="Preview" className="w-full aspect-[16/9] object-cover" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                      ) : (
                        <div className="w-full aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center gap-1.5">
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                          <p className="text-[10px] text-slate-400">1200 × 628 px</p>
                        </div>
                      )}
                      <div className="px-3 py-2 bg-white border-t border-slate-100">
                        <p className="font-bold text-[#0a1628] text-xs">{adTitle || "Your Ad Title"}</p>
                        {adDesc && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{adDesc}</p>}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-2.5 flex gap-2.5 border border-slate-100">
                      <div className="w-7 h-7 rounded-full bg-slate-200 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5 pt-0.5">
                        <div className="h-2 bg-slate-200 rounded animate-pulse w-1/4" />
                        <div className="h-1.5 bg-slate-100 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <div className="flex gap-2">
                      <div className="w-28 shrink-0 space-y-1.5">
                        {[...Array(6)].map((_, i) => <div key={i} className="h-6 bg-slate-200 rounded-lg animate-pulse" />)}
                      </div>
                      <div className="flex-1">
                        <div className="rounded-xl overflow-hidden border-2 border-[#ffbe24] shadow relative">
                          <div className="absolute top-1 left-1 z-10 flex items-center gap-0.5 bg-[#ffbe24] text-[#0a1628] text-[8px] font-black px-1 py-0.5 rounded-full"><Tv className="w-2 h-2" />AD</div>
                          {adImageUrl ? (
                            <img src={adImageUrl} alt="Preview" className="w-full aspect-[19/8] object-cover" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                          ) : (
                            <div className="w-full aspect-[19/8] bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center gap-1">
                              <ImageIcon className="w-5 h-5 text-slate-300" />
                              <p className="text-[9px] text-slate-400">300 × 600 px</p>
                            </div>
                          )}
                          <div className="px-2 py-1.5 bg-white border-t border-slate-100">
                            <p className="font-bold text-[#0a1628] text-[10px]">{adTitle || "Your Ad Title"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* My Ads history */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8">
            <h2 className="text-xl font-black text-[#0a1628] mb-6">My Ads</h2>
            {adsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
            ) : myAds.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <MonitorPlay className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No ads yet. Create your first ad above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myAds.map(ad => {
                  const s = STATUS_UI[ad.status] ?? STATUS_UI.PENDING_PAYMENT;
                  const Icon = s.icon;
                  return (
                    <div key={ad.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#0a1628] text-base truncate">{ad.title}</p>
                        <p className="text-sm text-slate-400 mt-0.5">
                          {ad.placement === "CENTER_COLUMN" ? "Center Column" : "Left Column"} · {ad.durationMonths} mo · ${ad.priceUsd} · {new Date(ad.createdAt).toLocaleDateString()}
                        </p>
                        {ad.endsAt && <p className="text-sm text-slate-400">Ends {new Date(ad.endsAt).toLocaleDateString()}</p>}
                        {ad.rejectionReason && <p className="text-sm text-red-500 mt-0.5">Reason: {ad.rejectionReason}</p>}
                      </div>
                      <span className={`flex items-center gap-1.5 text-xs font-semibold border px-3 py-1 rounded-full ${s.color}`}>
                        <Icon className="w-3 h-3" />{s.label}
                      </span>
                      <button onClick={() => handleDeleteAd(ad.id)} disabled={deletingAdId === ad.id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-40">
                        {deletingAdId === ad.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>)}

        {/* ─── FEATURED LISTING TAB ─── */}
        {mainTab === "featured" && (<>
          {featuredSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-emerald-700 text-sm font-medium">{featuredSuccess}</p>
            </div>
          )}

          {/* Info banner */}
          <div className="bg-gradient-to-r from-[#ffbe24]/20 to-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-[#0a1628] text-base">Featured Listing — $79<span className="text-sm font-medium text-slate-500">/month</span></p>
              <p className="text-slate-500 text-sm mt-1">Your listing gets a gold ★ Featured badge, highlighted placement at the top of marketplace results, and boosted visibility. Admin-approved within 24h.</p>
            </div>
          </div>

          {/* Listing picker */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6">
            <h2 className="text-xl font-black text-[#0a1628]">Select a Listing to Feature</h2>
            {listingsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
            ) : myListings.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">You have no approved listings yet.</p>
                <Link href="/marketplace" className="mt-3 inline-block text-xs font-bold text-[#0a1628] border border-[#0a1628]/20 rounded-xl px-4 py-2 hover:bg-[#0a1628] hover:text-white transition-all">Create a Listing</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myListings.map(l => {
                  const active = featuredListingId === l.id;
                  return (
                    <button key={l.id} onClick={() => setFeaturedListingId(l.id)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${active ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                          {l.images[0]
                            ? <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover" />
                            : <ShoppingBag className="w-5 h-5 text-slate-400 m-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm truncate ${active ? "text-[#0a1628]" : "text-slate-700"}`}>{l.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{l.category}</p>
                        </div>
                        {active && <Star className="w-4 h-4 text-amber-500 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Duration + checkout */}
            {featuredListingId && (
              <>
                <div>
                  <label className="block text-sm font-bold text-[#0a1628] mb-3">Duration</label>
                  <div className="flex flex-wrap gap-2">
                    {FEATURED_DURATIONS.map(d => (
                      <button key={d} onClick={() => setFeaturedDuration(d)}
                        className={`px-5 py-2.5 rounded-xl border font-bold text-sm transition-all ${featuredDuration === d ? "bg-[#0a1628] text-white border-[#0a1628]" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                        {d} Month{d > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between">
                  <span className="text-slate-600 text-sm">Total ({featuredDuration} month{featuredDuration > 1 ? "s" : ""} featured)</span>
                  <span className="text-2xl font-black text-amber-600">${featuredPrice}</span>
                </div>
                {featuredError && <p className="text-red-500 text-sm">{featuredError}</p>}
                <button onClick={handleFeaturedCheckout} disabled={featuredSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white font-black py-4 rounded-2xl hover:bg-amber-600 disabled:opacity-40 transition-all">
                  {featuredSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className="w-5 h-5" />}
                  Pay ${featuredPrice} — Feature This Listing
                </button>
              </>
            )}
          </div>

          {/* Request history */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8">
            <h2 className="text-xl font-black text-[#0a1628] mb-6">My Featured Requests</h2>
            {featuredLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
            ) : myFeatured.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No featured requests yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myFeatured.map(fr => {
                  const s = STATUS_UI[fr.status] ?? STATUS_UI.PENDING_PAYMENT;
                  const Icon = s.icon;
                  return (
                    <div key={fr.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        {fr.listing.images[0]
                          ? <img src={fr.listing.images[0]} alt={fr.listing.title} className="w-full h-full object-cover" />
                          : <Star className="w-4 h-4 text-slate-400 m-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#0a1628] text-sm truncate">{fr.listing.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{fr.durationMonths} month{fr.durationMonths > 1 ? "s" : ""} · ${fr.priceUsd} · {new Date(fr.createdAt).toLocaleDateString()}</p>
                        {fr.endsAt && fr.status === "ACTIVE" && <p className="text-xs text-emerald-600">Active until {new Date(fr.endsAt).toLocaleDateString()}</p>}
                        {fr.rejectionReason && <p className="text-xs text-red-500 mt-0.5">Reason: {fr.rejectionReason}</p>}
                      </div>
                      <span className={`flex items-center gap-1.5 text-xs font-semibold border px-3 py-1 rounded-full ${s.color}`}>
                        <Icon className="w-3 h-3" />{s.label}
                      </span>
                      <button onClick={() => handleDeleteFeat(fr.id)} disabled={deletingFeatId === fr.id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-40">
                        {deletingFeatId === fr.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>)}
      </div>
    </div>
  );
}

export default function ProMarketingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>}>
      <ProMarketingContent />
    </Suspense>
  );
}
