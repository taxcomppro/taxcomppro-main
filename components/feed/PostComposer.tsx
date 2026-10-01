"use client";
import { PRIVACY_REMINDER, detectSensitiveData } from "@/lib/specialists/catalog";

import { useState, useRef, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import { Loading03Icon as Loader2, Cancel01Icon as X, Alert02Icon as AlertCircle, Calendar03Icon as Calendar, Clock01Icon as Clock, CrownIcon as Crown, Link01Icon } from "hugeicons-react";
import { Image01Icon, SentIcon, Video02Icon } from "hugeicons-react";
import type { FeedPost } from "@/components/feed/PostCard";
import UpgradeModal from "@/components/ui/UpgradeModal";

interface Props {
  onPostCreated: (post: FeedPost) => void;
  onScheduled?: () => void; // callback to refresh scheduled list
}

const MAX_VIDEO_SECS = 30;

// Returns a datetime-local string for the min attribute (5 min from now)
function minDateTimeLocal() {
  const d = new Date(Date.now() + 5 * 60_000);
  return d.toISOString().slice(0, 16);
}

export default function PostComposer({ onPostCreated, onScheduled }: Props) {
  const user         = useAppSelector(s => s.auth.user);
  const isFree       = (user?.tier === "FREE" || !user?.tier) && user?.role !== "ADMIN";
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [content,    setContent]    = useState("");
  const [expanded,   setExpanded]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previews,   setPreviews]   = useState<{ file: File; url: string }[]>([]);
  const [video,      setVideo]      = useState<{ file: File; url: string; duration: number } | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [uploading,  setUploading]  = useState(false);

  // Link state
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  // Schedule state
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt,   setScheduledAt]   = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const textRef  = useRef<HTMLTextAreaElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  /* ── image handling ── */
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const remaining = 4 - previews.length;
    Array.from(files).slice(0, remaining).forEach(file => {
      setPreviews(p => [...p, { file, url: URL.createObjectURL(file) }]);
    });
  }, [previews.length]);

  const removeImage = (idx: number) => {
    setPreviews(p => {
      URL.revokeObjectURL(p[idx].url);
      return p.filter((_, i) => i !== idx);
    });
  };

  /* ── video handling ── */
  const handleVideoFile = (files: FileList | null) => {
    setVideoError(null);
    if (!files || !files[0]) return;
    const file = files[0];
    if (!file.type.startsWith("video/")) { setVideoError("Only video files are allowed."); return; }
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      if (el.duration > MAX_VIDEO_SECS) {
        setVideoError(`Video must be ${MAX_VIDEO_SECS} seconds or less (yours is ${Math.round(el.duration)}s).`);
        URL.revokeObjectURL(url);
      } else {
        setPreviews([]);
        setVideo({ file, url, duration: Math.round(el.duration) });
      }
      URL.revokeObjectURL(el.src);
    };
    el.src = url;
  };

  const removeVideo = () => {
    if (video) URL.revokeObjectURL(video.url);
    setVideo(null);
    setVideoError(null);
    if (videoRef.current) videoRef.current.value = "";
  };

  const reset = () => {
    setExpanded(false); setContent(""); setPreviews([]); removeVideo();
    setShowScheduler(false); setScheduledAt(""); setScheduleError(null);
    setShowLinkInput(false); setLinkUrl(""); setLinkText("");
  };

  const insertLink = () => {
    let url = linkUrl.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/")) {
      url = "https://" + url;
    }
    const text = linkText.trim();
    const snippet = text ? `[${text}](${url})` : url;

    if (textRef.current) {
      const start = textRef.current.selectionStart ?? content.length;
      const end = textRef.current.selectionEnd ?? content.length;
      const before = content.slice(0, start);
      const after = content.slice(end);
      const spacerBefore = before.length > 0 && !before.endsWith(" ") && !before.endsWith("\n") ? " " : "";
      const spacerAfter = after.length > 0 && !after.startsWith(" ") && !after.startsWith("\n") ? " " : "";
      const newContent = `${before}${spacerBefore}${snippet}${spacerAfter}${after}`;
      setContent(newContent);
      setTimeout(() => {
        if (textRef.current) {
          textRef.current.focus();
          const newPos = start + spacerBefore.length + snippet.length + spacerAfter.length;
          textRef.current.setSelectionRange(newPos, newPos);
        }
      }, 50);
    } else {
      setContent(prev => (prev ? `${prev} ${snippet}` : snippet));
    }

    setLinkUrl("");
    setLinkText("");
    setShowLinkInput(false);
  };

  /* ── submit (immediate or scheduled) ── */
  const handleSubmit = async (asScheduled = false) => {
    if ((!content.trim() && previews.length === 0 && !video) || submitting) return;

    if (asScheduled) {
      if (!scheduledAt) { setScheduleError("Please pick a date and time."); return; }
      const picked = new Date(scheduledAt);
      if (picked <= new Date(Date.now() + 60_000)) { setScheduleError("Must be at least 1 minute in the future."); return; }
      setScheduleError(null);
    }

    if (detectSensitiveData(content)) { setScheduleError(PRIVACY_REMINDER); return; }
    setSubmitting(true);
    try {
      let imageUrls: string[] = [];
      let videoUrl: string | null = null;

      if (previews.length > 0) {
        setUploading(true);
        const fd = new FormData();
        previews.forEach(p => fd.append("files", p.file));
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        setUploading(false);
        if (!res.ok) throw new Error("Image upload failed");
        const data = await res.json() as { urls: string[] };
        imageUrls = data.urls;
      }

      if (video) {
        setUploading(true);
        const ticketRes = await fetch("/api/upload-video");
        if (!ticketRes.ok) throw new Error("Could not get upload token");
        const { timestamp, signature, folder, apiKey, cloudName } =
          await ticketRes.json() as { timestamp: number; signature: string; folder: string; apiKey: string; cloudName: string; };
        const fd = new FormData();
        fd.append("file",      video.file);
        fd.append("timestamp", String(timestamp));
        fd.append("signature", signature);
        fd.append("api_key",   apiKey);
        fd.append("folder",    folder);
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, { method: "POST", body: fd });
        setUploading(false);
        if (!uploadRes.ok) throw new Error("Video upload failed");
        const data = await uploadRes.json() as { secure_url: string; duration: number };
        if (data.duration && data.duration > MAX_VIDEO_SECS) throw new Error(`Video must be ${MAX_VIDEO_SECS}s or less`);
        videoUrl = data.secure_url;
      }

      const body: Record<string, unknown> = { content: content.trim(), images: imageUrls, videoUrl };
      if (asScheduled && scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString();

      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        if (asScheduled) {
          onScheduled?.();
        } else {
          const post = await res.json() as FeedPost;
          onPostCreated(post);
        }
        reset();
      }
      else { const error = await res.json(); setScheduleError(error.error || "Could not publish your post."); }
    } catch { setScheduleError("Could not publish your post. Please try again."); }
    finally { setSubmitting(false); setUploading(false); }
  };

  const canSubmit = (content.trim().length > 0 || previews.length > 0 || !!video) && !submitting;

  return (
    <>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} feature="Posting & interacting" />}

    <div className="feed-surface feed-composer overflow-hidden">
      {/* VIP required strip for FREE members */}
      {isFree && (
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200 px-4 py-2">
          <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-xs font-bold text-amber-700">VIP required to post, like &amp; comment</span>
          <button onClick={() => setShowUpgrade(true)} className="ml-auto text-[10px] font-black text-amber-700 bg-amber-200 hover:bg-amber-300 px-2.5 py-1 rounded-full transition-all">Upgrade →</button>
        </div>
      )}

      <div className="flex items-start gap-3 p-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-[#0a1628] flex items-center justify-center overflow-hidden shrink-0">
          {user?.image
            ? <img src={user.image} alt={user.name ?? ""} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            : <span className="text-white font-bold text-sm">{user?.name?.[0]?.toUpperCase()}</span>}
        </div>

        <div className="flex-1">
          {!expanded ? (
            <button
              onClick={() => { if (isFree) { setShowUpgrade(true); return; } setExpanded(true); setTimeout(() => textRef.current?.focus(), 50); }}
              className="w-full text-left text-slate-400 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full px-5 py-3 transition-all">
              Share an insight or update, {user?.name?.split(" ")[0]}…
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-300 mb-2">{PRIVACY_REMINDER} Mention @Atlas or a specialist to invite an AI reply.</p>
              <textarea
                ref={textRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleSubmit(); }}
                placeholder="What's on your mind? Share a tax insight, update, or question…"
                rows={4}
                className="w-full font-[inherit] text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 resize-none outline-none focus:border-[#0a1628] focus:ring-2 focus:ring-[#0a1628]/10 transition-all"
              />

              {/* Image previews */}
              {previews.length > 0 && (
                <div className={`grid gap-2 ${previews.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {previews.map((p, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden bg-slate-100 aspect-video">
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Video preview */}
              {video && (
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video
                    src={video.url}
                    controls
                    playsInline
                    controlsList="nodownload nofullscreen noremoteplayback"
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full max-h-64 object-contain"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{video.duration}s</div>
                  <button onClick={removeVideo} className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Video error */}
              {videoError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{videoError}</p>
                </div>
              )}

              {scheduleError && !showScheduler && <p role="alert" className="text-xs text-red-500">{scheduleError}</p>}
              {/* Schedule picker */}
              {showScheduler && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-bold text-blue-800">Schedule for later</span>
                    <button onClick={() => { setShowScheduler(false); setScheduledAt(""); setScheduleError(null); }}
                      className="ml-auto text-blue-400 hover:text-blue-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    min={minDateTimeLocal()}
                    onChange={e => { setScheduledAt(e.target.value); setScheduleError(null); }}
                    className="w-full text-sm bg-white border border-blue-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-slate-700 font-[inherit]"
                  />
                  {scheduleError && <p className="text-xs text-red-500">{scheduleError}</p>}
                  {scheduledAt && (
                    <p className="text-[11px] text-blue-600 font-semibold">
                      📅 Will publish {new Date(scheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Link inserter */}
              {showLinkInput && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link01Icon className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">Add Link to Post</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLinkInput(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Link URL *</label>
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={e => setLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); insertLink(); } }}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-slate-800 font-[inherit]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Display Text (Optional)</label>
                      <input
                        type="text"
                        value={linkText}
                        onChange={e => setLinkText(e.target.value)}
                        placeholder="e.g. IRS Guidance, Form 8867"
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); insertLink(); } }}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-slate-800 font-[inherit]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">Tip: You can also paste URLs directly into the post text!</span>
                    <button
                      type="button"
                      onClick={insertLink}
                      disabled={!linkUrl.trim()}
                      className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      Insert Link
                    </button>
                  </div>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-1">
                  {/* Photo */}
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => handleFiles(e.target.files)} />
                  <button onClick={() => { setVideo(null); fileRef.current?.click(); }}
                    disabled={!!video || previews.length >= 4}
                    title="Upload up to 4 photos • Recommended: up to 1920 × 1080 px • Max 10 MB each"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 px-3 py-2 rounded-lg hover:bg-emerald-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <Image01Icon className="w-4 h-4 text-emerald-500" />
                    Photo{previews.length > 0 ? ` (${previews.length}/4)` : ""}
                  </button>

                  {/* Video */}
                  <input ref={videoRef} type="file" accept="video/*" className="hidden"
                    onChange={e => handleVideoFile(e.target.files)} />
                  <button onClick={() => { setPreviews([]); videoRef.current?.click(); }}
                    disabled={previews.length > 0}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-violet-600 px-3 py-2 rounded-lg hover:bg-violet-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <Video02Icon className="w-4 h-4 text-violet-500" />
                    Video
                  </button>

                  {/* Link */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkInput(prev => !prev);
                      setShowScheduler(false);
                    }}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-all ${showLinkInput ? "text-blue-700 bg-blue-50" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"}`}>
                    <Link01Icon className="w-4 h-4 text-blue-500" />
                    Link
                  </button>

                  {/* Schedule */}
                  <button
                    onClick={() => {
                      setShowScheduler(s => !s);
                      setShowLinkInput(false);
                    }}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-all ${showScheduler ? "text-blue-700 bg-blue-50" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"}`}>
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Schedule
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={reset}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition-all">
                    Cancel
                  </button>

                  {/* Schedule submit */}
                  {showScheduler && (
                    <button onClick={() => handleSubmit(true)} disabled={!canSubmit || !scheduledAt}
                      className="flex items-center gap-2 text-xs font-bold bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition-all disabled:opacity-40">
                      {submitting
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                        : <><Calendar className="w-4 h-4" /> Schedule</>}
                    </button>
                  )}

                  {/* Immediate post */}
                  {!showScheduler && (
                    <button onClick={() => handleSubmit(false)} disabled={!canSubmit}
                      className="flex items-center gap-2 text-xs font-bold bg-[#0a1628] text-white px-5 py-2.5 rounded-full hover:bg-[#1a3a6b] transition-all disabled:opacity-40">
                      {uploading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                        : submitting
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting…</>
                        : <><SentIcon className="w-4 h-4" /> Post</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
