"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  File01Icon as FileText, Tag01Icon as Tag, DollarCircleIcon as DollarSign,
  CheckmarkCircle02Icon as CheckCircle2, Loading03Icon as Loader2,
  ArrowLeft01Icon as ArrowLeft, Upload01Icon as Upload, Cancel01Icon as X,
  Clock01Icon as Clock, UserGroupIcon as Users, GlobeIcon as Globe,
  BookOpen01Icon as BookOpen, Download01Icon as Download, PackageIcon as Package,
  Briefcase01Icon as Briefcase, ShoppingBag01Icon as ShoppingBag,
  School01Icon as GraduationCap, Image01Icon as ImageIcon, Add01Icon as Plus,
  Delete02Icon as Trash2, ArrowDown01Icon as ChevronDown, ArrowRight01Icon as ChevronRight,
  Video02Icon as Video, HelpCircleIcon as HelpCircle, ArrowRight01Icon as ArrowRight,
  SparklesIcon as Sparkles, AlertCircleIcon as AlertCircle,
} from "hugeicons-react";
import "../marketplace.css";
import "./create-listing.css";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import RichTextEditor from "@/components/courses/RichTextEditor";

/* ── Shared styles ── */
const inp =
  "lc-input w-full font-[inherit] text-sm px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#0a1628] dark:focus:border-amber-400 focus:ring-2 focus:ring-[#0a1628]/10 transition-all bg-white dark:bg-[#172135] text-[#0a1628] dark:text-white";
const sel = `${inp}`;
const lbl =
  "lc-label block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";

/* ── Categories ── */
const CATEGORIES = [
  {
    value: "SERVICE",
    label: "Service",
    icon: Briefcase,
    desc: "Consulting, advice, or professional work",
  },
  {
    value: "PRODUCT",
    label: "Product",
    icon: ShoppingBag,
    desc: "Downloadable guides, templates, or tools",
  },
  {
    value: "COURSE",
    label: "Course",
    icon: GraduationCap,
    desc: "Courses, lessons, video modules, or CE programs",
  },
];

const COURSE_CATEGORIES = [
  "Tax Office Startup",
  "Compliance",
  "Accounting",
  "Bookkeeping",
  "Audit",
  "Financial Planning",
  "Business Tax",
  "Payroll",
];

const COURSE_LEVELS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
];

type ContentType = "VIDEO" | "TEXT" | "QUIZ";
interface QuizQ {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}
interface LessonDraft {
  id: string;
  title: string;
  description: string;
  contentType: ContentType;
  videoUrl: string;
  textContent: string;
  downloadUrl?: string;
  downloadName?: string;
  duration: number;
  isFree: boolean;
  quiz: { title: string; passMark: number; questions: QuizQ[] };
}
interface SectionDraft {
  id: string;
  title: string;
  lessons: LessonDraft[];
}

const uid = () => Math.random().toString(36).slice(2);
const emptyQuiz = () => ({ title: "Lesson Quiz", passMark: 70, questions: [] });
const emptyLesson = (): LessonDraft => ({
  id: uid(),
  title: "",
  description: "",
  contentType: "VIDEO",
  videoUrl: "",
  textContent: "",
  downloadUrl: "",
  downloadName: "",
  duration: 0,
  isFree: false,
  quiz: emptyQuiz(),
});

const CT_ICONS: Record<ContentType, React.ElementType> = {
  VIDEO: Video,
  TEXT: FileText,
  QUIZ: HelpCircle,
};
const CT_LABELS: Record<ContentType, string> = {
  VIDEO: "Video",
  TEXT: "Article",
  QUIZ: "Quiz",
};

/* ── Category-specific metadata fields for Listings ── */
function ServiceFields({
  meta,
  set,
}: {
  meta: Record<string, string>;
  set: (k: string, v: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Service Type</label>
          <select
            className={sel}
            value={meta.serviceType ?? ""}
            onChange={(e) => set("serviceType", e.target.value)}
          >
            <option value="">Select…</option>
            {[
              "Tax Preparation",
              "Audit Defense",
              "Consulting",
              "Bookkeeping",
              "Payroll",
              "IRS Representation",
              "Business Formation",
              "Other",
            ].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Delivery Method</label>
          <select
            className={sel}
            value={meta.deliveryMethod ?? ""}
            onChange={(e) => set("deliveryMethod", e.target.value)}
          >
            <option value="">Select…</option>
            {["Remote / Virtual", "In-Person", "Hybrid"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>
            <Clock className="w-3 h-3 inline mr-1" />
            Turnaround
          </label>
          <input
            className={inp}
            placeholder="e.g. 3–5 business days"
            value={meta.turnaround ?? ""}
            onChange={(e) => set("turnaround", e.target.value)}
          />
        </div>
        <div>
          <label className={lbl}>
            <Globe className="w-3 h-3 inline mr-1" />
            Availability
          </label>
          <input
            className={inp}
            placeholder="e.g. Mon–Fri, 9am–5pm EST"
            value={meta.availability ?? ""}
            onChange={(e) => set("availability", e.target.value)}
          />
        </div>
      </div>
    </>
  );
}

function ProductFields({
  meta,
  set,
}: {
  meta: Record<string, string>;
  set: (k: string, v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={lbl}>
          <Package className="w-3 h-3 inline mr-1" />
          Product Type
        </label>
        <select
          className={sel}
          value={meta.productType ?? ""}
          onChange={(e) => set("productType", e.target.value)}
        >
          <option value="">Select…</option>
          {[
            "PDF Guide",
            "Excel Template",
            "Word Template",
            "Software Tool",
            "Bundle / Pack",
            "Checklist",
            "Other",
          ].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={lbl}>
          <Download className="w-3 h-3 inline mr-1" />
          Delivery
        </label>
        <select
          className={sel}
          value={meta.deliveryMethod ?? ""}
          onChange={(e) => set("deliveryMethod", e.target.value)}
        >
          <option value="">Select…</option>
          {["Instant Download", "Email Delivery", "Member Portal Access"].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function CourseExternalFields({
  meta,
  set,
}: {
  meta: Record<string, string>;
  set: (k: string, v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>COURSE CATEGORY / TOPIC</label>
          <select
            className={sel}
            value={meta.courseCategory ?? COURSE_CATEGORIES[0]}
            onChange={(e) => set("courseCategory", e.target.value)}
          >
            {COURSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>SKILL LEVEL</label>
          <select
            className={sel}
            value={meta.level ?? "BEGINNER"}
            onChange={(e) => set("level", e.target.value)}
          >
            {COURSE_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>ESTIMATED DURATION / FORMAT</label>
          <input
            className={inp}
            placeholder="e.g. 6 Hours On-Demand, 4 Weeks Live Cohort"
            value={meta.duration ?? ""}
            onChange={(e) => set("duration", e.target.value)}
          />
        </div>
        <div>
          <label className={lbl}>ACCREDITATION / CE CREDITS (OPTIONAL)</label>
          <input
            className={inp}
            placeholder="e.g. 8 IRS CE Credits, NASBA CPE Approved"
            value={meta.accreditation ?? ""}
            onChange={(e) => set("accreditation", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default function CreateListingPage() {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);

  // Stripe Setup & Onboarding State
  const [stripeStatus, setStripeStatus] = useState<{ connected: boolean; onboarded: boolean } | null>(null);
  const [checkingStripe, setCheckingStripe] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [stripeJustConnected, setStripeJustConnected] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("stripe=success")) {
      setStripeJustConnected(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setCheckingStripe(true);
      fetch("/api/seller/stripe-connect")
        .then((r) => r.json())
        .then((data) => {
          if (data && typeof data.onboarded === "boolean") {
            setStripeStatus({ connected: !!data.connected, onboarded: !!data.onboarded });
          }
        })
        .catch((err) => console.warn("Failed to check Stripe status:", err))
        .finally(() => setCheckingStripe(false));
    }
  }, [user]);

  const isAdmin = user?.role === "ADMIN";
  const isStripeReady = isAdmin || !!(stripeStatus?.connected && stripeStatus?.onboarded);

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    setStripeError("");
    try {
      const res = await fetch("/api/seller/stripe-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: "/marketplace/create" }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        window.location.href = data.url;
      } else {
        setStripeError(data?.error || "Failed to start Stripe onboarding. Please try again.");
      }
    } catch (err: any) {
      setStripeError(err?.message || "Network error. Please try again.");
    } finally {
      setConnectingStripe(false);
    }
  };

  // Listing State (for Service, Product, or External Course)
  const [category, setCategory] = useState<"SERVICE" | "PRODUCT" | "COURSE">("SERVICE");
  const [courseDeliveryMode, setCourseDeliveryMode] = useState<"HOSTED" | "EXTERNAL">("HOSTED");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [externalUrl, setExternalUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [doneListing, setDoneListing] = useState(false);

  // Course Creator State (when category === 'COURSE')
  const [courseStep, setCourseStep] = useState<1 | 2>(1);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseThumbnail, setCourseThumbnail] = useState("");
  const [courseCategory, setCourseCategory] = useState(COURSE_CATEGORIES[0]);
  const [courseLevel, setCourseLevel] = useState("BEGINNER");
  const [courseIsFree, setCourseIsFree] = useState(true);
  const [coursePrice, setCoursePrice] = useState(0);
  const [courseLearningOutcomes, setCourseLearningOutcomes] = useState<string[]>([""]);
  const [courseRequirements, setCourseRequirements] = useState<string[]>([""]);
  const [courseSections, setCourseSections] = useState<SectionDraft[]>([
    { id: uid(), title: "Section 1: Introduction", lessons: [emptyLesson()] },
  ]);
  const [openSec, setOpenSec] = useState<Set<string>>(new Set());
  const [thumbUploading, setThumbUploading] = useState(false);
  const [doneCourse, setDoneCourse] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const courseThumbInputRef = useRef<HTMLInputElement>(null);

  const setMetaField = (k: string, v: string) => setMeta((prev) => ({ ...prev, [k]: v }));

  const autoSlug = (t: string) =>
    t
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80);

  const handleCourseTitleChange = (t: string) => {
    setCourseTitle(t);
    if (!courseSlug || courseSlug === autoSlug(courseTitle)) {
      setCourseSlug(autoSlug(t));
    }
  };

  // Image upload for general listing
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    if (Array.from(files).some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024)) { setError("Choose a JPG, PNG, or WEBP image under 10 MB."); e.target.value = ""; return; }
    setUploadingImg(true);
    setError("");
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      fd.append("folder", "marketplace");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed to upload banner.");
        return;
      }
      const d = (await res.json()) as { urls?: string[] };
      if (d.urls) setImages((prev) => [...prev, ...d.urls!].slice(0, 4));
    } catch {
      setError("Image upload failed.");
    } finally {
      setUploadingImg(false);
    }
  };

  // Thumbnail upload for Course
  const handleCourseThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setThumbUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("files", file);
      fd.append("folder", "course-thumbnails");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed to upload course thumbnail.");
        return;
      }
      const data = (await res.json()) as { urls?: string[] };
      if (data.urls?.[0]) setCourseThumbnail(data.urls[0]);
    } catch {
      setError("Failed to upload course cover image.");
    } finally {
      setThumbUploading(false);
    }
  };

  // Tags
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };
  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  // Course sections/lessons helpers
  const addSection = () => {
    const id = uid();
    setCourseSections((p) => [
      ...p,
      { id, title: `Section ${p.length + 1}`, lessons: [emptyLesson()] },
    ]);
    setOpenSec((p) => new Set([...p, id]));
  };
  const rmSection = (id: string) => setCourseSections((p) => p.filter((s) => s.id !== id));
  const updSection = (id: string, title: string) =>
    setCourseSections((p) => p.map((s) => (s.id === id ? { ...s, title } : s)));
  const addLesson = (sid: string) =>
    setCourseSections((p) =>
      p.map((s) => (s.id === sid ? { ...s, lessons: [...s.lessons, emptyLesson()] } : s))
    );
  const rmLesson = (sid: string, lid: string) =>
    setCourseSections((p) =>
      p.map((s) => (s.id === sid ? { ...s, lessons: s.lessons.filter((l) => l.id !== lid) } : s))
    );
  const updLesson = (sid: string, lid: string, field: keyof LessonDraft, val: unknown) =>
    setCourseSections((p) =>
      p.map((s) =>
        s.id === sid
          ? { ...s, lessons: s.lessons.map((l) => (l.id === lid ? { ...l, [field]: val } : l)) }
          : s
      )
    );
  const updQuiz = (sid: string, lid: string, field: string, val: unknown) =>
    setCourseSections((p) =>
      p.map((s) =>
        s.id === sid
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.id === lid ? { ...l, quiz: { ...l.quiz, [field]: val } } : l
              ),
            }
          : s
      )
    );
  const addQ = (sid: string, lid: string) =>
    setCourseSections((p) =>
      p.map((s) =>
        s.id === sid
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.id === lid
                  ? {
                      ...l,
                      quiz: {
                        ...l.quiz,
                        questions: [
                          ...l.quiz.questions,
                          { question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "" },
                        ],
                      },
                    }
                  : l
              ),
            }
          : s
      )
    );
  const rmQ = (sid: string, lid: string, qi: number) =>
    setCourseSections((p) =>
      p.map((s) =>
        s.id === sid
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.id === lid
                  ? { ...l, quiz: { ...l.quiz, questions: l.quiz.questions.filter((_, i) => i !== qi) } }
                  : l
              ),
            }
          : s
      )
    );
  const updQ = (sid: string, lid: string, qi: number, field: string, val: unknown) =>
    setCourseSections((p) =>
      p.map((s) =>
        s.id === sid
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.id === lid
                  ? {
                      ...l,
                      quiz: {
                        ...l.quiz,
                        questions: l.quiz.questions.map((q, i) =>
                          i === qi ? { ...q, [field]: val } : q
                        ),
                      },
                    }
                  : l
              ),
            }
          : s
      )
    );
  const updQOpt = (sid: string, lid: string, qi: number, oi: number, val: string) =>
    setCourseSections((p) =>
      p.map((s) =>
        s.id === sid
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.id === lid
                  ? {
                      ...l,
                      quiz: {
                        ...l.quiz,
                        questions: l.quiz.questions.map((q, i) =>
                          i === qi
                            ? { ...q, options: q.options.map((o, j) => (j === oi ? val : o)) }
                            : q
                        ),
                      },
                    }
                  : l
              ),
            }
          : s
      )
    );
  const toggleSec = (id: string) =>
    setOpenSec((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // Submit General Listing (Service, Product, Network, or External Course)
  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || uploadingImg) return;
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    if (category === "COURSE" && courseDeliveryMode === "EXTERNAL" && !externalUrl.trim()) {
      setError("Please enter the external course or enrollment link.");
      return;
    }

    const isPaid = price ? parseFloat(price) > 0 : false;
    if (isPaid && !isStripeReady) {
      setError("Stripe setup required to sell. Please connect your Stripe payout account before creating a paid listing, or leave the price empty for a free listing.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: category === "COURSE" ? "TRAINING" : category,
        price: price ? parseFloat(price) : null,
        images,
        tags,
        metadata: {
          ...meta,
          externalUrl: externalUrl.trim() || undefined,
          linkUrl: externalUrl.trim() || undefined,
          courseType: category === "COURSE" ? "EXTERNAL" : undefined,
        },
        externalUrl: externalUrl.trim() || undefined,
      };

      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed to create listing.");
        return;
      }

      setDoneListing(true);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Course
  const handlePublishCourse = async (publishNow: boolean) => {
    if (!courseTitle.trim() || !courseDesc.trim()) {
      setError("Course title and description are required.");
      return;
    }

    const isPaid = !courseIsFree && coursePrice > 0;
    if (isPaid && !isStripeReady) {
      setError("Stripe setup required to sell courses. Please connect your Stripe payout account before publishing a paid course, or select 'Free Course'.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const cr = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: courseTitle.trim(),
          slug: courseSlug.trim() || autoSlug(courseTitle),
          description: courseDesc.trim(),
          thumbnail: courseThumbnail || null,
          category: courseCategory,
          level: courseLevel,
          isFree: courseIsFree,
          price: courseIsFree ? 0 : coursePrice,
          isSequential: true,
          tags: [],
          learningOutcomes: courseLearningOutcomes.filter((x) => x.trim()),
          requirements: courseRequirements.filter((x) => x.trim()),
        }),
      });

      if (!cr.ok) {
        const e = await cr.json().catch(() => ({}));
        setError(e.error || "Failed to create course.");
        setLoading(false);
        return;
      }
      const course = await cr.json();

      // Create sections & lessons
      for (let si = 0; si < courseSections.length; si++) {
        const sec = courseSections[si];
        if (!sec.title.trim()) continue;
        const sr = await fetch(`/api/admin/courses/${course.id}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: sec.title, order: si }),
        });
        if (!sr.ok) continue;
        const secData = await sr.json();

        for (let li = 0; li < sec.lessons.length; li++) {
          const l = sec.lessons[li];
          if (!l.title.trim()) continue;
          const lr = await fetch(`/api/admin/courses/${course.id}/sections/${secData.id}/lessons`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: l.title,
              description: l.description,
              contentType: l.contentType,
              videoUrl: l.videoUrl,
              textContent: l.textContent,
              downloadUrl: l.downloadUrl,
              downloadName: l.downloadName,
              duration: l.duration,
              isFree: l.isFree,
              order: li,
            }),
          });
          if (!lr.ok) continue;
          const lessonData = await lr.json();
          if (l.contentType === "QUIZ" && l.quiz.questions.length > 0) {
            await fetch(
              `/api/admin/courses/${course.id}/sections/${secData.id}/lessons/${lessonData.id}/quiz`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(l.quiz),
              }
            );
          }
        }
      }

      if (publishNow) {
        await fetch(`/api/admin/courses/${course.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PUBLISHED" }),
        });
      }

      setDoneCourse(true);
    } catch {
      setError("Failed to save course curriculum.");
    } finally {
      setLoading(false);
    }
  };

  const totalCourseLessons = courseSections.reduce((s, sec) => s + sec.lessons.length, 0);

  if (doneListing) {
    return (
      <div className="max-w-xl mx-auto text-center py-24 px-6">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-black text-[#0a1628] dark:text-white mb-3">
          Listing Created!
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Your marketplace listing has been submitted and published successfully.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/marketplace"
            className="bg-[#0a1628] dark:bg-amber-500 text-white dark:text-[#0a1628] font-bold px-6 py-3 rounded-xl hover:bg-[#1a3a6b] dark:hover:bg-amber-400 transition-all"
          >
            Go to Marketplace
          </Link>
          <button
            onClick={() => {
              setDoneListing(false);
              setTitle("");
              setDescription("");
              setPrice("");
              setImages([]);
            }}
            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-6 py-3 rounded-xl hover:bg-slate-200 transition-all"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  if (doneCourse) {
    const isAdmin = user?.role === "ADMIN";
    return (
      <div className="max-w-xl mx-auto text-center py-24 px-6">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-black text-[#0a1628] dark:text-white mb-3">
          Course Published!
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Your course has been published and is now live on the Marketplace and Academy.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/marketplace"
            className="bg-[#0a1628] dark:bg-amber-500 text-white dark:text-[#0a1628] font-bold px-6 py-3 rounded-xl hover:bg-[#1a3a6b] dark:hover:bg-amber-400 transition-all"
          >
            View on Marketplace
          </Link>
          <Link
            href="/seller-dashboard"
            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-6 py-3 rounded-xl hover:bg-slate-200 transition-all"
          >
            Seller Dashboard
          </Link>
          <Link
            href="/marketplace"
            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-6 py-3 rounded-xl hover:bg-slate-200 transition-all"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const canSell = !!(user && (
    user.role === "ADMIN" ||
    user.tier === "MARKETPLACE" || user.tier === "MARKETPLACE_PLUS"
  ));

  if (user && !canSell) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c1527] py-20 px-4">
        <div className="max-w-md mx-auto text-center bg-white dark:bg-[#172135] p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-[#ffbe24] flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-500/20">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[#0a1628] dark:text-white">Upgrade Your Plan to Access This Feature</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Creating listings, selling services, and publishing products or courses requires a <strong>Marketplace</strong> or <strong>Marketplace Plus</strong> membership.
            </p>
          </div>
          <div className="pt-3 flex flex-col gap-3">
            <Link
              href="/upgrade"
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#ffbe24] to-[#ffbe24] text-[#0a1628] font-black text-sm hover:shadow-lg transition-all text-center flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> View Upgrade Options
            </Link>
            <Link
              href="/marketplace"
              className="w-full py-3 px-6 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-center"
            >
              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mk-page lc-page">
      <div className="lc-container">
        {/* Top bar */}
        <div className="lc-heading">
          <Link
            href="/marketplace"
            aria-label="Back to marketplace"
            className="p-2.5 rounded-full bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#0a1628] dark:hover:text-white transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="lc-eyebrow">YOUR MARKETPLACE · CREATE A LISTING</span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0a1628] dark:text-white">
              Create Marketplace Listing
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
              Publish services, products, or complete academy courses
            </p>
          </div>
        </div>

        {stripeJustConnected && (
          <div role="status" className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-sm font-semibold rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>Stripe account connected successfully! You are now set up to sell paid listings.</span>
            </div>
            <button aria-label="Dismiss message" onClick={() => setStripeJustConnected(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-sm font-semibold rounded-2xl flex items-center justify-between">
            <span>{error}</span>
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="lc-layout">
          {/* ── LEFT COLUMN: CATEGORY SELECTOR + LIVE PREVIEW ── */}
          <div className="lc-sidebar space-y-6">
            {/* Category Select Cards */}
            <div className="bg-white dark:bg-[#172135] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3.5">
                What are you offering?
              </p>
              <div className="space-y-2.5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const active = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setCategory(cat.value as typeof category);
                        setError("");
                      }}
                      className={`lc-category w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 ${
                        active
                          ? "bg-[#0a1628] dark:bg-amber-500/15 border-[#0a1628] dark:border-amber-400/50 shadow-md text-white dark:text-amber-300"
                          : "bg-slate-50/70 dark:bg-white/5 border-slate-200/70 dark:border-white/5 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          active
                            ? "bg-white/15 text-white dark:text-amber-300"
                            : "bg-white dark:bg-white/10 text-slate-600 dark:text-white"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm flex items-center justify-between">
                          <span>{cat.label}</span>
                          {active && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          )}
                        </div>
                        <p
                          className={`text-xs mt-0.5 leading-snug line-clamp-2 ${
                            active ? "text-white/70 dark:text-amber-200/70" : "text-slate-400"
                          }`}
                        >
                          {cat.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LIVE PREVIEW CARD */}
            <div className="bg-white dark:bg-[#172135] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3.5 flex items-center justify-between">
                <span>Listing preview</span>
                <span className="text-[10px] font-bold text-amber-500">Live preview</span>
              </p>

              {/* If COURSE Preview */}
              {category === "COURSE" ? (
                courseDeliveryMode === "HOSTED" ? (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-[#131d2e] flex flex-col">
                    <div className="relative w-full h-48 bg-gradient-to-br from-[#0a1628] to-[#1a3a6b] flex items-center justify-center p-3 overflow-hidden">
                      {courseThumbnail ? (
                        <img
                          src={courseThumbnail}
                          alt="Preview"
                          className="w-full h-full object-contain drop-shadow-md"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-white/30 text-xs">
                          <GraduationCap className="w-10 h-10 mb-1" />
                          <span>Upload Cover Image</span>
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          {courseLevel}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                          {courseCategory}
                        </p>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {courseIsFree ? "Free" : `$${coursePrice || 0}`}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-[#0a1628] dark:text-white line-clamp-1 mb-1">
                        {courseTitle || "Untitled Course"}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                        {courseDesc || "Your course description will appear here…"}
                      </p>

                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="w-5 h-5 rounded-full bg-[#0a1628] overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 text-white text-[9px] font-bold">
                          {user?.image ? (
                            <img src={user.image} alt={user?.name ?? "User"} className="w-full h-full object-cover" />
                          ) : (
                            <span>{user?.name?.[0] || "U"}</span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                          {user?.name || "Your Name"}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {totalCourseLessons} lessons
                        </span>
                      </div>

                      <div className="w-full bg-white dark:bg-white text-[#0a1628] border border-slate-200 text-center font-black text-[10px] uppercase tracking-wider py-2 rounded-lg shadow-sm">
                        VIEW COURSE DETAILS →
                      </div>
                    </div>
                  </div>
                ) : (
                  /* External Course Preview */
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-[#131d2e] flex flex-col">
                    <div className="relative w-full h-40 bg-gradient-to-br from-[#0a1628] to-[#1a3a6b] flex items-center justify-center overflow-hidden">
                      {images[0] ? (
                        <img src={images[0]} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-white/40 text-xs flex flex-col items-center">
                          <GraduationCap className="w-8 h-8 mb-1 opacity-50" />
                          <span>Course Banner Preview</span>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 bg-[#0a1628]/90 text-amber-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-400/20">
                        <Globe className="w-2.5 h-2.5" /> External Course
                      </span>
                      {meta.level && (
                        <span className="absolute top-2 right-2 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                          {meta.level}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          {meta.courseCategory && (
                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-0.5">
                              {meta.courseCategory}
                            </p>
                          )}
                          <h4 className="font-extrabold text-sm text-[#0a1628] dark:text-white line-clamp-1">
                            {title || "Your Course Title"}
                          </h4>
                        </div>
                        <span className="text-xs font-black text-amber-500 shrink-0">
                          {price ? `$${price}` : "Free"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                        {description || "Describe your external course syllabus & outcomes…"}
                      </p>
                      {meta.duration && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-3 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" /> {meta.duration}
                        </div>
                      )}
                      <div className="w-full bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 text-[#0a1628] dark:text-amber-300 text-center font-black text-[10px] uppercase tracking-wider py-2 rounded-lg flex items-center justify-center gap-1">
                        <span>ENROLL VIA LINK</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                )
              ) : (
                /* Listing Preview (Service, Product, Network) */
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-[#131d2e] flex flex-col">
                  <div className="relative w-full h-36 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                    {images[0] ? (
                      <img src={images[0]} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-400 text-xs flex flex-col items-center">
                        <ImageIcon className="w-8 h-8 mb-1 opacity-40" />
                        <span>Banner Preview</span>
                      </div>
                    )}
                    <span className="absolute top-2 left-2 bg-[#0a1628] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                      {category}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-extrabold text-sm text-[#0a1628] dark:text-white line-clamp-1">
                        {title || "Your listing title"}
                      </h4>
                      <span className="text-xs font-black text-amber-500 shrink-0">
                        {price ? `$${price}` : "Free"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                      {description || "Describe what you offer in this listing…"}
                    </p>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: FORM BASED ON CATEGORY ── */}
          <div className="lc-editor space-y-6">
            {/* Course Delivery Mode Switcher (When 'COURSE' is selected) */}
            {category === "COURSE" && (
              <div className="bg-white dark:bg-[#172135] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    COURSE PUBLISHING METHOD
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose whether you want to host interactive lessons directly on TaxCompPro or link out to an external course.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCourseDeliveryMode("HOSTED");
                      setError("");
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 ${
                      courseDeliveryMode === "HOSTED"
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-400/10 shadow-sm"
                        : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-white/5"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        courseDeliveryMode === "HOSTED"
                          ? "bg-[#0a1628] dark:bg-amber-500 text-white dark:text-[#0a1628]"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-[#0a1628] dark:text-white flex items-center justify-between">
                        <span>Create Course on Platform</span>
                        {courseDeliveryMode === "HOSTED" && (
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Interactive curriculum, video modules, articles, quizzes, and certificates hosted here.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCourseDeliveryMode("EXTERNAL");
                      setError("");
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 ${
                      courseDeliveryMode === "EXTERNAL"
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-400/10 shadow-sm"
                        : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-white/5"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        courseDeliveryMode === "EXTERNAL"
                          ? "bg-[#0a1628] dark:bg-amber-500 text-white dark:text-[#0a1628]"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-[#0a1628] dark:text-white flex items-center justify-between">
                        <span>Link to External Course</span>
                        {courseDeliveryMode === "EXTERNAL" && (
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Add an external URL to your course on Udemy, Teachable, Thinkific, or your custom site.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════
                FORM 1: COURSE CREATOR (When 'COURSE' + 'HOSTED')
            ════════════════════════════════════════════════════════════ */}
            {category === "COURSE" && courseDeliveryMode === "HOSTED" ? (
              <div className="space-y-6">
                {/* Step tabs */}
                <div className="bg-white dark:bg-[#172135] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCourseStep(1)}
                    className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      courseStep === 1
                        ? "bg-[#0a1628] dark:bg-amber-500 text-white dark:text-[#0a1628] shadow-md"
                        : "text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <span>1. Course Details &amp; Info</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseStep(2)}
                    className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      courseStep === 2
                        ? "bg-[#0a1628] dark:bg-amber-500 text-white dark:text-[#0a1628] shadow-md"
                        : "text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <span>2. Curriculum ({totalCourseLessons} Lessons)</span>
                  </button>
                </div>

                {courseStep === 1 ? (
                  /* Step 1: Info */
                  <div className="bg-white dark:bg-[#172135] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm">
                    {/* Thumbnail uploader */}
                    <div>
                      <label className={lbl}>COURSE COVER / THUMBNAIL</label>
                      <input
                        ref={courseThumbInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCourseThumbUpload}
                      />
                      {courseThumbnail ? (
                        <div className="relative w-full h-64 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-4 overflow-hidden group">
                          <img
                            src={courseThumbnail}
                            alt="Course Thumbnail"
                            className="w-full h-full object-contain drop-shadow-xl"
                          />
                          <button
                            type="button"
                            onClick={() => setCourseThumbnail("")}
                            className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => courseThumbInputRef.current?.click()}
                          className="w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-400 rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer bg-slate-50/50 dark:bg-white/5 transition-all"
                        >
                          {thumbUploading ? (
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-slate-400 mb-2" />
                              <span className="text-sm font-bold text-slate-700 dark:text-white">
                                Click to upload course cover
                              </span>
                              <span className="text-xs text-slate-400 mt-1">
                                Recommended: 1280 × 720 px (16:9 ratio) • JPG, PNG, WebP up to 10 MB
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Title & Slug */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={lbl}>COURSE TITLE *</label>
                        <input
                          className={inp}
                          placeholder="e.g. Schedule C Reconstruction Masterclass"
                          value={courseTitle}
                          onChange={(e) => handleCourseTitleChange(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={lbl}>URL SLUG</label>
                        <input
                          className={inp}
                          placeholder="e.g. schedule-c-reconstruction"
                          value={courseSlug}
                          onChange={(e) => setCourseSlug(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className={lbl}>DESCRIPTION *</label>
                      <textarea
                        rows={4}
                        className={inp}
                        placeholder="Comprehensive summary of what students will master in this course…"
                        value={courseDesc}
                        onChange={(e) => setCourseDesc(e.target.value)}
                      />
                    </div>

                    {/* Category, Level, Price */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={lbl}>CATEGORY</label>
                        <select
                          className={sel}
                          value={courseCategory}
                          onChange={(e) => setCourseCategory(e.target.value)}
                        >
                          {COURSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>LEVEL</label>
                        <select
                          className={sel}
                          value={courseLevel}
                          onChange={(e) => setCourseLevel(e.target.value)}
                        >
                          {COURSE_LEVELS.map((l) => (
                            <option key={l.value} value={l.value}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>PRICING</label>
                        <div className="flex items-center gap-2">
                          <div className="flex bg-slate-100 dark:bg-white/10 p-1 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => {
                                setCourseIsFree(true);
                                setCoursePrice(0);
                              }}
                              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                                courseIsFree
                                  ? "bg-emerald-500 text-white shadow-sm"
                                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                              }`}
                            >
                              Free
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCourseIsFree(false);
                                if (!coursePrice) setCoursePrice(99);
                              }}
                              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                                !courseIsFree
                                  ? "bg-[#0a1628] dark:bg-amber-500 text-white dark:text-[#0a1628] shadow-sm"
                                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                              }`}
                            >
                              Paid
                            </button>
                          </div>

                          {!courseIsFree && (
                            <div className="relative flex-1 min-w-[100px]">
                              <DollarSign className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="number"
                                min={1}
                                step="0.01"
                                className={`${inp} pl-7 pr-3 py-2 text-xs`}
                                placeholder="Price"
                                value={coursePrice || ""}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setCoursePrice(val);
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {!courseIsFree && !isStripeReady && (
                          <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-900 dark:text-white space-y-2 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>Stripe Setup Required to Sell Paid Courses</span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                              To charge students for this course, connect your Stripe payout account. Stripe deducts its processing fees from that account; the platform takes 0%, or choose &quot;Free&quot;.
                            </p>
                            {stripeError && <p className="text-rose-500 text-[11px]">{stripeError}</p>}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                disabled={connectingStripe}
                                onClick={handleConnectStripe}
                                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0a1628] font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                {connectingStripe ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Connect Stripe
                              </button>
                              <Link
                                href="/seller-dashboard"
                                target="_blank"
                                className="text-[11px] font-bold text-slate-500 hover:text-amber-400 underline underline-offset-2"
                              >
                                Seller Dashboard ↗
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Learning Outcomes */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={lbl}>WHAT YOU&apos;LL LEARN</label>
                        <button
                          type="button"
                          onClick={() => setCourseLearningOutcomes([...courseLearningOutcomes, ""])}
                          className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Outcome
                        </button>
                      </div>
                      <div className="space-y-2">
                        {courseLearningOutcomes.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              className={inp}
                              placeholder={`Outcome ${idx + 1} (e.g. Master Form 8867 due diligence)`}
                              value={item}
                              onChange={(e) => {
                                const arr = [...courseLearningOutcomes];
                                arr[idx] = e.target.value;
                                setCourseLearningOutcomes(arr);
                              }}
                            />
                            {courseLearningOutcomes.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setCourseLearningOutcomes(
                                    courseLearningOutcomes.filter((_, i) => i !== idx)
                                  )
                                }
                                className="p-2.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCourseStep(2)}
                        className="inline-flex items-center gap-2 bg-[#0a1628] dark:bg-amber-500 text-white dark:text-[#0a1628] font-black text-sm px-8 py-3.5 rounded-xl shadow-lg hover:scale-105 transition-all"
                      >
                        Next: Build Curriculum <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Step 2: Curriculum */
                  <div className="bg-white dark:bg-[#172135] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-black text-[#0a1628] dark:text-white">
                          Course Sections &amp; Lessons
                        </h3>
                        <p className="text-xs text-slate-400">
                          Organize your course into modules, video lessons, articles, and quizzes
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addSection}
                        className="inline-flex items-center gap-1.5 bg-[#0a1628] dark:bg-amber-500 text-white dark:text-[#0a1628] font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-all"
                      >
                        <Plus className="w-4 h-4" /> Add Section
                      </button>
                    </div>

                    <div className="space-y-4">
                      {courseSections.map((sec, si) => (
                        <div
                          key={sec.id}
                          className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/5"
                        >
                          {/* Section header */}
                          <div className="p-4 flex items-center gap-3 bg-white dark:bg-[#1e2e45] border-b border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-black text-slate-400">
                              Section {si + 1}
                            </span>
                            <input
                              className="flex-1 font-bold text-sm bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-[#0a1628] outline-none text-[#0a1628] dark:text-white px-1 py-0.5"
                              value={sec.title}
                              onChange={(e) => updSection(sec.id, e.target.value)}
                              placeholder="Section title…"
                            />
                            <button
                              type="button"
                              onClick={() => addLesson(sec.id)}
                              className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10"
                            >
                              <Plus className="w-3.5 h-3.5" /> Lesson
                            </button>
                            {courseSections.length > 1 && (
                              <button
                                type="button"
                                onClick={() => rmSection(sec.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Lessons inside section */}
                          <div className="p-4 space-y-3">
                            {sec.lessons.map((lesson, li) => {
                              const Icon = CT_ICONS[lesson.contentType];
                              return (
                                <div
                                  key={lesson.id}
                                  className="bg-white dark:bg-[#172135] p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                                      <Icon className="w-4 h-4 text-slate-600 dark:text-white" />
                                    </span>
                                    <input
                                      className={inp}
                                      placeholder={`Lesson ${li + 1} Title *`}
                                      value={lesson.title}
                                      onChange={(e) =>
                                        updLesson(sec.id, lesson.id, "title", e.target.value)
                                      }
                                    />
                                    <select
                                      className="font-[inherit] text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-[#172135] text-slate-700 dark:text-white outline-none"
                                      value={lesson.contentType}
                                      onChange={(e) =>
                                        updLesson(
                                          sec.id,
                                          lesson.id,
                                          "contentType",
                                          e.target.value as ContentType
                                        )
                                      }
                                    >
                                      <option value="VIDEO">Video</option>
                                      <option value="TEXT">Article</option>
                                      <option value="QUIZ">Quiz</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => rmLesson(sec.id, lesson.id)}
                                      className="p-2 text-slate-400 hover:text-red-500 rounded-lg"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {/* Lesson Title & Description */}
                                  <input
                                    className={inp}
                                    placeholder={`Lesson ${li + 1} Title *`}
                                    value={lesson.title}
                                    onChange={(e) =>
                                      updLesson(sec.id, lesson.id, "title", e.target.value)
                                    }
                                  />
                                  <input
                                    className="w-full font-[inherit] text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200"
                                    placeholder="Lesson description or overview notes (optional)"
                                    value={lesson.description}
                                    onChange={(e) =>
                                      updLesson(sec.id, lesson.id, "description", e.target.value)
                                    }
                                  />

                                  {/* Downloadable Attachment / Resource */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <input
                                      className="font-[inherit] text-xs px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-[#172135] text-slate-700 dark:text-white"
                                      placeholder="Resource / Download Name (e.g. Workbook.pdf)"
                                      value={lesson.downloadName ?? ""}
                                      onChange={(e) =>
                                        updLesson(sec.id, lesson.id, "downloadName", e.target.value)
                                      }
                                    />
                                    <input
                                      className="font-[inherit] text-xs px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-[#172135] text-slate-700 dark:text-white"
                                      placeholder="Download File URL (PDF / Worksheet link)"
                                      value={lesson.downloadUrl ?? ""}
                                      onChange={(e) =>
                                        updLesson(sec.id, lesson.id, "downloadUrl", e.target.value)
                                      }
                                    />
                                  </div>

                                  {/* Lesson Type Specific Fields */}
                                  {lesson.contentType === "VIDEO" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div className="sm:col-span-2">
                                        <input
                                          className={inp}
                                          placeholder="Video URL (YouTube, Vimeo, Cloudinary, MP4)"
                                          value={lesson.videoUrl}
                                          onChange={(e) =>
                                            updLesson(sec.id, lesson.id, "videoUrl", e.target.value)
                                          }
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          className={inp}
                                          placeholder="Sec"
                                          value={lesson.duration || ""}
                                          onChange={(e) =>
                                            updLesson(
                                              sec.id,
                                              lesson.id,
                                              "duration",
                                              parseInt(e.target.value) || 0
                                            )
                                          }
                                        />
                                        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={lesson.isFree}
                                            onChange={(e) =>
                                              updLesson(sec.id, lesson.id, "isFree", e.target.checked)
                                            }
                                            className="w-3.5 h-3.5 rounded"
                                          />
                                          Free
                                        </label>
                                      </div>
                                    </div>
                                  )}

                                  {lesson.contentType === "TEXT" && (
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                      <RichTextEditor
                                        value={lesson.textContent}
                                        onChange={(html) =>
                                          updLesson(sec.id, lesson.id, "textContent", html)
                                        }
                                        placeholder="Write lesson text, study notes, instructions…"
                                      />
                                    </div>
                                  )}

                                  {lesson.contentType === "QUIZ" && (
                                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                          Quiz Questions ({lesson.quiz.questions.length})
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => addQ(sec.id, lesson.id)}
                                          className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                                        >
                                          <Plus className="w-3.5 h-3.5" /> Add Question
                                        </button>
                                      </div>

                                      {lesson.quiz.questions.map((q, qi) => (
                                        <div
                                          key={qi}
                                          className="bg-white dark:bg-[#172135] p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2"
                                        >
                                          <div className="flex items-center gap-2">
                                            <input
                                              className={inp}
                                              placeholder={`Question ${qi + 1}`}
                                              value={q.question}
                                              onChange={(e) =>
                                                updQ(sec.id, lesson.id, qi, "question", e.target.value)
                                              }
                                            />
                                            <button
                                              type="button"
                                              onClick={() => rmQ(sec.id, lesson.id, qi)}
                                              className="text-slate-400 hover:text-red-500"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 pl-2">
                                            {q.options.map((opt, oi) => (
                                              <div key={oi} className="flex items-center gap-1.5">
                                                <input
                                                  type="radio"
                                                  name={`q-${lesson.id}-${qi}`}
                                                  checked={q.correctAnswer === oi}
                                                  onChange={() =>
                                                    updQ(sec.id, lesson.id, qi, "correctAnswer", oi)
                                                  }
                                                />
                                                <input
                                                  className={inp}
                                                  placeholder={`Option ${oi + 1}`}
                                                  value={opt}
                                                  onChange={(e) =>
                                                    updQOpt(
                                                      sec.id,
                                                      lesson.id,
                                                      qi,
                                                      oi,
                                                      e.target.value
                                                    )
                                                  }
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCourseStep(1)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-700 px-4 py-2"
                      >
                        ← Back to Details
                      </button>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handlePublishCourse(false)}
                          className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        >
                          Save as Draft
                        </button>
                        <button
                          type="button"
                          disabled={loading || (!courseIsFree && coursePrice > 0 && !isStripeReady)}
                          onClick={() => handlePublishCourse(true)}
                          className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#ffbe24] to-[#ffbe24] text-[#0a1628] font-black text-sm hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          Publish Course
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ════════════════════════════════════════════════════════════
                 FORM 2: STANDARD MARKETPLACE LISTING (Service / Product / Network)
              ════════════════════════════════════════════════════════════ */
              <form
                onSubmit={handleSubmitListing}
                className="lc-form bg-white dark:bg-[#172135] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm"
              >
                <div className="lc-section-heading"><span>01</span><div><h2>Make a great first impression</h2><p>Add a clear cover, a specific title, and what buyers can expect.</p></div></div>
                {/* Banner image */}
                <div>
                  <label className={lbl}>
                    {category === "COURSE" ? "Course cover image" : "Cover image"}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  {images[0] ? (
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden group">
                      <img src={images[0]} alt="Banner" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remove cover image"
                        onClick={() => { setImages([]); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={uploadingImg}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-40 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-400 rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer bg-slate-50/50 dark:bg-white/5 transition-all"
                    >
                      {uploadingImg ? (
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-sm font-bold text-slate-700 dark:text-white">
                            {category === "COURSE" ? "Click to upload course banner" : "Click to upload banner"}
                          </span>
                          <span className="text-xs text-slate-400 mt-1">
                            Recommended: 1200 × 630 px (1.91:1 ratio) • JPG, PNG, WebP up to 10 MB
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label htmlFor="listing-title" className={lbl}>
                    {category === "COURSE" ? "Course title *" : "Title *"}
                  </label>
                  <input
                    className={inp}
                    placeholder={
                      category === "SERVICE"
                        ? "e.g. Full-Service Tax Preparation & Audit Protection"
                        : category === "PRODUCT"
                        ? "e.g. Schedule C Due Diligence Workpaper Toolkit"
                        : category === "COURSE"
                        ? "e.g. IRS Practice & Procedure Masterclass 2026"
                        : "e.g. National Tax Practitioners Referral Circle"
                    }
                    id="listing-title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="listing-description" className={lbl}>
                    {category === "COURSE" ? "Course description *" : "Description *"}
                  </label>
                  <textarea
                    id="listing-description"
                    required
                    rows={5}
                    className={inp}
                    placeholder={
                      category === "COURSE"
                        ? "Describe course curriculum, syllabus, prerequisites, and learning outcomes in detail…"
                        : "Describe your listing in detail…"
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="lc-section-heading lc-divider"><span>02</span><div><h2>The details that matter</h2><p>Set your price and help people understand how your offer works.</p></div></div>
                {/* Price & External Link */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="listing-price" className={lbl}>Price (USD)</label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="listing-price"
                        type="number"
                        min={0}
                        step="0.01"
                        className={`${inp} pl-9`}
                        placeholder="0.00 — leave blank for free"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </div>

                    {parseFloat(price || "0") > 0 && !isStripeReady && (
                      <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-900 dark:text-white space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Stripe Setup Required to Sell</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          To sell listings for money, connect your Stripe account so buyers pay you directly. Stripe deducts its processing fees from that account; the platform takes 0%.
                        </p>
                        {stripeError && <p className="text-rose-500 text-[11px]">{stripeError}</p>}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={connectingStripe}
                            onClick={handleConnectStripe}
                            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0a1628] font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {connectingStripe ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            Connect Stripe
                          </button>
                          <Link
                            href="/seller-dashboard"
                            target="_blank"
                            className="text-[11px] font-bold text-slate-500 hover:text-amber-400 underline underline-offset-2"
                          >
                            Seller Dashboard ↗
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="listing-url" className={lbl}>
                      {category === "COURSE" ? "Course enrollment link *" : "Booking or external link"}
                    </label>
                    <input
                      className={inp}
                      placeholder={
                        category === "COURSE"
                          ? "https://yourdomain.com/courses/tax-masterclass or Udemy URL"
                          : "https://example.com/booking or contact"
                      }
                      id="listing-url"
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                    />
                  </div>
                </div>

                {/* Category-specific fields */}
                {category === "SERVICE" && <ServiceFields meta={meta} set={setMetaField} />}
                {category === "PRODUCT" && <ProductFields meta={meta} set={setMetaField} />}
                {category === "COURSE" && <CourseExternalFields meta={meta} set={setMetaField} />}

                <div className="lc-section-heading lc-divider"><span>03</span><div><h2>Help the right people find you</h2><p>Add up to eight relevant topics or specialties.</p></div></div>
                {/* Tags */}
                <div>
                  <label htmlFor="listing-tags" className={lbl}>Tags ({tags.length}/8)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      className={inp}
                      placeholder="Add tag and press Enter…"
                      id="listing-tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold text-xs rounded-xl hover:bg-slate-200"
                    >
                      Add
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 text-xs font-bold bg-amber-50 dark:bg-amber-400/10 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-400/20"
                        >
                          #{t}
                          <button type="button" aria-label={`Remove tag ${t}`} onClick={() => removeTag(t)}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lc-publish-bar">
                  <div>
                    <p>Ready to share your expertise?<span>Review your preview before publishing.</span></p>
                    {parseFloat(price || "0") > 0 && !isStripeReady && (
                      <p className="text-xs text-amber-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Stripe payout setup required before publishing a paid listing.</span>
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading || uploadingImg || (parseFloat(price || "0") > 0 && !isStripeReady)}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#ffbe24] to-[#ffbe24] text-[#0a1628] font-black text-sm hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {category === "COURSE" ? "Publish Course Listing" : "Publish Listing"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
