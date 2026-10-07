"use client";
import { safeRichText } from "@/lib/safe-rich-text";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Send,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Mail,
  ShieldCheck,
  Smartphone,
  Monitor,
  Sun,
  Moon,
  X,
  FileEdit,
  Play,
  RotateCcw,
  Search,
  Filter,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck,
  UserX,
  Layers,
  Loader2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  FileText,
  Type,
  Code,
} from "lucide-react";
import {
  NEWSLETTER_PRESETS,
  AUDIENCE_SEGMENTS,
  AudienceSegmentKey,
  NewsletterPreset,
  htmlToPlainText,
  plainTextToHtml,
} from "@/lib/newsletter-types";

interface Campaign {
  id: string;
  title: string;
  subject: string;
  preheader: string | null;
  heading: string;
  bodyHtml: string;
  buttonLabel: string | null;
  buttonUrl: string | null;
  footerNote: string | null;
  targetAudience: string;
  customEmails: string[];
  status: "DRAFT" | "SENDING" | "SENT" | "FAILED" | "CANCELLED";
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  createdBy?: {
    name: string;
    email: string;
  } | null;
}

interface AudienceSegmentWithCount {
  key: AudienceSegmentKey;
  label: string;
  description: string;
  badgeTone: string;
  count: number;
}

interface NewsletterStudioProps {
  onRefreshEmailStats?: () => void;
  showToast: (text: string, type?: "success" | "error") => void;
}

export default function NewsletterStudio({
  onRefreshEmailStats,
  showToast,
}: NewsletterStudioProps) {
  // Campaign list state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Audience info
  const [segments, setSegments] = useState<AudienceSegmentWithCount[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [unsubscribedCount, setUnsubscribedCount] = useState(0);

  // Composer modal state
  const [isComposing, setIsComposing] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>("");
  const [composerAudience, setComposerAudience] = useState<AudienceSegmentKey>("ALL");
  const [customEmailsInput, setCustomEmailsInput] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [heading, setHeading] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [plainTextBody, setPlainTextBody] = useState("");
  const [bodyMode, setBodyMode] = useState<"PLAIN" | "VISUAL" | "HTML">("PLAIN");
  const [showMiniPreview, setShowMiniPreview] = useState(false);
  const visualEditorRef = useRef<HTMLDivElement | null>(null);
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [footerNote, setFooterNote] = useState("");
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  // Composer view toggles
  const [composerTab, setComposerTab] = useState<"COMPOSE" | "PREVIEW">("COMPOSE");
  const [previewDevice, setPreviewDevice] = useState<"DESKTOP" | "MOBILE">("DESKTOP");
  const [previewTheme, setPreviewTheme] = useState<"LIGHT" | "DARK">("LIGHT");

  // Actions state
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{
    total: number;
    sent: number;
    failed: number;
  } | null>(null);
  const [showConfirmBroadcast, setShowConfirmBroadcast] = useState(false);

  // Test send state
  const [testRecipient, setTestRecipient] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Inspect Campaign Modal
  const [inspectingCampaign, setInspectingCampaign] = useState<Campaign | null>(null);
  const [inspectingLogs, setInspectingLogs] = useState<any[]>([]);
  const [inspectingLoading, setInspectingLoading] = useState(false);

  // Unsubscribes Modal
  const [showUnsubscribesModal, setShowUnsubscribesModal] = useState(false);
  const [unsubscribesList, setUnsubscribesList] = useState<any[]>([]);
  const [loadingUnsubscribes, setLoadingUnsubscribes] = useState(false);

  // Load Audience counts & Campaigns
  const loadData = async () => {
    setLoading(true);
    try {
      const [audRes, campRes] = await Promise.all([
        fetch("/api/admin/emails/newsletter/audience"),
        fetch("/api/admin/emails/newsletter/campaigns"),
      ]);

      if (audRes.ok) {
        const audData = await audRes.json();
        setSegments(audData.segments || []);
        setTotalUsers(audData.totalUsers || 0);
        setUnsubscribedCount(audData.unsubscribedCount || 0);
      }

      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData.campaigns || []);
      }
    } catch (err) {
      console.error("[NewsletterStudio] Load error:", err);
      showToast("Error loading newsletter campaigns", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute selected audience count
  const targetRecipientCount = useMemo(() => {
    if (composerAudience === "CUSTOM") {
      const emails = customEmailsInput
        .split(/[,\n]/)
        .map((e) => e.trim())
        .filter((e) => e && e.includes("@"));
      return emails.length;
    }
    const found = segments.find((s) => s.key === composerAudience);
    return found ? Math.max(0, found.count - unsubscribedCount) : 0;
  }, [composerAudience, customEmailsInput, segments, unsubscribedCount]);

  // Load Preset
  const handleSelectPreset = (preset: NewsletterPreset) => {
    setActivePresetId(preset.id);
    setTitle(preset.name);
    setSubject(preset.subject);
    setPreheader(preset.preheader);
    setHeading(preset.heading);
    setBodyHtml(preset.bodyHtml);
    setPlainTextBody(htmlToPlainText(preset.bodyHtml));
    setButtonLabel(preset.buttonLabel || "");
    setButtonUrl(preset.buttonUrl || "");
    setFooterNote(preset.footerNote || "");
    showToast(`Loaded "${preset.name}" preset!`);
  };

  // Open Composer for New Campaign
  const handleOpenComposerNew = () => {
    setEditingCampaignId(null);
    setActivePresetId("");
    // Default to the first preset
    const defaultPreset = NEWSLETTER_PRESETS[0];
    handleSelectPreset(defaultPreset);
    setComposerAudience("ALL");
    setCustomEmailsInput("");
    setComposerTab("COMPOSE");
    setBodyMode("PLAIN");
    setIsComposing(true);
  };

  // Open Composer for Existing Draft or Clone
  const handleEditCampaign = (camp: Campaign, isClone = false) => {
    setEditingCampaignId(isClone ? null : camp.id);
    setTitle(isClone ? `${camp.title} (Copy)` : camp.title);
    setSubject(camp.subject);
    setPreheader(camp.preheader || "");
    setHeading(camp.heading);
    setBodyHtml(camp.bodyHtml);
    setPlainTextBody(htmlToPlainText(camp.bodyHtml));
    setButtonLabel(camp.buttonLabel || "");
    setButtonUrl(camp.buttonUrl || "");
    setFooterNote(camp.footerNote || "");
    setComposerAudience((camp.targetAudience as AudienceSegmentKey) || "ALL");
    setCustomEmailsInput(camp.customEmails?.join(", ") || "");
    setComposerTab("COMPOSE");
    setBodyMode("PLAIN");
    setIsComposing(true);
  };

  // Visual Editor command helper
  const formatVisual = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (visualEditorRef.current) {
      const html = visualEditorRef.current.innerHTML;
      setBodyHtml(html);
      setPlainTextBody(htmlToPlainText(html));
    }
  };

  // Insert visual highlight panel
  const insertVisualHighlight = () => {
    const sample = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-left:4px solid #ffbe24;border-radius:8px;padding:16px;margin:16px 0;"><tr><td><strong style="color:#0f172a;font-size:14px;">Important Notice:</strong><p style="margin:4px 0 0;font-size:14px;line-height:1.6;color:#475569;">Add your highlighted notice or update here.</p></td></tr></table><p><br/></p>`;
    document.execCommand("insertHTML", false, sample);
    if (visualEditorRef.current) {
      const html = visualEditorRef.current.innerHTML;
      setBodyHtml(html);
      setPlainTextBody(htmlToPlainText(html));
    }
  };

  // Handle plain text typing
  const handlePlainTextChange = (val: string) => {
    setPlainTextBody(val);
    setBodyHtml(plainTextToHtml(val));
  };

  // Switch editing mode
  const switchBodyMode = (newMode: "PLAIN" | "VISUAL" | "HTML") => {
    if (newMode === "PLAIN") {
      setPlainTextBody(htmlToPlainText(bodyHtml));
    } else if (newMode === "HTML" && bodyMode === "PLAIN") {
      setBodyHtml(plainTextToHtml(plainTextBody));
    } else if (newMode === "VISUAL" && bodyMode === "PLAIN") {
      setBodyHtml(plainTextToHtml(plainTextBody));
    }
    setBodyMode(newMode);
  };

  // Insert token helper
  const handleInsertToken = (token: string) => {
    if (bodyMode === "PLAIN") {
      setPlainTextBody((prev) => (prev ? prev + " " + token : token));
      setBodyHtml(plainTextToHtml((plainTextBody ? plainTextBody + " " : "") + token));
    } else if (bodyMode === "VISUAL") {
      formatVisual("insertText", token);
    } else {
      setBodyHtml((prev) => (prev ? prev + " " + token : token));
      setPlainTextBody(htmlToPlainText((bodyHtml ? bodyHtml + " " : "") + token));
    }
    showToast(`Inserted ${token}`);
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!title.trim() || !subject.trim() || !bodyHtml.trim()) {
      showToast("Please provide a title, subject line and body content.", "error");
      return;
    }

    setIsSavingDraft(true);
    try {
      const customEmails =
        composerAudience === "CUSTOM"
          ? customEmailsInput
              .split(/[,\n]/)
              .map((e) => e.trim())
              .filter((e) => e && e.includes("@"))
          : [];

      const res = await fetch("/api/admin/emails/newsletter/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCampaignId,
          title,
          subject,
          preheader,
          heading,
          bodyHtml,
          buttonLabel,
          buttonUrl,
          footerNote,
          targetAudience: composerAudience,
          customEmails,
        }),
      });

      if (res.ok) {
        showToast("Campaign saved successfully!");
        loadData();
        if (!editingCampaignId) {
          const data = await res.json();
          setEditingCampaignId(data.campaign.id);
        }
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save campaign", "error");
      }
    } catch {
      showToast("Network error saving campaign", "error");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Send Test Email
  const handleSendTest = async () => {
    if (!testRecipient || !testRecipient.includes("@")) {
      showToast("Please enter a valid recipient email for test preview", "error");
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetch("/api/admin/emails/newsletter/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testRecipient.trim(),
          subject,
          preheader,
          heading,
          bodyHtml,
          buttonLabel,
          buttonUrl,
          footerNote,
        }),
      });

      if (res.ok) {
        showToast(`Test newsletter preview delivered to ${testRecipient}!`);
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to transmit test email", "error");
      }
    } catch {
      showToast("Error transmitting test email", "error");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Execute Final Broadcast Dispatch
  const handleDispatchBroadcast = async () => {
    setShowConfirmBroadcast(false);
    setIsBroadcasting(true);
    setBroadcastProgress({ total: targetRecipientCount, sent: 0, failed: 0 });

    try {
      const customEmails =
        composerAudience === "CUSTOM"
          ? customEmailsInput
              .split(/[,\n]/)
              .map((e) => e.trim())
              .filter((e) => e && e.includes("@"))
          : [];

      const res = await fetch("/api/admin/emails/newsletter/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: editingCampaignId,
          title,
          subject,
          preheader,
          heading,
          bodyHtml,
          buttonLabel,
          buttonUrl,
          footerNote,
          targetAudience: composerAudience,
          customEmails,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(
          `Broadcast completed! Dispatched ${data.result.sent} emails successfully (${data.result.failed} errors).`
        );
        setIsComposing(false);
        loadData();
        if (onRefreshEmailStats) onRefreshEmailStats();
      } else {
        const data = await res.json();
        showToast(data.error || "Broadcast failed", "error");
      }
    } catch {
      showToast("Error during newsletter broadcast", "error");
    } finally {
      setIsBroadcasting(false);
      setBroadcastProgress(null);
    }
  };

  // Inspect Campaign
  const handleInspectCampaign = async (camp: Campaign) => {
    setInspectingCampaign(camp);
    setInspectingLoading(true);
    try {
      const res = await fetch(`/api/admin/emails/newsletter/campaigns/${camp.id}`);
      if (res.ok) {
        const data = await res.json();
        setInspectingLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to inspect campaign", err);
    } finally {
      setInspectingLoading(false);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (campId: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      const res = await fetch(`/api/admin/emails/newsletter/campaigns/${campId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Campaign deleted");
        loadData();
      } else {
        showToast("Failed to delete campaign", "error");
      }
    } catch {
      showToast("Error deleting campaign", "error");
    }
  };

  // Load Unsubscribes
  const handleOpenUnsubscribes = async () => {
    setShowUnsubscribesModal(true);
    setLoadingUnsubscribes(true);
    try {
      const res = await fetch("/api/admin/emails/newsletter/unsubscribes");
      if (res.ok) {
        const data = await res.json();
        setUnsubscribesList(data.unsubscribes || []);
      }
    } catch (err) {
      console.error("Failed to load unsubscribes", err);
    } finally {
      setLoadingUnsubscribes(false);
    }
  };

  // Remove Unsubscribe (Re-subscribe)
  const handleRemoveUnsubscribe = async (email: string) => {
    if (!confirm(`Re-subscribe ${email} to marketing communications?`)) return;
    try {
      const res = await fetch(
        `/api/admin/emails/newsletter/unsubscribes?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        showToast(`${email} re-subscribed`);
        handleOpenUnsubscribes();
        loadData();
      }
    } catch {
      showToast("Failed to re-subscribe user", "error");
    }
  };

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  // Interpolated Preview HTML
  const livePreviewHtml = useMemo(() => {
    const vars: Record<string, string> = {
      name: "Alex Johnson",
      userName: "Alex Johnson",
      firstName: "Alex",
      email: "alex.johnson@example.com",
      role: "Tax Professional",
      tier: "VIP Member",
      siteUrl: "https://taxcomppro.com",
      supportEmail: "support@taxcomppro.com",
      unsubscribeUrl: "https://taxcomppro.com/unsubscribe?email=alex.johnson%40example.com",
      currentYear: String(new Date().getFullYear()),
    };

    const replaceTokens = (str: string) => {
      return (str || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
        return vars[key] !== undefined ? vars[key] : `{{${key}}}`;
      });
    };

    const sub = replaceTokens(subject);
    const pre = preheader ? replaceTokens(preheader) : sub;
    const hdg = replaceTokens(heading);
    const body = replaceTokens(bodyHtml);
    const btnLbl = buttonLabel ? replaceTokens(buttonLabel) : "";
    const btnU = buttonUrl ? replaceTokens(buttonUrl) : "";
    const ftr = footerNote ? replaceTokens(footerNote) : "";

    const isDark = previewTheme === "DARK";
    const bgPage = isDark ? "#060f1e" : "#eef2f7";
    const bgCard = isDark ? "#0c182c" : "#ffffff";
    const textHdg = isDark ? "#ffffff" : "#0f172a";
    const textBody = isDark ? "#cbd5e1" : "#475569";
    const borderCol = isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0";

    const buttonHtml =
      btnLbl && btnU
        ? `<div style="text-align:center;margin:30px 0;">
            <a href="${btnU}" style="display:inline-block;padding:14px 34px;background-color:#ffbe24;color:#0a1628;font-weight:bold;font-size:15px;text-decoration:none;border-radius:999px;box-shadow:0 4px 14px rgba(255,190,36,0.3);letter-spacing:0.3px;">
              ${btnLbl}
            </a>
          </div>`
        : "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin:0; padding:24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background-color:${bgPage}; color:${textBody}; }
          .container { max-width:600px; margin:0 auto; background-color:${bgCard}; border-radius:18px; border:1px solid ${borderCol}; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.1); }
          .masthead { background:linear-gradient(135deg,#0a1628 0%,#16305c 100%); padding:24px; text-align:center; border-bottom:2px solid #ffbe24; }
          .masthead-tag { font-size:10px; font-weight:800; letter-spacing:2px; color:#ffbe24; text-transform:uppercase; margin-top:6px; }
          .content { padding:32px 28px; }
          .heading { font-size:22px; font-weight:800; color:${textHdg}; margin:0 0 16px 0; line-height:1.3; }
          .footer { padding:24px; background-color:${isDark ? "#081224" : "#f8fafc"}; border-top:1px solid ${borderCol}; text-align:center; font-size:12px; color:#94a3b8; line-height:1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="masthead">
            <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:1px;">TAX COMPLIANCE PRO</div>
            <div class="masthead-tag">#1 Tax Preparer Audit Protection</div>
          </div>
          <div class="content">
            <h1 class="heading">${hdg}</h1>
            <div style="font-size:15px;line-height:1.7;color:${textBody};">${body}</div>
            ${buttonHtml}
          </div>
          <div class="footer">
            ${ftr ? `<p style="margin:0 0 10px 0;color:${textBody};">${ftr}</p>` : ""}
            <p style="margin:0 0 6px 0;">Tax Compliance Pro &middot; 100% Tax Preparer Audit Defense Solutions</p>
            <p style="margin:0;">
              You received this newsletter because you are a registered member.
              <a href="#" style="color:#ffbe24;text-decoration:underline;font-weight:bold;margin-left:4px;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }, [subject, preheader, heading, bodyHtml, buttonLabel, buttonUrl, footerNote, previewTheme]);

  return (
    <div className="space-y-6">
      {/* Overview Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0c182c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Broadcasts
            </span>
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-500">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {campaigns.length}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Marketing campaigns created
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c182c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Audience Reach
            </span>
            <div className="p-2 rounded-xl bg-blue-400/10 text-blue-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {totalUsers}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active registered subscribers
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c182c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Delivered
            </span>
            <div className="p-2 rounded-xl bg-emerald-400/10 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {campaigns
                .reduce((acc, c) => acc + (c.sentCount || 0), 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Personalized emails dispatched
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c182c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Unsubscribed
            </span>
            <button
              type="button"
              onClick={handleOpenUnsubscribes}
              className="text-[11px] font-bold text-amber-500 hover:text-amber-400 underline cursor-pointer"
            >
              Manage
            </button>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {unsubscribedCount}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              CAN-SPAM compliant opt-outs
            </p>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#0c182c] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search campaigns by title or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SENT">Sent</option>
              <option value="DRAFT">Drafts</option>
              <option value="SENDING">Sending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh campaigns"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenComposerNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Compose Newsletter
          </button>
        </div>
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 text-amber-500 flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No Newsletter Campaigns Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Launch your first email marketing campaign using your Microsoft Graph relay with custom audience targeting and pre-built templates.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenComposerNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all cursor-pointer shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            Create First Newsletter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCampaigns.map((camp) => {
            const isSent = camp.status === "SENT";
            const isDraft = camp.status === "DRAFT";
            const isSending = camp.status === "SENDING";
            const isFailed = camp.status === "FAILED";

            return (
              <div
                key={camp.id}
                className="bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:border-amber-400/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status badge */}
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                        isSent
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : isDraft
                          ? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                          : isSending
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 animate-pulse"
                          : "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300"
                      }`}
                    >
                      {camp.status}
                    </span>

                    {/* Audience badge */}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border border-blue-200/40 dark:border-blue-500/20">
                      🎯 {camp.targetAudience.replace("TIER_", "")}
                    </span>

                    <span className="text-xs text-slate-400">
                      {new Date(camp.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors truncate">
                      {camp.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                      <strong>Subject:</strong> {camp.subject}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Target: <strong className="text-slate-700 dark:text-slate-200">{camp.totalRecipients}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Sent: <strong className="text-emerald-600 dark:text-emerald-400">{camp.sentCount}</strong>
                    </span>
                    {camp.failedCount > 0 && (
                      <span className="flex items-center gap-1.5 text-rose-500">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Failed: <strong>{camp.failedCount}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => handleInspectCampaign(camp)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                    title="View details and delivery log"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect
                  </button>

                  {isDraft ? (
                    <button
                      type="button"
                      onClick={() => handleEditCampaign(camp)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      Continue Editing
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEditCampaign(camp, true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                      title="Clone as new campaign"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Duplicate
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteCampaign(camp.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete campaign"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* COMPOSER & BROADCAST STUDIO MODAL */}
      {/* ========================================================================= */}
      {isComposing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-[#0a1628] w-full max-w-6xl rounded-3xl border border-slate-200 dark:border-white/15 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-[#0c182c]/80">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingCampaignId ? "Edit Newsletter Campaign" : "Compose Newsletter Broadcast"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Microsoft Graph authenticated email marketing relay
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-200 dark:bg-white/10 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setComposerTab("COMPOSE")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      composerTab === "COMPOSE"
                        ? "bg-white dark:bg-[#0a1628] text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Edit Content
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerTab("PREVIEW")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      composerTab === "PREVIEW"
                        ? "bg-white dark:bg-[#0a1628] text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Live Preview
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {composerTab === "COMPOSE" ? (
                <div className="space-y-6">
                  {/* Preset Selector Banner */}
                  <div className="bg-slate-50 dark:bg-[#060f1e] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        Quick Start with Pre-built Professional Presets:
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                      {NEWSLETTER_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            activePresetId === preset.id
                              ? "bg-amber-400/10 border-amber-400 text-amber-900 dark:text-amber-200 shadow-sm"
                              : "bg-white dark:bg-[#0c182c] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-amber-400/50"
                          }`}
                        >
                          <div className="font-bold text-xs truncate">{preset.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                            {preset.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Two Columns: Campaign Settings & Content Editor */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Audience & Metadata */}
                    <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-[#060f1e] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Target Audience Segment
                        </h4>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Recipient Group
                          </label>
                          <select
                            value={composerAudience}
                            onChange={(e) =>
                              setComposerAudience(e.target.value as AudienceSegmentKey)
                            }
                            className="w-full bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                          >
                            {AUDIENCE_SEGMENTS.map((seg) => {
                              const match = segments.find((s) => s.key === seg.key);
                              const count = match ? match.count : 0;
                              return (
                                <option key={seg.key} value={seg.key}>
                                  {seg.label} ({count} users)
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {composerAudience === "CUSTOM" && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Custom Email List (comma or newline separated)
                            </label>
                            <textarea
                              rows={4}
                              value={customEmailsInput}
                              onChange={(e) => setCustomEmailsInput(e.target.value)}
                              placeholder="taxpro1@example.com, taxpro2@example.com"
                              className="w-full bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        )}

                        {/* Audience summary badge */}
                        <div className="p-3 bg-amber-400/10 border border-amber-400/30 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                              Estimated Reach:
                            </span>
                            <span className="text-sm font-black text-amber-900 dark:text-amber-300">
                              {targetRecipientCount} recipients
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                            Automatically filters out unsubscribed addresses and duplicate accounts.
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-white/10">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Campaign Title (Internal Reference)
                          </label>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. March 2026 Tax Season Briefing"
                            className="w-full bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Preheader Text (Inbox Preview Line)
                          </label>
                          <input
                            type="text"
                            value={preheader}
                            onChange={(e) => setPreheader(e.target.value)}
                            placeholder="Short summary displayed in inbox list"
                            className="w-full bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Token Inserters Helper */}
                      <div className="bg-slate-50 dark:bg-[#060f1e] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                          Insert Dynamic Personalization:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { token: "{{name}}", label: "Full Name" },
                            { token: "{{firstName}}", label: "First Name" },
                            { token: "{{email}}", label: "Email" },
                            { token: "{{role}}", label: "Role" },
                            { token: "{{tier}}", label: "Tier" },
                            { token: "{{siteUrl}}", label: "Site URL" },
                          ].map((t) => (
                            <button
                              key={t.token}
                              type="button"
                              onClick={() => handleInsertToken(t.token)}
                              className="px-2 py-1 bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-mono text-amber-600 dark:text-amber-400 hover:border-amber-400 cursor-pointer"
                            >
                              {t.token}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Center & Right: Content Editor */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Email Subject Line
                        </label>
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="e.g. Critical Tax Season Update & Practice Checklists"
                          className="w-full bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Main Email Headline (H1 Card Title)
                        </label>
                        <input
                          type="text"
                          value={heading}
                          onChange={(e) => setHeading(e.target.value)}
                          placeholder="e.g. Monthly Tax & Compliance Briefing"
                          className="w-full bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* Body Editor Container */}
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <span>Newsletter Body Content</span>
                            </label>
                            <p className="text-[11px] text-slate-400">
                              {bodyMode === "PLAIN"
                                ? "Plain text mode: write normal paragraphs and bullets without HTML tags"
                                : bodyMode === "VISUAL"
                                ? "Visual editor: format text with buttons like a document editor"
                                : "Raw HTML mode: edit underlying email markup"}
                            </p>
                          </div>

                          {/* Mode Switcher Tabs */}
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => switchBodyMode("PLAIN")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                bodyMode === "PLAIN"
                                  ? "bg-white dark:bg-[#0a1628] text-amber-600 dark:text-amber-400 shadow-sm"
                                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                              }`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Plain Text
                            </button>
                            <button
                              type="button"
                              onClick={() => switchBodyMode("VISUAL")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                bodyMode === "VISUAL"
                                  ? "bg-white dark:bg-[#0a1628] text-amber-600 dark:text-amber-400 shadow-sm"
                                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                              }`}
                            >
                              <Type className="w-3.5 h-3.5" />
                              Visual
                            </button>
                            <button
                              type="button"
                              onClick={() => switchBodyMode("HTML")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                bodyMode === "HTML"
                                  ? "bg-white dark:bg-[#0a1628] text-amber-600 dark:text-amber-400 shadow-sm"
                                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                              }`}
                            >
                              <Code className="w-3.5 h-3.5" />
                              HTML Code
                            </button>
                          </div>
                        </div>

                        {/* MODE 1: PLAIN TEXT */}
                        {bodyMode === "PLAIN" && (
                          <div className="space-y-2 animate-in fade-in-50 duration-150">
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-[#060f1e] p-2.5 rounded-xl border border-slate-200/80 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700 dark:text-slate-300">Format Guide:</span>
                                <span>Separate paragraphs with empty line</span>
                                <span>&bull;</span>
                                <span>Start line with <code className="text-amber-500">- </code> for bullets</span>
                                <span>&bull;</span>
                                <span>Use <code className="text-amber-500">**bold**</code> for emphasis</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const stripped = htmlToPlainText(bodyHtml);
                                  setPlainTextBody(stripped);
                                  setBodyHtml(plainTextToHtml(stripped));
                                  showToast("Cleaned body into plain text");
                                }}
                                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                              >
                                Clean HTML Clutter
                              </button>
                            </div>

                            <textarea
                              rows={12}
                              value={plainTextBody}
                              onChange={(e) => handlePlainTextChange(e.target.value)}
                              placeholder="Write your email body in clean plain text here...&#10;&#10;Separate paragraphs with an empty line.&#10;&#10;- First point&#10;- Second point"
                              className="w-full bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-xl p-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
                            />
                          </div>
                        )}

                        {/* MODE 2: VISUAL RICH TEXT (WYSIWYG) */}
                        {bodyMode === "VISUAL" && (
                          <div className="space-y-2 animate-in fade-in-50 duration-150">
                            <div className="flex flex-wrap items-center gap-1 bg-slate-50 dark:bg-[#060f1e] p-2 rounded-xl border border-slate-200/80 dark:border-white/10">
                              <button
                                type="button"
                                onClick={() => formatVisual("bold")}
                                className="p-1.5 rounded-lg bg-white dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 cursor-pointer"
                                title="Bold"
                              >
                                <Bold className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => formatVisual("italic")}
                                className="p-1.5 rounded-lg bg-white dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 cursor-pointer"
                                title="Italic"
                              >
                                <Italic className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => formatVisual("underline")}
                                className="p-1.5 rounded-lg bg-white dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 cursor-pointer"
                                title="Underline"
                              >
                                <Underline className="w-3.5 h-3.5" />
                              </button>
                              <div className="h-4 w-px bg-slate-300 dark:bg-white/20 mx-1" />
                              <button
                                type="button"
                                onClick={() => formatVisual("insertUnorderedList")}
                                className="p-1.5 rounded-lg bg-white dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 cursor-pointer"
                                title="Bullet List"
                              >
                                <List className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => formatVisual("insertOrderedList")}
                                className="p-1.5 rounded-lg bg-white dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 cursor-pointer"
                                title="Numbered List"
                              >
                                <ListOrdered className="w-3.5 h-3.5" />
                              </button>
                              <div className="h-4 w-px bg-slate-300 dark:bg-white/20 mx-1" />
                              <button
                                type="button"
                                onClick={insertVisualHighlight}
                                className="px-2.5 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-700 dark:text-amber-300 text-xs font-bold cursor-pointer transition-colors"
                              >
                                + Add Highlight Panel
                              </button>
                            </div>

                            <div
                              ref={visualEditorRef}
                              contentEditable
                              suppressContentEditableWarning
                              onInput={(e) => {
                                const html = e.currentTarget.innerHTML;
                                setBodyHtml(html);
                                setPlainTextBody(htmlToPlainText(html));
                              }}
                              dangerouslySetInnerHTML={{ __html: safeRichText(bodyHtml) }}
                              className="w-full min-h-[260px] max-h-[420px] overflow-y-auto bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 leading-relaxed font-sans shadow-inner"
                            />
                          </div>
                        )}

                        {/* MODE 3: HTML CODE */}
                        {bodyMode === "HTML" && (
                          <div className="space-y-2 animate-in fade-in-50 duration-150">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Raw email HTML markup with inline styling for email clients</span>
                              <button
                                type="button"
                                onClick={() => switchBodyMode("PLAIN")}
                                className="text-amber-500 hover:underline cursor-pointer"
                              >
                                Switch to Plain Text
                              </button>
                            </div>
                            <textarea
                              rows={12}
                              value={bodyHtml}
                              onChange={(e) => {
                                setBodyHtml(e.target.value);
                                setPlainTextBody(htmlToPlainText(e.target.value));
                              }}
                              placeholder="<p style=...>Dear {{name}},</p>..."
                              className="w-full bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        )}

                        {/* Quick In-Editor Live Preview Accordion */}
                        <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#060f1e] mt-2">
                          <button
                            type="button"
                            onClick={() => setShowMiniPreview(!showMiniPreview)}
                            className="w-full p-3 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Eye className="w-3.5 h-3.5 text-amber-500" />
                              <span>Live Card Preview</span>
                              <span className="text-[11px] font-normal text-slate-400">
                                (Real-time formatting preview)
                              </span>
                            </div>
                            <span className="text-amber-500 text-[11px] font-semibold">
                              {showMiniPreview ? "Hide Preview ▲" : "Show Instant Preview ▼"}
                            </span>
                          </button>
                          {showMiniPreview && (
                            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-950 flex justify-center">
                              <div className="w-full max-w-xl h-[420px] rounded-xl overflow-hidden shadow-xl border border-slate-300 dark:border-white/15 bg-white">
                                <iframe
                                  title="Instant Body Preview"
                                  srcDoc={livePreviewHtml}
                                  className="w-full h-full border-0"
                                  sandbox="allow-same-origin"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Primary Call to Action Button */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-[#060f1e] p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Primary CTA Button Label (optional)
                          </label>
                          <input
                            type="text"
                            value={buttonLabel}
                            onChange={(e) => setButtonLabel(e.target.value)}
                            placeholder="e.g. Explore Practice Toolkits"
                            className="w-full bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Button Link URL
                          </label>
                          <input
                            type="text"
                            value={buttonUrl}
                            onChange={(e) => setButtonUrl(e.target.value)}
                            placeholder="e.g. {{siteUrl}}/toolkits"
                            className="w-full bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Footer Note */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Custom Footer Note (optional)
                        </label>
                        <input
                          type="text"
                          value={footerNote}
                          onChange={(e) => setFooterNote(e.target.value)}
                          placeholder="e.g. Questions? Contact our compliance desk anytime at support@taxcomppro.com"
                          className="w-full bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* PREVIEW TAB */
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-[#060f1e] p-3 rounded-2xl border border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Preview Device:</span>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("DESKTOP")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                          previewDevice === "DESKTOP"
                            ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("MOBILE")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                          previewDevice === "MOBILE"
                            ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        Mobile
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Theme:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewTheme(previewTheme === "LIGHT" ? "DARK" : "LIGHT")
                        }
                        className="px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        {previewTheme === "LIGHT" ? (
                          <>
                            <Sun className="w-3.5 h-3.5 text-amber-500" /> Light Mode
                          </>
                        ) : (
                          <>
                            <Moon className="w-3.5 h-3.5 text-blue-400" /> Dark Mode
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center p-4 bg-slate-100 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                    <div
                      className={`transition-all duration-300 overflow-hidden rounded-2xl shadow-2xl border border-slate-300 dark:border-white/15 bg-white ${
                        previewDevice === "MOBILE" ? "w-[390px] h-[640px]" : "w-full max-w-2xl h-[620px]"
                      }`}
                    >
                      <iframe
                        title="Newsletter Live Preview"
                        srcDoc={livePreviewHtml}
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Test Send Row */}
              <div className="bg-slate-50 dark:bg-[#060f1e] p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Test Send Preview via Microsoft Graph:
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <input
                    type="email"
                    placeholder="Enter your email to receive test copy"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    className="flex-1 bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    disabled={isSendingTest}
                    onClick={handleSendTest}
                    className="px-4 py-2 bg-slate-900 text-white dark:bg-white/10 dark:text-white hover:bg-slate-800 dark:hover:bg-white/20 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSendingTest ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Send Test
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0c182c]/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Target: <strong className="text-amber-500 font-bold">{targetRecipientCount}</strong> eligible recipients
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={isSavingDraft}
                  onClick={handleSaveDraft}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingDraft ? "Saving..." : "Save Draft"}
                </button>

                <button
                  type="button"
                  disabled={isBroadcasting || targetRecipientCount === 0}
                  onClick={() => setShowConfirmBroadcast(true)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 transition-all cursor-pointer shadow-lg shadow-amber-400/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {isBroadcasting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Dispatching Batch...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Send Broadcast ({targetRecipientCount})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BROADCAST SAFETY CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showConfirmBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0a1628] w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/15 shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="p-3 rounded-2xl bg-amber-400/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Newsletter Broadcast
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transmitting via Microsoft Graph
                </p>
              </div>
            </div>

            <div className="space-y-2 p-3 bg-slate-50 dark:bg-[#060f1e] rounded-xl border border-slate-200/80 dark:border-white/10 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Audience:</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {composerAudience}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recipients:</span>
                <span className="font-bold text-amber-500">
                  {targetRecipientCount} members
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subject:</span>
                <span className="font-semibold text-slate-800 dark:text-white truncate max-w-[200px]">
                  {subject}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Every recipient will receive an individualized email with personalized variables and a CAN-SPAM compliant unsubscribe link. Emails will be dispatched in micro-batches with rate throttling.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmBroadcast(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchBroadcast}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all cursor-pointer shadow-lg shadow-amber-400/20"
              >
                Yes, Dispatch Broadcast Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CAMPAIGN INSPECTOR MODAL */}
      {/* ========================================================================= */}
      {inspectingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0a1628] w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-white/15 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-[#0c182c]/80">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Campaign Audit: {inspectingCampaign.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Subject: {inspectingCampaign.subject}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingCampaign(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-[#060f1e] p-3 rounded-xl border border-slate-200/80 dark:border-white/10">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Targets</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {inspectingCampaign.totalRecipients}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-[#060f1e] p-3 rounded-xl border border-slate-200/80 dark:border-white/10">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Delivered</div>
                  <div className="text-xl font-bold text-emerald-500 mt-1">
                    {inspectingCampaign.sentCount}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-[#060f1e] p-3 rounded-xl border border-slate-200/80 dark:border-white/10">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Failed</div>
                  <div className="text-xl font-bold text-rose-500 mt-1">
                    {inspectingCampaign.failedCount}
                  </div>
                </div>
              </div>

              {/* Delivery Logs Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Dispatched Email Audit Trail (Recent 50)
                </h4>
                {inspectingLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-400" />
                  </div>
                ) : inspectingLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-[#060f1e] rounded-xl">
                    No individual delivery logs found for this campaign.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-white/5 text-slate-400">
                        <tr>
                          <th className="p-2.5">Recipient</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Dispatched At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {inspectingLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                            <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200 font-mono">
                              {log.recipient}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.status === "SENT"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-rose-500/20 text-rose-400"
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-400">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingCampaign(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNSUBSCRIBES MANAGEMENT MODAL */}
      {/* ========================================================================= */}
      {showUnsubscribesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0a1628] w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-white/15 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-[#0c182c]/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Unsubscribed Recipients
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    CAN-SPAM marketing opt-out registry
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUnsubscribesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingUnsubscribes ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400" />
                </div>
              ) : unsubscribesList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-[#060f1e] rounded-2xl">
                  Zero unsubscribed users! All registered members are currently eligible for broadcasts.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-white/5 text-slate-400">
                      <tr>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Unsubscribed At</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {unsubscribesList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                          <td className="p-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                            {item.email}
                          </td>
                          <td className="p-3 text-slate-400">{item.reason || "None specified"}</td>
                          <td className="p-3 text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveUnsubscribe(item.email)}
                              className="text-[11px] font-bold text-amber-500 hover:text-amber-400 underline cursor-pointer"
                            >
                              Re-subscribe
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowUnsubscribesModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
