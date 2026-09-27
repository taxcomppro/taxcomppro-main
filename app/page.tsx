"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag, Users, GraduationCap,
  ArrowRight, CheckCircle2, TrendingUp, Star, Shield,
  Radio, Sparkles, Mic, Calendar, Volume2, Play
} from "lucide-react";
import { ArrowDown01Icon } from "hugeicons-react";
import Navbar from "@/components/landing/Navbar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { PRICING_PLANS } from "@/lib/pricing-plans";
import PricingCard from "@/components/pricing/PricingCard";

const features = [
  {
    img: "/features/professional_network.webp",
    title: "Professional Network",
    desc: "Connect with verified CPAs, EAs, tax attorneys, and business experts nationwide to build strategic referral channels."
  },
  {
    img: "/features/markeplace.webp",
    title: "Pro Marketplace",
    desc: "Buy and sell tax software, office workflows, due diligence toolkits, coaching sessions, and digital products."
  },
  {
    img: "/features/communitues.webp",
    title: "Niche Groups",
    desc: "Join high-level masterminds or launch your own branded community for peer support and industry masterclasses."
  },
  {
    img: "/features/atlas.webp",
    title: "ATLAS AI Tax Assistant",
    desc: "Instant, real-time AI guidance for IRC codes, Schedule C due diligence, IRS notice resolution, and compliance queries."
  },
  {
    img: "/protalk.png",
    title: "Pro Talks Live Hub",
    desc: "Host interactive breakout rooms, live tax filing workshops, and audio & video AMAs directly with members."
  },
  {
    img: "/features/members-only-access.webp",
    title: "Members-Only Vault",
    desc: "Restricted, secure environment with private discussion boards, verified badges, and proprietary document libraries."
  },
];

const sampleMarketplace = [
  {
    title: "Complete 1040 Due Diligence Checklist 2026",
    seller: "Sarah Jenkins, CPA",
    price: "$79",
    category: "Toolkit",
    rating: "5.0",
    reviews: "48",
    color: "from-amber-500/15 to-orange-500/10 text-amber-600",
    icon: Shield,
  },
  {
    title: "IRS Audit Defense & Representation Course",
    seller: "Marcus Sterling, EA",
    price: "$199",
    category: "Masterclass",
    rating: "4.9",
    reviews: "64",
    color: "from-blue-500/15 to-indigo-500/10 text-blue-600",
    icon: GraduationCap,
  },
  {
    title: "Multi-Location Tax Office Workflow SOPs",
    seller: "Apex Tax Advisory",
    price: "$299",
    category: "Operations",
    rating: "5.0",
    reviews: "32",
    color: "from-emerald-500/15 to-teal-500/10 text-emerald-600",
    icon: TrendingUp,
  },
  {
    title: "1-on-1 Practice Scaling & Client Acquisition",
    seller: "Elena Rostova, MST",
    price: "$150/hr",
    category: "Coaching",
    rating: "5.0",
    reviews: "29",
    color: "from-purple-500/15 to-pink-500/10 text-purple-600",
    icon: Users,
  },
];

export default function LandingPage() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#070f1e] text-slate-900 dark:text-white font-[var(--font-urbanist,Urbanist),sans-serif] selection:bg-[#ffbe24] selection:text-[#0a1628]">

      <Navbar />

      {/* ── HERO SECTION (Sharp bottom border, vibrant glow, no fading gradient, no stats ribbon) ── */}
      <section className="relative pt-[72px] pb-16 md:pb-24 bg-gradient-to-br from-[#060e1a] via-[#0a1628] to-[#102444] text-white border-b border-slate-800 overflow-hidden">
        {/* Glow ambient meshes */}
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-[#ffbe24]/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[550px] h-[550px] bg-[#1a3a6b]/40 rounded-full blur-[140px] pointer-events-none" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 pt-10 md:pt-14">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-14">

            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-[#ffbe24]/15 border border-[#ffbe24]/40 text-[#ffbe24] text-xs sm:text-sm font-bold px-4 py-2 rounded-full mb-6 shadow-[0_0_20px_rgba(255, 190, 36,0.2)]">
                <Sparkles className="w-4 h-4 text-[#ffbe24]" />
                <span>America&apos;s #1 Tax Professional Community</span>
              </div>

              {/* Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[62px] font-black leading-[1.08] tracking-tight mb-6">
                The Professional Hub for{" "}
                <span className="text-[#ffbe24]">Tax &amp; Business Experts</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed mb-8 font-normal">
                Connect, Collaborate, Sell, and Grow with powerful tools built for professionals all on one secure platform.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#ffbe24] via-[#ffbe24] to-[#ffbe24] text-[#0a1628] font-black text-base px-8 py-4 rounded-full hover:shadow-[0_0_35px_rgba(255, 190, 36,0.45)] hover:scale-[1.02] active:scale-95 transition-all duration-200"
                >
                  Join For Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="#pricing"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold text-base px-7 py-4 rounded-full border border-white/20 backdrop-blur-md transition-all hover:border-[#ffbe24]/50"
                >
                  View Pricing
                </Link>
              </div>
            </div>

            {/* Right Floating Cards */}
            <div className="hidden lg:flex flex-col gap-4 shrink-0 min-w-[280px]">
              {[
                { icon: ShoppingBag, title: "Pro Marketplace", sub: "Browse verified listings", color: "text-[#ffbe24]" },
                { icon: Users,       title: "Community Hub",    sub: "Live audio sessions",   color: "text-blue-400" },
                { icon: Radio,       title: "Pro Talks Live",   sub: "Drop-in voice stages",  color: "text-purple-400" },
                { icon: Shield,      title: "ATLAS AI Assistant", sub: "Real-time tax guidance", color: "text-emerald-400" },
              ].map((c) => (
                <div
                  key={c.title}
                  className="flex items-center gap-3.5 bg-white/8 hover:bg-white/12 backdrop-blur-xl border border-white/15 hover:border-[#ffbe24]/40 rounded-2xl px-5 py-4 transition-all duration-300 hover:translate-x-1 shadow-lg"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <c.icon className={`w-5 h-5 ${c.color}`} />
                  </div>
                  <div>
                    <div className="text-white font-bold text-base">{c.title}</div>
                    <div className="text-white/60 text-xs mt-0.5">{c.sub}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── TRUST BAND (sits under the hero, not inside it) ── */}
      <section className="bg-[#0a1628] border-b border-white/10 py-5">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-slate-300">
            {["Verified tax pros", "Encrypted platform", "Members-only access"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#ffbe24] shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>


      {/* ── FEATURES ("Why TaxCompPro" - Clean, Large Icons with Nothing Around Them) ── */}
      <section id="about" className="py-24 bg-white dark:bg-[#0a1628] border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0a1628] dark:text-white tracking-tight mb-4">
              Everything You Need in One Platform
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Whether you&apos;re solo or multi-location, TaxCompPro grows with you.
            </p>
          </div>

          {/* Bento, not a uniform card row. Six items, six cells, three tile sizes:
              8+4 / 4+4+4 / 12. Every cell collapses to full width below md. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">

            {/* Lead tile: navy, oversized art. Carries the section visually. */}
            <article className="md:col-span-2 lg:col-span-8 group relative overflow-hidden rounded-3xl bg-[#0a1628] p-8 sm:p-10 transition-all duration-300 hover:-translate-y-1">
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#ffbe24]/15 blur-[90px]" />
              <div className="relative flex flex-col items-start gap-7 sm:flex-row sm:items-center">
                <Image
                  src={features[0].img}
                  alt={features[0].title}
                  width={160}
                  height={160}
                  className="h-28 w-28 shrink-0 object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105 sm:h-40 sm:w-40"
                />
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-white sm:text-[28px]">
                    {features[0].title}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
                    {features[0].desc}
                  </p>
                </div>
              </div>
            </article>

            {/* Tall companion tile */}
            <article className="md:col-span-2 lg:col-span-4 group flex flex-col justify-center rounded-3xl border border-slate-200 bg-[#f8fafc] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#ffbe24] dark:border-slate-800 dark:bg-[#0c182b] dark:hover:border-[#ffbe24]">
              <Image
                src={features[1].img}
                alt={features[1].title}
                width={112}
                height={112}
                className="mb-6 h-24 w-24 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
              />
              <h3 className="text-xl font-black tracking-tight text-[#0a1628] dark:text-white">
                {features[1].title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {features[1].desc}
              </p>
            </article>

            {/* Middle row: three equal tiles */}
            {features.slice(2, 5).map((f) => (
              <article
                key={f.title}
                className="md:col-span-1 lg:col-span-4 group rounded-3xl border border-slate-200 bg-[#f8fafc] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#ffbe24] dark:border-slate-800 dark:bg-[#0c182b] dark:hover:border-[#ffbe24]"
              >
                <Image
                  src={f.img}
                  alt={f.title}
                  width={96}
                  height={96}
                  className="mb-5 h-20 w-20 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                />
                <h3 className="text-lg font-black tracking-tight text-[#0a1628] dark:text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {f.desc}
                </p>
              </article>
            ))}

            {/* Closing full-width band, gold tinted so the grid does not end flat */}
            <article className="md:col-span-2 lg:col-span-12 group flex flex-col items-start gap-7 rounded-3xl border border-[#ffbe24]/30 bg-gradient-to-r from-[#ffbe24]/10 via-[#ffbe24]/5 to-transparent p-8 transition-all duration-300 hover:-translate-y-1 sm:flex-row sm:items-center sm:p-10">
              <Image
                src={features[5].img}
                alt={features[5].title}
                width={120}
                height={120}
                className="h-24 w-24 shrink-0 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
              />
              <div>
                <h3 className="text-xl font-black tracking-tight text-[#0a1628] sm:text-2xl dark:text-white">
                  {features[5].title}
                </h3>
                <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                  {features[5].desc}
                </p>
              </div>
            </article>
          </div>

        </div>
      </section>


      {/* ── PRO TALKS SECTION (Dedicated Live Audio & Video Showcase - Green & Blue Theme) ── */}
      <section className="py-24 bg-gradient-to-br from-[#040a14] via-[#061224] to-[#0a1c38] text-white border-b border-white/10 relative overflow-hidden">
        {/* Glow ambient meshes */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#ffbe24]/12 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-5 sm:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-[#ffbe24]/15 text-[#ffbe24] border border-[#ffbe24]/35 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
                <Radio className="w-3.5 h-3.5 text-[#ffbe24] animate-pulse" />
                Live Audio &amp; Video Stages
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-3 leading-tight">
<span className="text-[#ffbe24]">PRO</span> TALKS
              </h2>
              <p className="text-lg sm:text-xl font-bold text-slate-200 mb-3">
                Go Live. Share Insight. <span className="text-[#ffbe24]">Grow Your Voice.</span>
              </p>
              <p className="text-base text-slate-300 leading-relaxed mb-8 max-w-xl">
                Host live conversations, join expert discussions, and connect with your audience in real time. Drop in to listen or raise your hand to speak on stage.
              </p>

              {/* 4 Feature Action Cards matching the inspiration artwork */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8 text-left">
                {[
                  { title: "HOST LIVE TALKS", desc: "Start conversations that matter with your community." },
                  { title: "JOIN THE AUDIENCE", desc: "Listen, learn, and engage with verified speakers live." },
                  { title: "ASK QUESTIONS", desc: "Interact in real time and request to speak on stage." },
                  { title: "SCHEDULE SESSIONS", desc: "Plan upcoming talks and topics with automated calendar invites." },
                ].map(item => (
                  <div key={item.title} className="bg-[#08172c]/80 border border-[#ffbe24]/25 hover:border-[#ffbe24]/50 rounded-2xl p-4 transition-all hover:shadow-[0_0_20px_rgba(255, 190, 36,0.15)]">
                    <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-[#ffbe24] mb-1 tracking-wide">
                      <CheckCircle2 className="w-4 h-4 text-[#ffbe24] shrink-0" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-xs text-slate-300 pl-6 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex gap-4 justify-center lg:justify-start flex-wrap">
                <Link
                  href="/pro-talks"
                  className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#ffbe24] via-[#ffbe24] to-[#ffbe24] text-[#0a1628] font-black px-8 py-4 rounded-full hover:shadow-[0_0_35px_rgba(255, 190, 36,0.45)] hover:scale-105 transition-all text-base"
                >
                  <Radio className="w-5 h-5" /> Explore Pro Talks
                </Link>
                <Link
                  href="/upgrade"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold px-7 py-4 rounded-full border border-white/20 hover:border-[#ffbe24]/50 transition-all text-base"
                >
                  Host Your Own Stage
                </Link>
              </div>
            </div>

            {/* Right Visual Poster showcasing /protalk.png */}
            <div className="flex-1 w-full max-w-lg lg:max-w-none">
              <div className="relative rounded-3xl overflow-hidden border-2 border-[#ffbe24]/40 shadow-[0_0_60px_rgba(255, 190, 36,0.2)] group hover:border-[#ffbe24]/80 transition-all duration-500 bg-[#061224]">
                <Image
                  src="/protalk.png"
                  alt="Pro Talks - Go Live. Share Insight. Grow Your Voice."
                  width={720}
                  height={540}
                  className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500 drop-shadow-2xl"
                  priority
                />
                {/* Ambient glow accent */}
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none" />
              </div>
            </div>

          </div>

          {/* 5 Bottom Pillars Strip */}
          <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            {[
              { label: "CONNECT", desc: "Build real connections." },
              { label: "SPEAK", desc: "Share your expertise." },
              { label: "LEARN", desc: "Gain valuable insights." },
              { label: "ENGAGE", desc: "Participate & stay active." },
              { label: "GROW", desc: "Expand your influence." },
            ].map(p => (
              <div key={p.label} className="p-3 bg-white/5 border border-[#ffbe24]/20 rounded-2xl">
                <div className="text-xs font-black text-[#ffbe24] tracking-wider mb-0.5">{p.label}</div>
                <div className="text-[11px] text-slate-300">{p.desc}</div>
              </div>
            ))}
          </div>

        </div>
      </section>


      {/* ── MARKETPLACE PREVIEW ── */}
      <section className="py-24 bg-[#f8fafc] dark:bg-[#070f1e] border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-16">
            
            {/* Left Description */}
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#ffbe24] dark:text-[#ffbe24] mb-3">
                Marketplace
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0a1628] dark:text-white tracking-tight mb-5">
                Sell Your Expertise.<br />
                <span className="text-[#ffbe24] dark:text-[#ffbe24]">Buy What You Need.</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                Connect professionals offering services, training courses, and digital products with members who need them.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {[
                  "Skill Building & Certifications",
                  "Tax Office Branding",
                  "End to End Tax Office Solutions",
                  "Done-for-you systems",
                  "Real Estate Investing Courses",
                  "Business Startup Training",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3.5 flex-wrap">
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ffbe24] to-[#ffbe24] text-[#0a1628] font-black px-7 py-3.5 rounded-full hover:shadow-[0_0_25px_rgba(255, 190, 36,0.35)] transition-all text-sm"
                >
                  Browse Marketplace <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/upgrade"
                  className="inline-flex items-center gap-2 bg-white dark:bg-[#0e1d33] text-[#0a1628] dark:text-white font-bold px-6 py-3.5 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm"
                >
                  Become a Seller
                </Link>
              </div>
            </div>

            {/* Right Preview Grid */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sampleMarketplace.map(item => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.title}
                    className="bg-white dark:bg-[#0c182b] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-xl hover:border-[#ffbe24] dark:hover:border-[#ffbe24] transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-gradient-to-r ${item.color} border border-current/20`}>
                          {item.category}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{item.rating}</span>
                          <span className="text-slate-400 font-normal">({item.reviews})</span>
                        </div>
                      </div>

                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3 text-[#0a1628] dark:text-white group-hover:bg-[#ffbe24]/10 group-hover:text-[#ffbe24] transition-colors">
                        <IconComponent className="w-5 h-5" />
                      </div>

                      <h4 className="font-bold text-sm text-[#0a1628] dark:text-white line-clamp-2 mb-1 group-hover:text-[#ffbe24] dark:group-hover:text-[#ffbe24] transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">By {item.seller}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-base font-black text-[#0a1628] dark:text-white">{item.price}</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline">View Item →</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </section>


      {/* ── COMMUNITIES SECTION (Clean Details & Checklist, No Dynamic Cards) ── */}
      <section className="py-24 bg-white dark:bg-[#0a1628] border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0a1628] dark:text-white tracking-tight mb-4">
              Your Community.<br />Your Rules.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Create or join niche communities for tax professionals. Share knowledge, host live sessions, and run private discussion forums.
            </p>
          </div>

          {/* 2-col checklist grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto mb-10">
            {[
              "Create your own branded community",
              "Discussion boards & forums",
              "Live audio & video sessions",
              "Exclusive member-only content",
              "Private messaging & networking",
              "Grow your professional audience",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-[#f8fafc] dark:bg-[#0c182b] rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-4 hover:border-[#ffbe24] transition-all">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-base font-semibold text-slate-700 dark:text-slate-200">{item}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <Link
              href="/groups"
              className="inline-flex items-center gap-2 bg-[#0a1628] dark:bg-white text-white dark:text-[#0a1628] font-bold px-8 py-3.5 rounded-full hover:bg-[#1a3a6b] dark:hover:bg-slate-100 transition-all text-base shadow-lg"
            >
              Explore Groups <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>


      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 bg-[#f8fafc] dark:bg-[#070f1e]">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0a1628] dark:text-white tracking-tight mb-4">
              Choose Your Plan
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
              Start free, upgrade when you&apos;re ready. All paid plans include <span className="font-bold text-[#ffbe24] dark:text-[#ffbe24]">2 months free</span>.
            </p>
          </div>

          <div className="pricing-grid">
            {PRICING_PLANS.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                mode="landing"
                expanded={expanded}
              />
            ))}
          </div>

          <div className="pricing-compare">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-controls={PRICING_PLANS.map((p) => `features-${p.tier}`).join(" ")}
            >
              {expanded ? "Show key features" : "Compare all plan features"}
              <ArrowDown01Icon size={18} className={expanded ? "mp-rotate" : ""} />
            </button>
          </div>

        </div>
      </section>


      {/* ── HIGH CONVERTING BOTTOM CTA ── */}
      <section className="py-24 bg-gradient-to-br from-[#060e1a] via-[#0a1628] to-[#12284c] text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255, 190, 36,0.15),transparent_70%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-5 sm:px-6 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Ready to Join TaxCompPro?
          </h2>
          <p className="text-slate-300 text-base sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Join a growing network of members building their future today.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#ffbe24] via-[#ffbe24] to-[#ffbe24] text-[#0a1628] font-black text-base px-9 py-4 rounded-full hover:shadow-[0_0_35px_rgba(255, 190, 36,0.45)] hover:scale-105 transition-all"
            >
              Join For Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold text-base px-8 py-4 rounded-full border border-white/20 backdrop-blur-md transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>


      {/* ── FOOTER ── */}
      <footer className="bg-[#0a1628] pt-14 pb-8 text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div>
              <Link href="/" className="inline-block mb-4">
                <img src="/logo_dark.webp" alt="Tax Compliance Pro" className="h-16 w-auto max-w-[240px] object-contain" />
              </Link>
              <p className="text-white/45 text-sm leading-relaxed">The professional community for tax experts across America.</p>
            </div>
            {[
              { title: "Platform", links: [["Marketplace","/marketplace"],["Groups","/groups"],["Pro Talks","/pro-talks"],["Pricing Plans","/#pricing"]] },
              { title: "Company",  links: [["About Us","/about"],["Contact","/contact"],["Become an Affiliate","https://affiliate.taxcomppro.com"],["Security","/security"]] },
              { title: "Legal",    links: [["Terms of Service","/terms"],["Privacy Policy","/privacy"],["Community Guidelines","/community-guidelines"],["Cookie Policy","/cookie-policy"]] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-white font-bold text-sm mb-4">{col.title}</h4>
                {col.links.map(([label, href]) => (
                  href.startsWith("http") ? (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="block text-white/45 text-sm mb-2.5 hover:text-[#ffbe24] transition-colors">{label}</a>
                  ) : (
                    <Link key={label} href={href} className="block text-white/45 text-sm mb-2.5 hover:text-[#ffbe24] transition-colors">{label}</Link>
                  )
                ))}
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-white/30 text-xs">
            <p>© {new Date().getFullYear()} TaxCompPro. All rights reserved.</p>
            <p>Built for tax professionals</p>
          </div>
        </div>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
