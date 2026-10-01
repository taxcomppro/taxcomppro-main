"use client";

import React, { useState } from "react";
import {
  Cancel01Icon as X,
  Loading03Icon as Loader2,
  Tick02Icon as Check,
  UserIcon as User,
  Shield01Icon as ShieldCheck,
  Briefcase01Icon as Briefcase,
  Mic01Icon as Mic,
  Share08Icon as Share2,
  Image01Icon as ImageIcon,
  SparklesIcon as Sparkles,
  Location01Icon as MapPin,
  Globe02Icon as Globe,
  Award01Icon as Award
} from "hugeicons-react";
import { Linkedin02Icon, NewTwitterIcon } from "hugeicons-react";
import { PROFESSIONAL_TITLES } from "@/lib/professionalTitles";
import "./profile-ui.css";
import ImageUpload from "@/components/profile/ImageUpload";
import ServiceEditor from "@/components/profile/ServiceEditor";
import { VoiceMemoEditor } from "@/components/profile/VoiceMemo";
import MediaGallery from "@/components/profile/MediaGallery";
import ConnectCardManager from "@/components/profile/ConnectCardManager";

export type ProfileEditTab = "basic" | "credentials" | "expertise" | "services" | "voice" | "social" | "media" | "card";

export interface ProfileFormData {
  professionalTitle?: string;
  name: string;
  headline: string;
  bio: string;
  mission: string;
  location: string;
  yearsExperience: string;
  website: string;
  linkedIn: string;
  twitter: string;
  facebook: string;
  image: string | null;
  coverImage: string | null;
  specialties: string[];
  certifications: string[];
  languages: string[];
  mediaPhotos: string[];
  voiceMemoUrl: string | null;
}

interface Service {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  emoji: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: ProfileFormData;
  userId: string;
  role?: string;
  initialServices?: Service[];
  initialTab?: ProfileEditTab;
  onSaveSuccess: (updated: ProfileFormData) => void;
}

const DEFAULT_SPECIALTY_SUGGESTIONS = [
  "Individual Tax",
  "Business Tax",
  "Tax Resolution",
  "Credits & Deductions",
  "IRS Audit Support",
  "Compliance & Ethics",
  "Corporate Tax",
  "Bookkeeping",
  "Payroll",
  "State Tax",
  "Estate & Trust",
];

const CREDENTIAL_OPTIONS = [
  "Enrolled Agent (EA)",
  "Certified Public Accountant (CPA)",
  "Tax Attorney (JD)",
  "CTEC Registered",
  "AFSP Record of Completion",
  "IRS Authorized Tax Preparer",
];

export default function EditProfileModal({
  isOpen,
  onClose,
  initialData,
  userId,
  role: _role,
  initialServices = [],
  initialTab = "basic",
  onSaveSuccess,
}: EditProfileModalProps) {
  const [activeTab, setActiveTab] = useState<
    "basic" | "credentials" | "expertise" | "services" | "voice" | "social" | "media" | "card"
  >(initialTab);

  const [form, setForm] = useState<ProfileFormData>(initialData);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [languageInput, setLanguageInput] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleField = (key: keyof ProfileFormData, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const addSpecialty = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !form.specialties.includes(trimmed)) {
      setForm((prev) => ({ ...prev, specialties: [...prev.specialties, trimmed] }));
    }
    setSpecialtyInput("");
  };

  const removeSpecialty = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((t) => t !== tag),
    }));
  };

  const toggleCredential = (cred: string) => {
    if (form.certifications.includes(cred)) {
      setForm((prev) => ({
        ...prev,
        certifications: prev.certifications.filter((c) => c !== cred),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        certifications: [...prev.certifications, cred],
      }));
    }
  };

  const addLanguage = () => {
    const trimmed = languageInput.trim();
    if (trimmed && !form.languages.includes(trimmed)) {
      setForm((prev) => ({ ...prev, languages: [...prev.languages, trimmed] }));
    }
    setLanguageInput("");
  };

  const removeLanguage = (lang: string) => {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.filter((l) => l !== lang),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        onSaveSuccess(form);
        window.dispatchEvent(new Event("profile-updated"));
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 800);
      } else {
        const data = await res.json();
        setSaveError(data.error || "Could not save your profile. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setSaveError("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "basic", label: "Basic Info", icon: User },
    { id: "credentials", label: "Credentials & Badges", icon: ShieldCheck },
    { id: "expertise", label: "Expertise & Skills", icon: Award },
    { id: "services", label: "Services", icon: Briefcase },
    { id: "voice", label: "Voice Intro", icon: Mic },
    { id: "social", label: "Social & Links", icon: Globe },
    { id: "media", label: "Photos & Media", icon: ImageIcon },
    { id: "card", label: "Connect Card", icon: Share2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#172135] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#172135] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-[#1E56A0] dark:text-[#60a5fa] flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0A1628] dark:text-white">Edit Professional Profile</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Update your public profile, credentials, and service details
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#1E56A0] hover:bg-[#16437E] text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-[#1E56A0]/20"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/70 dark:bg-slate-900/50 overflow-x-auto gap-2 shrink-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? "border-[#1E56A0] dark:border-[#60a5fa] text-[#1E56A0] dark:text-[#60a5fa] bg-white dark:bg-[#172135] rounded-t-xl"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: BASIC INFO */}
          {saveError && <p role="alert" className="mb-4 text-red-500">{saveError}</p>}
          {activeTab === "basic" && (
            <div className="space-y-5">
              {/* Photo & Banner row */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Profile Images
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      Profile Avatar
                      <span className="text-[10px] text-slate-400 font-normal ml-1.5">(400 × 400 px, 1:1 square)</span>
                    </label>
                    <ImageUpload
                      current={form.image}
                      type="avatar"
                      onUploaded={(url) => setForm((p) => ({ ...p, image: url }))}
                      uploading={avatarUploading}
                      setUploading={setAvatarUploading}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      Cover Banner Photo
                      <span className="text-[10px] text-slate-400 font-normal ml-1.5">(1400 × 400 px, 3.5:1 ratio)</span>
                    </label>
                    <ImageUpload
                      current={form.coverImage}
                      type="cover"
                      onUploaded={(url) => setForm((p) => ({ ...p, coverImage: url }))}
                      uploading={coverUploading}
                      setUploading={setCoverUploading}
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Full Name & Title Suffix
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleField("name", e.target.value)}
                    placeholder="e.g. Tonique Clay, EA"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => handleField("location", e.target.value)}
                      placeholder="e.g. Houston, Texas"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="profile-professional-title" className="block text-sm font-semibold mb-2">Professional title / role</label>
                <select id="profile-professional-title" value={form.professionalTitle || ""} onChange={e => handleField("professionalTitle", e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-3 text-sm">
                  <option value="">Select your professional title</option>
                  {PROFESSIONAL_TITLES.map(title => <option key={title} value={title}>{title}</option>)}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Professional Headline
                  </label>
                  <input
                    type="text"
                    value={form.headline}
                    onChange={(e) => handleField("headline", e.target.value)}
                    placeholder="e.g. Enrolled Agent | Tax Professional"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    value={form.yearsExperience}
                    onChange={(e) => handleField("yearsExperience", e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  About Me / Bio
                </label>
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(e) => handleField("bio", e.target.value)}
                  placeholder="Share your professional background, client advocacy, and specialization..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  My Mission Statement (Optional)
                </label>
                <textarea
                  rows={2}
                  value={form.mission}
                  onChange={(e) => handleField("mission", e.target.value)}
                  placeholder="e.g. Empowering taxpayers with accuracy, proactive strategies, and peace of mind."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: CREDENTIALS & VERIFICATIONS */}
          {activeTab === "credentials" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Tax & Professional Credentials
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                  Select all credentials and licenses you hold. These will display verified badges on
                  your profile.
                </p>

                <div className="grid sm:grid-cols-2 gap-2.5">
                  {CREDENTIAL_OPTIONS.map((cred) => {
                    const isSelected = form.certifications.includes(cred);
                    return (
                      <button
                        key={cred}
                        type="button"
                        onClick={() => toggleCredential(cred)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-bold transition-all text-left ${
                          isSelected
                            ? "bg-blue-50/80 dark:bg-blue-500/15 border-[#1E56A0] dark:border-blue-500/30 text-[#1E56A0] dark:text-blue-300"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <span>{cred}</span>
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-[#1E56A0] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Verified Status Indicators */}
              <div className="p-4 rounded-2xl bg-[#0A1628]/5 dark:bg-slate-800/80 border border-[#0A1628]/10 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-[#0A1628] dark:text-white font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Platform Verification Badges</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-slate-700/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-600 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">PTIN Verified</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-400">P12345678</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-700/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-600 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Background Check</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Verified Active</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-700/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-600 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">IRS Authorized</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Enrolled Agent</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXPERTISE & SKILLS */}
          {activeTab === "expertise" && (
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Tax Expertise & Focus Areas
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSpecialty(specialtyInput);
                      }
                    }}
                    placeholder="Type specialty and press Enter (e.g. IRS Representation)"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => addSpecialty(specialtyInput)}
                    className="px-4 py-2 bg-[#1E56A0] text-white text-xs font-bold rounded-xl hover:bg-[#16437E] transition-colors"
                  >
                    Add Tag
                  </button>
                </div>

                {/* Selected Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {form.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#EAF2FC] dark:bg-blue-500/15 text-[#1E56A0] dark:text-blue-300 border border-[#1E56A0]/20 dark:border-blue-500/30"
                    >
                      {spec}
                      <button
                        type="button"
                        onClick={() => removeSpecialty(spec)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Quick suggestions */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                    Quick Suggestions (Click to Add):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_SPECIALTY_SUGGESTIONS.filter(
                      (s) => !form.specialties.includes(s)
                    ).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSpecialty(s)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:border-[#1E56A0] hover:text-[#1E56A0] transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Languages Spoken */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Languages Spoken
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={languageInput}
                    onChange={(e) => setLanguageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addLanguage();
                      }
                    }}
                    placeholder="e.g. English, Spanish"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none"
                  />
                  <button
                    type="button"
                    onClick={addLanguage}
                    className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                  >
                    Add Language
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {form.languages.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      🗣 {lang}
                      <button
                        type="button"
                        onClick={() => removeLanguage(lang)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SERVICES */}
          {activeTab === "services" && (
            <div>
              <div className="mb-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Services Offered & Pricing
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  List the core tax and advisory services you provide to clients.
                </p>
              </div>
              <ServiceEditor proId={userId} initial={initialServices} />
            </div>
          )}

          {/* TAB 5: VOICE INTRO */}
          {activeTab === "voice" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Personal Voice Introduction
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Record or upload a short audio memo (up to 4 minutes) introducing yourself. It
                  plays directly on your profile!
                </p>
              </div>
              <VoiceMemoEditor
                currentUrl={form.voiceMemoUrl}
                onSaved={(url) => setForm((p) => ({ ...p, voiceMemoUrl: url }))}
              />
            </div>
          )}

          {/* TAB 6: SOCIAL & LINKS */}
          {activeTab === "social" && (
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Website & Social Media Handles
              </h3>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Firm Website
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => handleField("website", e.target.value)}
                    placeholder="https://yourfirm.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  LinkedIn Profile URL
                </label>
                <div className="relative">
                  <Linkedin02Icon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={form.linkedIn}
                    onChange={(e) => handleField("linkedIn", e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Twitter / X Profile URL
                </label>
                <div className="relative">
                  <NewTwitterIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={form.twitter}
                    onChange={(e) => handleField("twitter", e.target.value)}
                    placeholder="https://x.com/username"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: MEDIA GALLERY */}
          {activeTab === "media" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Photo & Credential Gallery
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Upload photos of your office, speaking events, and certificates.
                </p>
              </div>
              <MediaGallery
                photos={form.mediaPhotos}
                onChange={(photos) => setForm((p) => ({ ...p, mediaPhotos: photos }))}
              />
            </div>
          )}

          {/* TAB 8: CONNECT CARD */}
          {activeTab === "card" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Pro Connect Card & NFC Tap Page
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Configure your digital card links, QR code, and public tap card.
                </p>
              </div>
              <ConnectCardManager />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#1E56A0] hover:bg-[#16437E] text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-[#1E56A0]/20 active:scale-[0.98]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {saving ? "Saving Changes..." : saveSuccess ? "Saved Successfully!" : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
