"use client";
import SellerPaymentSetup, { CreationDraftNotice, sellerPublishLabel } from "@/components/seller/SellerPaymentSetup";
import { useCreationDraft } from "@/lib/use-creation-draft";
import { useSellerSetup } from "@/lib/use-seller-setup";


import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import "@/components/networks/networks.css";
import "@/components/networks/network-create.css";
import NetworkBadge from "@/components/networks/NetworkBadge";
import BadgeCreator, { BadgeConfig } from "@/components/networks/BadgeCreator";
import {
  Crown,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  DollarSign,
  Shield,
  HelpCircle,
  MessageCircle,
  Phone,
  Calendar,
  Layers,
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";

const creationSteps = [
  {
    title: "The essentials",
    description: "Name, purpose & pricing",
    icon: Layers,
  },
  {
    title: "Make it yours",
    description: "Cover image & identity",
    icon: ImageIcon,
  },
  {
    title: "Member identity",
    description: "A badge for your circle",
    icon: Shield,
  },
  {
    title: "The experience",
    description: "Benefits & community guidelines",
    icon: Sparkles,
  },
  {
    title: "Ready to connect",
    description: "Access & final details",
    icon: MessageCircle,
  },
] as const;
const categories = [
  "Tax Strategy",
  "Tax Office Growth",
  "Due Diligence",
  "CPA Practice",
  "Audit Defense",
  "Marketing & Growth",
  "Software & Systems",
  "General",
];

const defaultBenefits = [
  "Private Network Discussion Board",
  "Members-Only Resource & Template Library",
  "Exclusive Live Pro Talks & Workshops",
  "Direct Q&A with Network Owner",
  "Private Member Directory Access",
  "Exclusive Media & Training Videos",
  "Dedicated Live Channel Chat",
];

const coverPresets = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80",
];

export default function CreateProNetworkPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const paymentSetup = useSellerSetup(session?.user?.id);
  const isStripeReady = paymentSetup.ready;

  // Form State
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Tax Strategy");
  const [pricingType, setPricingType] = useState<"free" | "paid">("free");
  const [monthlyPrice, setMonthlyPrice] = useState("0");
  const [coverImage, setCoverImage] = useState(coverPresets[0]);
  const [customCoverUrl, setCustomCoverUrl] = useState("");
  const [logoImage, setLogoImage] = useState("");
  const [accentColor, setAccentColor] = useState("#0a1628");

  // Badge Config
  const [badge, setBadge] = useState<BadgeConfig>({
    badgeShape: "rounded",
    badgeInitials: "PRO",
    badgeText: "MEMBER",
    badgeIcon: "Star",
    badgeBgColor: "#0a1628",
    badgeTextColor: "#ffbe24",
    badgeBorderColor: "#ffbe24",
    badgeCustomImage: null,
  });

  // Benefits & Content
  const [benefits, setBenefits] = useState<string[]>(defaultBenefits);
  const [newBenefit, setNewBenefit] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Welcome to our private Pro Network! Introduce yourself in the discussion feed and download our latest member guides.",
  );
  const [rules, setRules] = useState(
    "1. Maintain professional courtesy at all times.\n2. Keep client-specific taxpayer identifying details confidential.\n3. Share insights freely and support fellow practitioners.",
  );

  // Direct Access Settings
  const [allowDirectMessage, setAllowDirectMessage] = useState(true);
  const [allowDirectText, setAllowDirectText] = useState(false);
  const [directTextPhone, setDirectTextPhone] = useState("");
  const [allowQuestions, setAllowQuestions] = useState(true);
  const [allowConsultations, setAllowConsultations] = useState(true);
  const [consultationUrl, setConsultationUrl] = useState("");


  const draft = useCreationDraft("network", session?.user?.id, { name, tagline, description, category, monthlyPrice, coverImage, customCoverUrl, logoImage, accentColor, newBenefit, welcomeMessage, rules, directTextPhone, consultationUrl, allowDirectMessage, allowDirectText, allowQuestions, allowConsultations, benefits, step, pricingType, badge }, value => {
    if (typeof value.name === "string") setName(value.name);
    if (typeof value.tagline === "string") setTagline(value.tagline);
    if (typeof value.description === "string") setDescription(value.description);
    if (typeof value.category === "string") setCategory(value.category);
    if (typeof value.monthlyPrice === "string") setMonthlyPrice(value.monthlyPrice);
    if (typeof value.coverImage === "string") setCoverImage(value.coverImage);
    if (typeof value.customCoverUrl === "string") setCustomCoverUrl(value.customCoverUrl);
    if (typeof value.logoImage === "string") setLogoImage(value.logoImage);
    if (typeof value.accentColor === "string") setAccentColor(value.accentColor);
    if (typeof value.newBenefit === "string") setNewBenefit(value.newBenefit);
    if (typeof value.welcomeMessage === "string") setWelcomeMessage(value.welcomeMessage);
    if (typeof value.rules === "string") setRules(value.rules);
    if (typeof value.directTextPhone === "string") setDirectTextPhone(value.directTextPhone);
    if (typeof value.consultationUrl === "string") setConsultationUrl(value.consultationUrl);
    if (typeof value.allowDirectMessage === "boolean") setAllowDirectMessage(value.allowDirectMessage);
    if (typeof value.allowDirectText === "boolean") setAllowDirectText(value.allowDirectText);
    if (typeof value.allowQuestions === "boolean") setAllowQuestions(value.allowQuestions);
    if (typeof value.allowConsultations === "boolean") setAllowConsultations(value.allowConsultations);
    if (Array.isArray(value.benefits)) setBenefits(value.benefits);
    if ([1, 2, 3, 4, 5].includes(value.step)) setStep(value.step);
    if (value.pricingType === "free" || value.pricingType === "paid") setPricingType(value.pricingType);
    if (value.badge && typeof value.badge === "object") setBadge(value.badge);
  });
  const handleConnectStripe = async () => {
    
    await paymentSetup.connect("/pro-networks/create", () => draft.save());
  };

  const handleAddBenefit = () => {
    if (!newBenefit.trim()) return;
    setBenefits([...benefits, newBenefit.trim()]);
    setNewBenefit("");
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!name.trim()) {
      setErrorMsg("Please provide a name for your Pro Network.");
      setStep(1);
      return;
    }

    if (pricingType === "paid" && (!Number.isFinite(Number(monthlyPrice)) || Number(monthlyPrice) <= 0)) {
      setErrorMsg("Enter a monthly price above $0, or choose a free network."); setStep(1); return;
    }
    if (pricingType === "paid" && !isStripeReady) {
      await handleConnectStripe();
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/pro-networks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tagline,
          description,
          category,
          monthlyPrice: pricingType === "free" ? 0 : parseFloat(monthlyPrice || "0"),
          accentColor,
          coverImage: customCoverUrl || coverImage,
          logoImage: logoImage || null,
          badgeShape: badge.badgeShape,
          badgeInitials: badge.badgeInitials,
          badgeText: badge.badgeText,
          badgeIcon: badge.badgeIcon,
          badgeBgColor: badge.badgeBgColor,
          badgeTextColor: badge.badgeTextColor,
          badgeBorderColor: badge.badgeBorderColor,
          badgeCustomImage: badge.badgeCustomImage,
          memberBenefits: benefits,
          welcomeMessage,
          rules,
          allowDirectMessage,
          allowDirectText,
          directTextPhone: allowDirectText ? directTextPhone : null,
          allowQuestions,
          allowConsultations,
          consultationUrl: allowConsultations ? consultationUrl : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        draft.clear();
        router.push(`/pro-networks/${data.network.slug}`);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to publish Pro Network.");
        if (err.code === "STRIPE_SETUP_REQUIRED") await paymentSetup.refresh();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending || (session?.user && !draft.ready)) {
    return (
      <div className="pn-page pn-create min-h-screen flex items-center justify-center bg-[#f4f6fb] dark:bg-[#0c1527]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="pn-page pn-create min-h-screen flex items-center justify-center bg-[#f4f6fb] dark:bg-[#0c1527] p-4">
        <div className="bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/20 text-amber-500 mx-auto flex items-center justify-center">
            <Crown className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Sign In Required
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Please log in or create an account to launch your own Pro Network.
          </p>
          <Link
            href="/login?next=/pro-networks/create"
            className="block w-full py-3.5 rounded-full bg-[#0a1628] dark:bg-amber-400 text-white dark:text-[#0a1628] font-black text-sm shadow-xl"
          >
            Sign In to Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pn-page pn-create">
      {/* Top Sub-Header */}
      <header className="bg-white dark:bg-[#0c1527] border-b border-slate-200 dark:border-[#243550] relative z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/pro-networks"
            className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#ffbe24]" />
            <span>Back to Pro Networks</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#ffbe24] tracking-wide">
              Step {step} of 5
            </span>
          </div>
        </div>
      </header>

      <div className="pn-create-layout">
        <aside className="pn-create-guide">
          <span className="pn-eyebrow">CREATE YOUR PRO NETWORK</span>
          <h1>
            Build your
            <br />
            <em>own circle.</em>
          </h1>
          <p>
            A dedicated home for your expertise and the people who share it.
          </p>
          <nav aria-label="Network setup progress">
            {creationSteps.map((item, index) => (
              <button
                key={item.title}
                aria-current={step === index + 1 ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${item.title}`}
                disabled={index + 1 > step}
                onClick={() => {
                  setStep((index + 1) as typeof step);
                  setErrorMsg("");
                }}
              >
                <span>
                  {step > index + 1 ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </div>
              </button>
            ))}
          </nav>
          <div className="pn-create-preview">
            <span className="pn-eyebrow">YOUR NETWORK, TAKING SHAPE</span>
            <NetworkBadge
              shape={badge.badgeShape}
              initials={badge.badgeInitials}
              text={badge.badgeText}
              icon={badge.badgeIcon}
              bgColor={badge.badgeBgColor}
              textColor={badge.badgeTextColor}
              borderColor={badge.badgeBorderColor}
              customImage={badge.badgeCustomImage}
              size="md"
            />
            <h3>{name || "Your network name"}</h3>
            <p>{tagline || "Your next great community starts here."}</p>
            <footer>
              <span>{category}</span>
              <strong>
                {pricingType === "free"
                  ? "Free to join"
                  : "$" + (Number(monthlyPrice) || 0).toFixed(2) + "/mo"}
              </strong>
            </footer>
          </div>
        </aside>
        <main className="pn-create-main">
          <div className="pn-create-step-heading">
            <span className="pn-eyebrow">
              STEP {String(step).padStart(2, "0")} / 05
            </span>
            <span>{creationSteps[step - 1].description}</span>
          </div>
          <div
            className="pn-create-progress"
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={0}
            aria-valuemax={5}
            aria-valuenow={step}
          >
            {creationSteps.map((_, i) => (
              <i key={i} data-complete={i + 1 <= step} />
            ))}
          </div>
          <CreationDraftNotice message={draft.message} onSave={() => draft.save()} busy={submitting || paymentSetup.connecting} />

          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <span>⚠️ {errorMsg}</span>
            </div>
          )}

          <div className="pn-create-form space-y-8">
            {/* STEP 1: Details */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Let’s start with the essentials.</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Define your network name, positioning, and monthly
                    subscription price.
                  </p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Pro Network Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RedLine1 Tax Network or Tax Office Growth Network"
                    aria-label="Network name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#243550] font-bold text-sm text-white bg-[#0f172a] placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Tagline */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Short Tagline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Strategies. Resources. Training. Success."
                    aria-label="Short tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#243550] font-medium text-sm text-white bg-[#0f172a] placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Category
                  </label>
                  <select
                    aria-label="Network category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#243550] font-bold text-sm text-white bg-[#0f172a] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} className="bg-[#0f172a] text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Monthly Subscription Price & Network Model */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-300">
                    Network Access &amp; Pricing Model *
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Free Network Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setPricingType("free");
                        setMonthlyPrice("0");
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all relative ${
                        pricingType === "free"
                          ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30"
                          : "border-[#243550] hover:border-slate-600 bg-[#0f172a]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-400">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          <span>Free Pro Network</span>
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
                          $0 / month
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        100% free for members to join. Perfect for building an
                        audience, masterclass discussions, and rapid community
                        growth.
                      </p>
                    </button>

                    {/* Paid Network Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setPricingType("paid");
                        if (parseFloat(monthlyPrice || "0") <= 0) {
                          setMonthlyPrice("19.99");
                        }
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all relative ${
                        pricingType === "paid"
                          ? "border-[#ffbe24] bg-[#ffbe24]/10 ring-2 ring-[#ffbe24]/30"
                          : "border-[#243550] hover:border-slate-600 bg-[#0f172a]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#ffbe24]">
                          <Crown className="w-4 h-4 text-[#ffbe24]" />
                          <span>Paid Membership</span>
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#ffbe24]/15 text-[#ffbe24] border border-[#ffbe24]/30">
                          Custom Price
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Charge recurring monthly dues with direct payments to your Stripe account. No platform commission; Stripe fees apply.
                      </p>
                    </button>
                  </div>

                  {/* Paid Network Price Configuration */}
                  {pricingType === "paid" ? (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121e33] border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Monthly Member Subscription Price ($ USD / month)
                        </label>
                        {/* Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {["9.99", "19.99", "29.99", "49.99", "99.00"].map(
                            (preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setMonthlyPrice(preset)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  monthlyPrice === preset
                                    ? "bg-amber-400 text-[#0a1628] font-black shadow-xs"
                                    : "bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                                }`}
                              >
                                ${preset}
                              </button>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Enter custom monthly price (e.g. 29.99)"
                          aria-label="Monthly membership price"
                          value={monthlyPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMonthlyPrice(val);
                            if (parseFloat(val) <= 0) {
                              setPricingType("free");
                            }
                          }}
                          className="w-full pl-8 pr-16 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white bg-white dark:bg-[#1a263d]"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          USD / mo
                        </span>
                      </div>

                      <SellerPaymentSetup id="network-payment-setup" paid setup={paymentSetup} onConnect={handleConnectStripe} onFree={() => { setPricingType("free"); setErrorMsg(""); }} />
                    </div>
                  ) : (
                    <SellerPaymentSetup id="network-free-setup" paid={false} setup={paymentSetup} onConnect={handleConnectStripe} onFree={() => setPricingType("free")} />
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    About Your Network (Description &amp; Public Preview)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe what members will gain, live sessions you host, and why professionals should join..."
                    aria-label="Network description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#243550] text-xs font-medium text-white bg-[#0f172a] placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Branding & Imagery */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    Visual Branding &amp; Cover
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Upload your own custom header banner and brand logo using
                    Cloudinary, or choose from presets.
                  </p>
                </div>

                {/* Cover Upload */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Network Cover Banner
                    </label>
                    <span className="text-[11px] font-bold text-[#ffbe24]">
                      Recommended: 1200 × 400 px (3:1 ratio)
                    </span>
                  </div>

                  {/* Preview current cover */}
                  <div className="relative h-36 rounded-2xl overflow-hidden bg-gradient-to-r from-[#0a1628] via-[#112240] to-[#0a1628] border border-slate-200 dark:border-slate-700 shadow-inner">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt="Cover Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                        Default Sleek Gradient Background (No image uploaded)
                      </div>
                    )}

                    {coverImage && (
                      <button
                        type="button"
                        onClick={() => setCoverImage("")}
                        className="absolute top-2.5 right-2.5 bg-black/70 hover:bg-black text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md"
                      >
                        Clear Image
                      </button>
                    )}
                  </div>

                  {/* File Upload Input */}
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md transition-all">
                      <ImageIcon className="w-4 h-4" />
                      <span>Upload Cover from Device</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append("file", file);
                          fd.append("folder", "taxcomppro/networks/covers");
                          try {
                            const res = await fetch("/api/upload", {
                              method: "POST",
                              body: fd,
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setCoverImage(data.url);
                            } else {
                              alert("Failed to upload image.");
                            }
                          } catch {
                            alert("Upload error.");
                          }
                        }}
                      />
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Recommended: 1200 × 400 px (3:1 aspect ratio) • PNG, JPG, or WebP up to 10MB
                    </span>
                  </div>
                </div>

                {/* Logo / Brand Icon Upload */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Network Brand Logo / Icon (Optional)
                    </label>
                    <span className="text-[11px] font-bold text-slate-400">
                      Recommended: 400 × 400 px (1:1 square)
                    </span>
                  </div>

                  {logoImage && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 w-fit">
                      <img
                        src={logoImage}
                        alt="Logo"
                        className="h-10 w-auto object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoImage("")}
                        className="text-xs text-rose-500 hover:underline font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-200 transition-all">
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                      <span>Upload Logo Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append("file", file);
                          fd.append("folder", "taxcomppro/networks/logos");
                          try {
                            const res = await fetch("/api/upload", {
                              method: "POST",
                              body: fd,
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setLogoImage(data.url);
                            } else {
                              alert("Failed to upload logo.");
                            }
                          } catch {
                            alert("Upload error.");
                          }
                        }}
                      />
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Recommended: 400 × 400 px (1:1 square) • Transparent PNG, JPG, or WebP up to 5MB
                    </span>
                  </div>
                </div>

                {/* Network Accent Color */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Network Accent Color
                    </label>
                    <span className="text-[11px] font-bold text-slate-400">
                      Primary brand accent (default: Navy)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      aria-label="Network accent color"
                      className="h-10 w-16 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent p-0.5"
                    />
                    <div className="flex items-center gap-2">
                      {["#0a1628", "#1e3a8a", "#0f172a", "#1b365d", "#ffbe24"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAccentColor(preset)}
                          className={`w-7 h-7 rounded-lg border transition-all ${
                            accentColor.toLowerCase() === preset.toLowerCase()
                              ? "ring-2 ring-blue-500 scale-110 border-white"
                              : "border-slate-300 dark:border-slate-600 hover:scale-105"
                          }`}
                          style={{ backgroundColor: preset }}
                          aria-label={`Select accent color ${preset}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Badge Creator */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    Custom Member Badge
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Every active member of your Pro Network receives this custom
                    badge next to their name throughout TCP.
                  </p>
                </div>

                <BadgeCreator value={badge} onChange={setBadge} />
              </div>
            )}

            {/* STEP 4: Benefits, Welcome Message & Rules */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    Member Benefits &amp; Welcome
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Set expectations, welcome new members, and list the
                    exclusive perks you offer.
                  </p>
                </div>

                {/* Benefits Checklist */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Member Benefits Checklist
                  </label>
                  <div className="space-y-2 mb-3">
                    {benefits.map((b, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                          <span>{b}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBenefit(idx)}
                          aria-label={`Remove benefit: ${b}`}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add custom benefit (e.g. Weekly SOP teardowns)..."
                      value={newBenefit}
                      onChange={(e) => setNewBenefit(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleAddBenefit())
                      }
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddBenefit}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>

                {/* Welcome Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Welcome Announcement Message
                  </label>
                  <textarea
                    rows={3}
                    aria-label="Welcome message"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>

                {/* Network Rules */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Community Rules
                  </label>
                  <textarea
                    rows={3}
                    aria-label="Community guidelines"
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* STEP 5: Direct Access & Privacy Settings */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    Direct Access &amp; Privacy Controls
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Control how members can contact you. (Phone calls are never
                    permitted).
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Allow DMs */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        Members Can DM Me
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Allow paying network members to send direct private
                        messages on TCP.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowDirectMessage}
                      aria-label="Members can send direct messages"
                      onChange={(e) => setAllowDirectMessage(e.target.checked)}
                      className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Allow Text */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-white">
                          Members Can Text Me
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Allow members to send SMS messages to your provided
                          business texting line.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={allowDirectText}
                        aria-label="Members can send text messages"
                        onChange={(e) => setAllowDirectText(e.target.checked)}
                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>

                    {allowDirectText && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Business Texting Number
                        </label>
                        <input
                          type="tel"
                          aria-label="Business texting number"
                          placeholder="e.g. +1 (555) 019-2834"
                          value={directTextPhone}
                          onChange={(e) => setDirectTextPhone(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Allow Questions */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        Members Can Submit Questions
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Enable a dedicated Q&amp;A consultation board for
                        questions to the host.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowQuestions}
                      aria-label="Members can submit questions"
                      onChange={(e) => setAllowQuestions(e.target.checked)}
                      className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Allow Consultations */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-white">
                          Members Can Request Consultations
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Provide your booking or calendar link for member
                          1-on-1s.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={allowConsultations}
                        aria-label="Members can request consultations"
                        onChange={(e) =>
                          setAllowConsultations(e.target.checked)
                        }
                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>

                    {allowConsultations && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Calendar / Booking Link (Optional)
                        </label>
                        <input
                          type="url"
                          aria-label="Consultation booking link"
                          placeholder="e.g. https://calendly.com/your-name/pro-consult"
                          value={consultationUrl}
                          onChange={(e) => setConsultationUrl(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <section className="pn-create-review">
                <span className="pn-eyebrow">READY FOR YOUR FIRST MEMBERS</span>
                <h3>{name}</h3>
                <p>
                  {category} ·{" "}
                  {pricingType === "free"
                    ? "Free membership"
                    : "$" +
                      (Number(monthlyPrice) || 0).toFixed(2) +
                      " per month"}
                </p>
                <span>
                  {benefits.length} member benefits · Your custom badge · Your
                  own community space
                </span>
              </section>
            )}
            {step === 5 && <SellerPaymentSetup id="network-final-payment" paid={pricingType === "paid"} setup={paymentSetup} onConnect={handleConnectStripe} onFree={() => { setPricingType("free"); setErrorMsg(""); }} busy={submitting} />}
            {/* Navigation Controls */}
            <div className="pn-create-navigation">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as typeof step)}
                  className="px-6 py-3 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && !name.trim()) {
                      setErrorMsg("Please enter a network name to proceed.");
                      return;
                    }
                    setErrorMsg("");
                    setStep((s) => (s + 1) as typeof step);
                  }}
                  className="px-7 py-3 rounded-full bg-[#0a1628] dark:bg-amber-400 text-white dark:text-[#0a1628] text-xs font-black hover:scale-105 transition-all shadow-lg flex items-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || paymentSetup.connecting || (pricingType === "paid" && paymentSetup.state === "checking")}
                  onClick={handlePublish}
                  data-primary="true"
                  className="px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a1628] text-xs font-black hover:from-amber-300 hover:to-amber-400 transition-all shadow-xl shadow-amber-400/20 hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing Pro Network...</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      <span>{paymentSetup.connecting ? "Opening Stripe…" : pricingType === "paid" && !isStripeReady ? sellerPublishLabel(paymentSetup.state) : "Launch my network"}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
