"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Lock, Eye, EyeOff, GraduationCap, ArrowRight } from "lucide-react";
import { signUp, useSession } from "@/lib/auth-client";

interface InviteInfo {
  name: string; email: string; alreadyLinked: boolean; officeName: string | null;
  eroName: string; toolkitName: string; versionLabel: string;
}

export default function AcceptTrainingInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [invite, setInvite] = useState<InviteInfo | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/training/invite/${token}`)
      .then(r => r.ok ? r.json() as Promise<InviteInfo> : Promise.reject())
      .then(setInvite)
      .catch(() => setInvite(null));
  }, [token]);

  const link = async () => {
    const res = await fetch(`/api/training/invite/${token}/link`, { method: "POST" });
    if (res.ok) {
      const inv = await res.json() as { id: string };
      router.push(`/my-training/${inv.id}`);
    } else {
      const d = await res.json() as { error?: string };
      setError(d.error || "Could not link your account to this invitation.");
    }
  };

  // If already logged in (matching email), just link and go.
  useEffect(() => {
    if (isPending || !session || !invite) return;
    if (session.user.email.toLowerCase() === invite.email.toLowerCase()) link();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session, invite]);

  const register = async () => {
    if (!invite) return;
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const res = await signUp.email({ email: invite.email, password, name: invite.name });
      if (res.error) { setError(res.error.message || "Could not create your account."); setLoading(false); return; }
      await link();
    } catch { setError("Something went wrong."); setLoading(false); }
  };

  if (invite === undefined) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-[#0a1628]" /></div>;
  if (invite === null) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <p className="font-black text-[#0a1628] mb-2">Invitation not found</p>
      <p className="text-sm text-slate-500">This link may have expired or been revoked. Contact your office administrator.</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-[var(--font-urbanist,Urbanist),sans-serif] px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-6">
          <Link href="/"><Image src="/Tonique_blanchard_upscale_upscaled (1).png" alt="Tax Compliance Pro" width={200} height={60} className="object-contain" style={{ width: "200px", height: "auto", maxHeight: "60px" }} loading="eager" /></Link>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
          <div className="w-12 h-12 rounded-2xl bg-[#0a1628] flex items-center justify-center mb-4"><GraduationCap className="w-6 h-6 text-white" /></div>
          <h1 className="text-xl font-black text-[#0a1628] mb-1">You've been invited to train</h1>
          <p className="text-sm text-slate-500 mb-6">
            <strong>{invite.eroName}</strong>{invite.officeName ? ` (${invite.officeName})` : ""} invited you to complete
            <strong> {invite.toolkitName}</strong> — {invite.versionLabel}.
          </p>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">{error}</div>}

          <div className="bg-slate-50 rounded-xl p-4 mb-5 text-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Your Name</p>
            <p className="font-bold text-[#0a1628] mb-3">{invite.name}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Your Email</p>
            <p className="font-bold text-[#0a1628]">{invite.email}</p>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            This is your own individual account — not shared with anyone else in your office.
          </p>

          <div className="space-y-3 mb-4">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password (8+ characters)"
                className="w-full text-sm pl-10 pr-10 py-3 border border-slate-200 rounded-xl outline-none focus:border-[#0a1628] focus:ring-2 focus:ring-[#0a1628]/10" />
              <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type={showPw ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm password"
                className="w-full text-sm pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-[#0a1628] focus:ring-2 focus:ring-[#0a1628]/10" />
            </div>
          </div>

          <button onClick={register} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#ffbe24] to-[#ffbe24] text-[#0a1628] font-bold text-sm py-3.5 rounded-full hover:shadow-lg transition-all disabled:opacity-60 mb-3">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create My Training Account <ArrowRight className="w-4 h-4" /></>}
          </button>
          <p className="text-xs text-center text-slate-400">
            Already have a TaxCompPro account with this email? <Link href={`/login?next=/training/accept/${token}`} className="text-[#ffbe24] font-bold hover:underline">Log in instead</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
