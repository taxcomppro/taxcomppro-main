"use client";

import { useEffect, useState, useMemo } from "react";
import NewsletterStudio from "./newsletter-studio";
import {
  Mail,
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Code2,
  ExternalLink,
  Eye,
  RotateCcw,
  Sparkles,
  Sliders,
  ChevronRight,
  Filter,
  Layers,
  ShieldCheck,
  LifeBuoy,
  CreditCard,
  Key,
  X,
  Smartphone,
  Monitor,
  Sun,
  Moon,
  Check,
  Copy,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  category: "AUTH" | "SUPPORT" | "BILLING" | "SYSTEM";
  description: string;
  subject: string;
  preheader: string | null;
  heading: string;
  bodyHtml: string;
  buttonLabel: string | null;
  buttonUrl: string | null;
  footerNote: string | null;
  isActive: boolean;
  variables: string[];
  sampleVariables: Record<string, string>;
  sentCount: number;
  updatedAt: string;
}

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  templateKey: string | null;
  status: "SENT" | "FAILED";
  errorMessage: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  template?: {
    name: string;
    category: string;
  } | null;
}

interface Stats {
  totalSent: number;
  sentToday: number;
  failedCount: number;
  successRate: number;
}

export default function AdminEmailsPage() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<"TEMPLATES" | "NEWSLETTER" | "LOGS">("NEWSLETTER");

  // Data state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSent: 0,
    sentToday: 0,
    failedCount: 0,
    successRate: 100,
  });

  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Template Filtering
  const [templateCategory, setTemplateCategory] = useState<string>("ALL");

  // Log Filtering & Pagination
  const [logSearch, setLogSearch] = useState("");
  const [logStatus, setLogStatus] = useState<string>("ALL");
  const [logTemplateKey, setLogTemplateKey] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editorTab, setEditorTab] = useState<"EDIT" | "PREVIEW">("EDIT");
  const [previewDevice, setPreviewDevice] = useState<"DESKTOP" | "MOBILE">("DESKTOP");
  const [previewTheme, setPreviewTheme] = useState<"LIGHT" | "DARK">("LIGHT");

  // Edit form state
  const [formSubject, setFormSubject] = useState("");
  const [formPreheader, setFormPreheader] = useState("");
  const [formHeading, setFormHeading] = useState("");
  const [formBodyHtml, setFormBodyHtml] = useState("");
  const [formButtonLabel, setFormButtonLabel] = useState("");
  const [formButtonUrl, setFormButtonUrl] = useState("");
  const [formFooterNote, setFormFooterNote] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // View Log Modal
  const [inspectingLogId, setInspectingLogId] = useState<string | null>(null);
  const [inspectingLogData, setInspectingLogData] = useState<EmailLog & { html?: string } | null>(null);
  const [inspectingLogLoading, setInspectingLogLoading] = useState(false);

  // Test Email Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [testTemplateKey, setTestTemplateKey] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Templates
  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/emails/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Failed to load templates", err);
    }
  };

  // Fetch Logs
  const fetchLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        status: logStatus,
        templateKey: logTemplateKey,
        search: logSearch,
      });
      const res = await fetch(`/api/admin/emails/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setCurrentPage(data.pagination?.page || 1);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load logs", err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchTemplates(), fetchLogs(1)]);
      setLoading(false);
    };
    loadAll();
  }, []);

  // When log filters change
  useEffect(() => {
    if (!loading) {
      fetchLogs(1);
    }
  }, [logStatus, logTemplateKey]);

  // Open Template Editor
  const handleOpenEditor = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormSubject(template.subject);
    setFormPreheader(template.preheader || "");
    setFormHeading(template.heading);
    setFormBodyHtml(template.bodyHtml);
    setFormButtonLabel(template.buttonLabel || "");
    setFormButtonUrl(template.buttonUrl || "");
    setFormFooterNote(template.footerNote || "");
    setFormIsActive(template.isActive);
    setEditorTab("EDIT");
  };

  // Save Template
  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/emails/templates/${editingTemplate.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: formSubject,
          preheader: formPreheader,
          heading: formHeading,
          bodyHtml: formBodyHtml,
          buttonLabel: formButtonLabel,
          buttonUrl: formButtonUrl,
          footerNote: formFooterNote,
          isActive: formIsActive,
        }),
      });

      if (res.ok) {
        showToast(`Template "${editingTemplate.name}" updated successfully!`);
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update template", "error");
      }
    } catch {
      showToast("Error updating template", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Reset Template
  const handleResetTemplate = async (templateKey: string) => {
    if (!confirm("Are you sure you want to reset this email template to its factory default? All custom edits will be reverted.")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/emails/templates/${templateKey}/reset`, {
        method: "POST",
      });
      if (res.ok) {
        showToast("Template reset to system default successfully!");
        if (editingTemplate && editingTemplate.key === templateKey) {
          const resetData = await res.json();
          handleOpenEditor(resetData.template);
        }
        fetchTemplates();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to reset template", "error");
      }
    } catch {
      showToast("Error resetting template", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Quick toggle active status
  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const res = await fetch(`/api/admin/emails/templates/${template.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: template.subject,
          heading: template.heading,
          bodyHtml: template.bodyHtml,
          isActive: !template.isActive,
        }),
      });
      if (res.ok) {
        showToast(`Template is now ${!template.isActive ? "Active (Customized)" : "Inactive (Using Default)"}`);
        fetchTemplates();
      }
    } catch {
      showToast("Failed to toggle template status", "error");
    }
  };

  // Inspect email log
  const handleInspectLog = async (logId: string) => {
    setInspectingLogId(logId);
    setInspectingLogLoading(true);
    try {
      const res = await fetch(`/api/admin/emails/logs/${logId}`);
      if (res.ok) {
        const data = await res.json();
        setInspectingLogData(data.log);
      } else {
        showToast("Could not load email content", "error");
      }
    } catch {
      showToast("Error loading email log details", "error");
    } finally {
      setInspectingLogLoading(false);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!testRecipient || !testRecipient.includes("@")) {
      alert("Please enter a valid recipient email address.");
      return;
    }
    setIsSendingTest(true);
    try {
      // If we are sending from inside the editor modal, use the draft inputs
      const isFromEditor = editingTemplate && testTemplateKey === editingTemplate.key;

      const payload: Record<string, unknown> = {
        to: testRecipient.trim(),
        templateKey: testTemplateKey || undefined,
      };

      if (isFromEditor) {
        payload.subject = formSubject;
        payload.preheader = formPreheader;
        payload.heading = formHeading;
        payload.bodyHtml = formBodyHtml;
        payload.buttonLabel = formButtonLabel;
        payload.buttonUrl = formButtonUrl;
        payload.footerNote = formFooterNote;
      }

      const res = await fetch("/api/admin/emails/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(`Test email sent successfully to ${testRecipient}!`);
        setShowTestModal(false);
        setTestRecipient("");
        fetchLogs(1);
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to send test email", "error");
      }
    } catch {
      showToast("Error sending test email", "error");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (templateCategory === "ALL") return templates;
    return templates.filter((t) => t.category === templateCategory);
  }, [templates, templateCategory]);

  // Interpolate preview HTML for live editor preview
  const livePreviewHtml = useMemo(() => {
    if (!editingTemplate) return "";
    const vars: Record<string, string> = {
      siteUrl: "https://taxcomppro.com",
      supportEmail: "support@taxcomppro.com",
      ...(editingTemplate.sampleVariables || {}),
    };

    let subject = formSubject;
    let heading = formHeading;
    let preheader = formPreheader;
    let body = formBodyHtml;
    let buttonLabel = formButtonLabel;
    let buttonUrl = formButtonUrl;
    let footerNote = formFooterNote;

    Object.entries(vars).forEach(([k, v]) => {
      const reg = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g");
      subject = subject.replace(reg, v);
      heading = heading.replace(reg, v);
      preheader = preheader.replace(reg, v);
      body = body.replace(reg, v);
      buttonLabel = buttonLabel.replace(reg, v);
      buttonUrl = buttonUrl.replace(reg, v);
      footerNote = footerNote.replace(reg, v);
    });

    const isDark = previewTheme === "DARK";
    const bgCard = isDark ? "#111c2e" : "#ffffff";
    const textHeading = isDark ? "#ffffff" : "#0f172a";
    const textBody = isDark ? "#cbd5e1" : "#475569";
    const pageBg = isDark ? "#060f1e" : "#eef2f7";
    const borderCol = isDark ? "#24334a" : "#e2e8f0";

    const buttonHtml =
      buttonLabel && buttonUrl
        ? `<div style="text-align:center;margin:28px 0;"><a href="${buttonUrl}" style="display:inline-block;padding:14px 32px;background:#ffbe24;color:#0a1628;font-weight:700;font-size:15px;text-decoration:none;border-radius:999px;letter-spacing:0.3px;">${buttonLabel}</a></div>`
        : "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { margin:0; padding:24px 12px; background:${pageBg}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:${textBody}; transition:all 0.2s; }
          .container { max-width:600px; margin:0 auto; background:${bgCard}; border:1px solid ${borderCol}; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.06); }
          .header { background:#0a1628; padding:26px 20px; text-align:center; }
          .body-content { padding:36px 32px; line-height:1.65; font-size:15px; }
          .body-content h1 { color:${textHeading}; font-size:24px; font-weight:800; margin:0 0 20px 0; line-height:1.25; }
          .footer { padding:22px 28px; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid ${borderCol}; }
          a { color:#ffbe24; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="/logo_dark 1.webp" alt="Tax Compliance Pro" style="height:36px;width:auto;display:inline-block;" />
          </div>
          <div class="body-content">
            <h1>${heading}</h1>
            ${body}
            ${buttonHtml}
          </div>
          <div class="footer">
            ${footerNote ? `<p style="margin:0 0 8px 0;">${footerNote}</p>` : ""}
            <p style="margin:0;">&copy; ${new Date().getFullYear()} Tax Compliance Pro &middot; All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }, [editingTemplate, formSubject, formHeading, formPreheader, formBodyHtml, formButtonLabel, formButtonUrl, formFooterNote, previewTheme]);

  // Insert variable into editor body
  const insertVariable = (varName: string) => {
    const token = `{{${varName}}}`;
    setFormBodyHtml((prev) => prev + " " + token);
    showToast(`Inserted ${token} into body`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border animate-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/30 text-emerald-200"
              : "bg-red-950/95 border-red-500/30 text-red-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0a1628] via-[#102342] to-[#16305c] p-6 rounded-2xl border border-white/10 text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-1">
            <Mail className="w-3.5 h-3.5" />
            Email Communications
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Email Templates &amp; Sent History
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Customize transactional email templates (OTP codes, password resets, ticket notifications) with dynamic variables and view real-time audit logs of every email dispatched.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("NEWSLETTER")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Compose Newsletter
          </button>
          <button
            type="button"
            onClick={() => {
              setTestTemplateKey(templates[0]?.key || "");
              setShowTestModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer border border-white/10"
          >
            <Send className="w-4 h-4" />
            Send Test Email
          </button>
          <button
            type="button"
            onClick={() => {
              fetchTemplates();
              fetchLogs(currentPage);
              showToast("Refreshed latest data");
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        <div className="bg-white dark:bg-[#0c182c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Outgoing
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats.totalSent.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium text-slate-400">emails</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Logged across all services</p>
        </div>

        <div className="bg-white dark:bg-[#0c182c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sent Today
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.sentToday.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium text-emerald-500">active</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Dispatched since midnight</p>
        </div>

        <div className="bg-white dark:bg-[#0c182c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Delivery Success
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats.successRate}%
            </span>
            <span className="text-[11px] font-medium text-slate-400">MS Graph</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">OAuth authenticated relay</p>
        </div>

        <div className="bg-white dark:bg-[#0c182c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Failed Deliveries
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black ${stats.failedCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
              {stats.failedCount}
            </span>
            <span className="text-[11px] font-medium text-slate-400">errors</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {stats.failedCount === 0 ? "Zero delivery errors" : "Review error logs below"}
          </p>
        </div>
      </div>

      {/* Main Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("NEWSLETTER")}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-xl transition-all border-b-2 cursor-pointer ${
            activeTab === "NEWSLETTER"
              ? "border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-400/10"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Newsletter &amp; Marketing
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("TEMPLATES")}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-xl transition-all border-b-2 cursor-pointer ${
            activeTab === "TEMPLATES"
              ? "border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-400/10"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Email Templates ({templates.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("LOGS")}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-xl transition-all border-b-2 cursor-pointer ${
            activeTab === "LOGS"
              ? "border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-400/10"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Clock className="w-4 h-4" />
          Sent Emails Log ({stats.totalSent})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: NEWSLETTER & MARKETING */}
      {/* ========================================================================= */}
      {activeTab === "NEWSLETTER" && (
        <NewsletterStudio
          showToast={showToast}
          onRefreshEmailStats={() => {
            fetchTemplates();
            fetchLogs(1);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 1: EMAIL TEMPLATES (DYNAMIC CUSTOMIZER) */}
      {/* ========================================================================= */}
      {activeTab === "TEMPLATES" && (
        <div className="space-y-5">
          {/* Category filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "ALL", label: "All Templates" },
              { id: "AUTH", label: "Security & Verification (PIN/OTP)", icon: Key },
              { id: "SUPPORT", label: "Support & Concierge", icon: LifeBuoy },
              { id: "BILLING", label: "Memberships & Upgrades", icon: CreditCard },
              { id: "SYSTEM", label: "Platform & Notifications", icon: Mail },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setTemplateCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  templateCategory === cat.id
                    ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-md"
                    : "bg-white dark:bg-[#0c182c] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-amber-400/50"
                }`}
              >
                {cat.icon && <cat.icon className="w-3 h-3" />}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Template Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((tpl) => {
              const isAuth = tpl.category === "AUTH";
              const isSupport = tpl.category === "SUPPORT";
              const isBilling = tpl.category === "BILLING";

              return (
                <div
                  key={tpl.key}
                  className="bg-white dark:bg-[#0c182c] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:border-amber-400/40 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isAuth
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                                : isSupport
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            }`}
                          >
                            {tpl.category}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            {tpl.key}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                          {tpl.name}
                        </h3>
                      </div>

                      {/* Active Status Badge */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(tpl)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          tpl.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                            : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10"
                        }`}
                        title={tpl.isActive ? "Custom template is ACTIVE" : "Template is inactive (using system default)"}
                      >
                        {tpl.isActive ? "Customized" : "Default"}
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {tpl.description}
                    </p>

                    <div className="bg-slate-50 dark:bg-[#060f1e] p-3 rounded-xl border border-slate-200/60 dark:border-white/5 space-y-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Default Subject
                      </div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 font-mono truncate">
                        {tpl.subject}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 font-medium">Variables:</span>
                      {tpl.variables.slice(0, 4).map((v) => (
                        <span
                          key={v}
                          className="text-[10px] font-mono bg-amber-400/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/20"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                      {tpl.variables.length > 4 && (
                        <span className="text-[10px] text-slate-400">
                          +{tpl.variables.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-4 mt-4">
                    <div className="text-xs text-slate-400">
                      Sent: <strong className="text-slate-700 dark:text-slate-200">{tpl.sentCount}</strong> times
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTestTemplateKey(tpl.key);
                          setShowTestModal(true);
                        }}
                        className="p-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                        title="Send test with this template"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResetTemplate(tpl.key)}
                        className="p-2 text-xs font-semibold text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                        title="Reset template to default"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditor(tpl)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-400/15 text-amber-800 dark:text-amber-300 hover:bg-amber-400/25 transition-colors cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        Customize
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SENT EMAILS LOG */}
      {/* ========================================================================= */}
      {activeTab === "LOGS" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-[#0c182c] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search recipient email or subject..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLogs(1)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-amber-400 text-slate-900 dark:text-white"
                />
              </div>

              {/* Status filter */}
              <select
                value={logStatus}
                onChange={(e) => setLogStatus(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent Successfully</option>
                <option value="FAILED">Failed</option>
              </select>

              {/* Template Filter */}
              <select
                value={logTemplateKey}
                onChange={(e) => setLogTemplateKey(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="ALL">All Templates</option>
                {templates.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => fetchLogs(1)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            >
              <Filter className="w-3.5 h-3.5" />
              Apply Filter
            </button>
          </div>

          {/* Logs Table */}
          <div className="bg-white dark:bg-[#0c182c] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
            {logsLoading ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium">Loading sent emails...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Mail className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No email logs found
                </p>
                <p className="text-xs text-slate-500">
                  Emails sent for OTP codes, password resets, and support updates will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/75 dark:bg-[#060f1e]/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Recipient</th>
                      <th className="py-3.5 px-4">Template / Type</th>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Sent At</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {logs.map((log) => {
                      const isSuccess = log.status === "SENT";
                      const dateObj = new Date(log.createdAt);

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                            {log.recipient}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                              {log.templateKey || "CUSTOM"}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-700 dark:text-slate-300 font-medium">
                            {log.subject}
                          </td>
                          <td className="py-3 px-4">
                            {isSuccess ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400">
                                <Check className="w-3 h-3" />
                                Sent
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400 cursor-help"
                                title={log.errorMessage || "Failed to deliver"}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Failed
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                            {dateObj.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            · {dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleInspectLog(log.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-amber-400/20 hover:text-amber-500 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Email
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-white/10 text-xs">
                <span className="text-slate-400">
                  Page <strong className="text-slate-700 dark:text-slate-200">{currentPage}</strong> of{" "}
                  <strong className="text-slate-700 dark:text-slate-200">{totalPages}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => fetchLogs(currentPage - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => fetchLogs(currentPage + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TEMPLATE CUSTOMIZER & LIVE PREVIEW MODAL */}
      {/* ========================================================================= */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-[#0a1628] w-full max-w-5xl rounded-2xl border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0c182c]/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-400/20 text-amber-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Customize: {editingTemplate.name}
                    </h2>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      {editingTemplate.key}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Edit subject, content, and CTA. Use dynamic variable tags below to personalise for each recipient.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Editor vs Live Preview switcher */}
                <div className="flex items-center bg-slate-200/70 dark:bg-white/10 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEditorTab("EDIT")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editorTab === "EDIT"
                        ? "bg-white dark:bg-[#0a1628] text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-white"
                    }`}
                  >
                    Edit Content
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("PREVIEW")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      editorTab === "PREVIEW"
                        ? "bg-amber-400 text-slate-950 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-white"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Live Preview
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {editorTab === "EDIT" ? (
                <div className="space-y-5">
                  {/* Dynamic Variables Pill Bar */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Available Dynamic Variables (Click to Insert)
                      </span>
                      <span className="text-[11px] font-normal text-slate-400">
                        Inserts into body text
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {editingTemplate.variables.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable(v)}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-400/20 text-amber-800 dark:text-amber-300 border border-amber-400/30 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer"
                          title={`Click to append {{${v}}} to body text`}
                        >
                          {`{{${v}}}`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => insertVariable("siteUrl")}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 transition-all cursor-pointer"
                      >
                        {"{{siteUrl}}"}
                      </button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white font-medium focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Preheader / Inbox Snippet
                      </label>
                      <input
                        type="text"
                        value={formPreheader}
                        onChange={(e) => setFormPreheader(e.target.value)}
                        placeholder="Snippet visible in recipient's inbox next to subject..."
                        className="w-full text-xs bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white font-medium focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Card Heading (H1)
                    </label>
                    <input
                      type="text"
                      value={formHeading}
                      onChange={(e) => setFormHeading(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white font-medium focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Email Body Content (HTML / Text)
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Supports standard HTML tags e.g. &lt;p&gt;, &lt;strong&gt;, &lt;div&gt;
                      </span>
                    </div>
                    <textarea
                      rows={9}
                      value={formBodyHtml}
                      onChange={(e) => setFormBodyHtml(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-amber-400 focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Button Label (CTA) - Optional
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Reset Password, View Dashboard"
                        value={formButtonLabel}
                        onChange={(e) => setFormButtonLabel(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white font-medium focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Button URL / Link - Optional
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. {{resetUrl}} or {{dashboardUrl}}"
                        value={formButtonUrl}
                        onChange={(e) => setFormButtonUrl(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white font-medium focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Footer Note
                    </label>
                    <input
                      type="text"
                      value={formFooterNote}
                      onChange={(e) => setFormFooterNote(e.target.value)}
                      placeholder="Optional compliance disclaimer note shown in the footer..."
                      className="w-full text-xs bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white font-medium focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Enable Custom Template
                      </div>
                      <div className="text-xs text-slate-500">
                        When enabled, all outgoing emails for this event will use this customized layout.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsActive}
                        onChange={(e) => setFormIsActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                    </label>
                  </div>
                </div>
              ) : (
                /* LIVE PREVIEW TAB */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("DESKTOP")}
                        className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                          previewDevice === "DESKTOP"
                            ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Monitor className="w-4 h-4" />
                        Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("MOBILE")}
                        className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                          previewDevice === "MOBILE"
                            ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Smartphone className="w-4 h-4" />
                        Mobile
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewTheme(previewTheme === "LIGHT" ? "DARK" : "LIGHT")}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/10 flex items-center gap-1.5 cursor-pointer hover:bg-white/5"
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

                  <div className="flex justify-center p-4 bg-slate-100 dark:bg-[#060f1e] rounded-2xl border border-slate-200 dark:border-white/10">
                    <div
                      className={`transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-slate-300 dark:border-white/10 bg-white ${
                        previewDevice === "MOBILE" ? "w-[380px] h-[580px]" : "w-full max-w-[640px] h-[580px]"
                      }`}
                    >
                      <iframe
                        title="Live Email Preview"
                        srcDoc={livePreviewHtml}
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0c182c]/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResetTemplate(editingTemplate.key)}
                  className="px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                >
                  Reset to Default
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTestTemplateKey(editingTemplate.key);
                    setShowTestModal(true);
                  }}
                  className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white/5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Test With These Values
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleSaveTemplate}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md shadow-amber-400/20 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Saving Changes..." : "Save Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INSPECT EMAIL LOG MODAL */}
      {/* ========================================================================= */}
      {inspectingLogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-[#0a1628] w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0c182c]/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {inspectingLogData?.subject || "Email Audit Log"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sent to <strong className="text-slate-300">{inspectingLogData?.recipient}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectingLogId(null);
                  setInspectingLogData(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {inspectingLogLoading ? (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-400">Loading email preview...</span>
                </div>
              ) : inspectingLogData ? (
                <>
                  {/* Status & details banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-[#060f1e] p-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Status</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {inspectingLogData.status === "SENT" ? (
                          <span className="text-emerald-500 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Sent Successfully
                          </span>
                        ) : (
                          <span className="text-rose-500 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Template</div>
                      <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                        {inspectingLogData.templateKey || "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Sent Date</div>
                      <div className="text-slate-700 dark:text-slate-300 mt-0.5">
                        {new Date(inspectingLogData.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Log ID</div>
                      <div className="font-mono text-slate-400 truncate mt-0.5" title={inspectingLogData.id}>
                        {inspectingLogData.id.slice(0, 10)}...
                      </div>
                    </div>
                  </div>

                  {inspectingLogData.errorMessage && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                      <strong>Delivery Error:</strong> {inspectingLogData.errorMessage}
                    </div>
                  )}

                  {/* Rendered HTML Container */}
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white shadow-inner h-[480px]">
                    <iframe
                      title="Sent Email Content"
                      srcDoc={inspectingLogData.html || "<p>No content available</p>"}
                      className="w-full h-full border-0"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0c182c]/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Transmitted via Microsoft Graph Enterprise API
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setInspectingLogId(null);
                    setInspectingLogData(null);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SEND TEST EMAIL MODAL */}
      {/* ========================================================================= */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0a1628] w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/15 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400">
                  <Send className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Send Test Email
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Select Template
                </label>
                <select
                  value={testTemplateKey}
                  onChange={(e) => setTestTemplateKey(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                >
                  {templates.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.name} ({t.key})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#060f1e] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-white focus:border-amber-400 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400">
                  The test email will be formatted with sample placeholder data (e.g. sample 6-digit PIN code) and delivered to your inbox.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingTest}
                onClick={handleSendTestEmail}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSendingTest ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Transmitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Test Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
