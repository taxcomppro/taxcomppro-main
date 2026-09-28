"use client";
import { safeAuthReturn, accountUrl } from "@/lib/auth-navigation";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, Suspense } from "react";
import { requestPasswordReset } from "@/lib/auth-client";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/schemas";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import Image from "next/image";

function ForgotPasswordForm() {
  const params = useSearchParams();
  const nextPath = safeAuthReturn(params.get("next"));
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    setServerError("");
    try {
      const res = await requestPasswordReset({
        email: data.email,
        redirectTo: accountUrl("/reset-password", nextPath),
      });

      if (res?.error) {
        setServerError(res.error.message || "Failed to send reset link. Please try again.");
      } else {
        setSubmittedEmail(data.email);
        startCooldown();
      }
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (!submittedEmail || resendCooldown > 0) return;
    await onSubmit({ email: submittedEmail });
  };

  if (submittedEmail) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center animate-fade-in-up">
        <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>

        <h1 className="text-2xl font-black text-[#0a1628] mb-2">Check your email</h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          We&apos;ve sent a password reset link to:
          <br />
          <span className="font-bold text-[#0a1628] break-all">{submittedEmail}</span>
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 text-left mb-6 space-y-2">
          <div className="flex items-start gap-2">
            <span className="font-bold text-[#0a1628]">•</span>
            <span>The link will expire in <strong>60 minutes</strong> for your security.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-[#0a1628]">•</span>
            <span>If you don&apos;t see the email, check your spam or junk folder.</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || loading}
            className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-700 font-semibold text-sm py-3 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : "Resend email"}
          </button>

          <Link
            href={accountUrl("/login", nextPath)}
            className="w-full flex items-center justify-center gap-2 bg-[#0a1628] text-white font-bold text-sm py-3.5 rounded-full hover:bg-[#1a3a6b] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
      <h1 className="text-2xl font-black text-[#0a1628] mb-1">Forgot password?</h1>
      <p className="text-slate-500 text-sm mb-6 leading-relaxed">
        No worries. Enter your registered email address and we&apos;ll send you a link to reset your password.
      </p>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-[#0a1628] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className={`w-full font-[inherit] text-sm pl-10 pr-4 py-3 border rounded-xl outline-none transition-all ${
                errors.email
                  ? "border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-slate-200 focus:border-[#0a1628] focus:ring-2 focus:ring-[#0a1628]/8"
              }`}
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#ffbe24] to-[#ffbe24] text-[#0a1628] font-bold text-sm py-3.5 rounded-full hover:shadow-[0_0_20px_rgba(255, 190, 36,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            "Sending reset link…"
          ) : (
            <>
              <span>Send Reset Link</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center mt-6 pt-6 border-t border-slate-100">
        <Link
          href={accountUrl("/login", nextPath)}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#0a1628] font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-[var(--font-urbanist,Urbanist),sans-serif] px-4 py-12">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image
              src="/Tonique_blanchard_upscale_upscaled (1).png"
              alt="Tax Compliance Pro"
              width={220}
              height={65}
              className="object-contain dark:hidden"
              style={{ width: "220px", height: "auto", maxHeight: "65px" }}
              loading="eager"
            />
            <Image
              src="/logo_dark 1.webp"
              alt="Tax Compliance Pro"
              width={220}
              height={65}
              className="object-contain hidden dark:block"
              style={{ width: "220px", height: "auto", maxHeight: "65px" }}
              loading="eager"
            />
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 flex items-center justify-center min-h-[300px]">
              <div className="w-8 h-8 border-2 border-[#ffbe24] border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
