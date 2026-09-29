"use client";

import { useState } from "react";
import { Volume2, VolumeX, Loader2, Sparkles, PhoneCall } from "lucide-react";

interface AudioRecoveryBannerProps {
  onTapToResume: () => void;
  isResuming?: boolean;
}

export default function AudioRecoveryBanner({
  onTapToResume,
  isResuming = false,
}: AudioRecoveryBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sr-audio-recovery-banner fixed top-20 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md animate-fade-in-down"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#07192f]/95 via-[#08223d]/95 to-[#051426]/95 border border-emerald-500/50 p-4 shadow-2xl shadow-emerald-500/20 backdrop-blur-xl">
        {/* Glowing aura effect */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-lime-400/20 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-start gap-3.5 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center shrink-0 text-[#04111f] shadow-md shadow-emerald-500/30 animate-pulse">
            <Volume2 className="w-5 h-5 stroke-[2.5]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-lime-400 animate-ping" />
              <h3 className="text-white font-black text-xs uppercase tracking-wider">
                Audio Interrupted
              </h3>
            </div>
            <p className="text-slate-300 text-xs leading-snug mb-3">
              A phone call or app switch paused stage sound. Tap anywhere on your screen or press the button to restore live audio.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onTapToResume}
                disabled={isResuming}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-lime-400 via-emerald-500 to-teal-500 text-[#04111f] font-black text-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
              >
                {isResuming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#04111f]" />
                    <span>Reconnecting Audio…</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-[#04111f]" />
                    <span>Resume Stage Audio</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                title="Dismiss"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
