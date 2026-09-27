"use client";
import { safeAuthReturn, accountUrl } from "@/lib/auth-navigation";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/auth-client";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/schemas";
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import Image from "next/image";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const nextPath = safeAuthReturn(searchParams.get("next"));

  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const passwordVal = watch("password", "");

  const onSubmit = async (data: ResetPasswordInput) => {
    if (!token) {
      setServerError("Reset token is missing or invalid. Please request a new link.");
      return;
    }

    setLoading(true);
    setServerError("");

    try {
      const res = await resetPassword({
        newPassword: data.password,
        token: token,
      });

      if (res?.error) {
        setServerError(res.error.message || "Failed to reset password. The link may have expired.");
      } else {
        setSuccess(true);
      }
    } catch {
      // Direct API fallback
      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newPassword: data.password,
            token: token,
          }),
        });

        if (response.ok) {
          setSuccess(true);
        } else {
          const errData = await response.json().catch(() => ({}));
          setServerError(
            errData.message || "Failed to reset password. The link may have expired or is invalid."
          );
        }
      } catch {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Missing token state
  if (!token) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center animate-fade-in-up">
        <div className="w-16 h-16 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
          <AlertCircle className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-black text-[#0a1628] mb-2">Invalid Reset Link</h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          The password reset token is missing or invalid. Please request a new password reset link.
        </p>
        <Link
          href={accountUrl("/forgot-password", nextPath)}
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#ffbe24] to-[#ffbe24] text-[#0a1628] font-bold text-sm py-3.5 rounded-full hover:shadow-[0_0_20px_rgba(255, 190, 36,0.4)] transition-all"
        >
          Request New Reset Link <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center animate-fade-in-up">
        <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black text-[#0a1628] mb-2">Password Reset Complete</h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Your password has been successfully updated. You can now sign in to your Tax Compliance Pro account with your new password.
        </p>
        <Link
          href={accountUrl("/login", nextPath)}
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#ffbe24] to-[#ffbe24] text-[#0a1628] font-bold text-sm py-3.5 rounded-full hover:shadow-[0_0_20px_rgba(255, 190, 36,0.4)] transition-all"
        >
          Sign In to Your Account <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
      <h1 className="text-2xl font-black text-[#0a1628] mb-1">Set New Password</h1>
      <p className="text-slate-500 text-sm mb-6 leading-relaxed">
        Choose a strong password with at least 8 characters for your account.
      </p>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* New Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-[#0a1628] mb-1.5">
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              className={`w-full font-[inherit] text-sm pl-10 pr-10 py-3 border rounded-xl outline-none transition-all ${
                errors.password
                  ? "border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-slate-200 focus:border-[#0a1628] focus:ring-2 focus:ring-[#0a1628]/8"
              }`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#0a1628] mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              className={`w-full font-[inherit] text-sm pl-10 pr-10 py-3 border rounded-xl outline-none transition-all ${
                errors.confirmPassword
                  ? "border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-slate-200 focus:border-[#0a1628] focus:ring-2 focus:ring-[#0a1628]/8"
              }`}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1.5">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Requirements helper */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 space-y-1">
          <div className={`flex items-center gap-1.5 ${passwordVal.length >= 8 ? "text-emerald-600 font-semibold" : ""}`}>
            <span>{passwordVal.length >= 8 ? "✓" : "•"}</span>
            <span>At least 8 characters</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#ffbe24] to-[#ffbe24] text-[#0a1628] font-bold text-sm py-3.5 rounded-full hover:shadow-[0_0_20px_rgba(255, 190, 36,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none mt-2"
        >
          {loading ? (
            "Updating password…"
          ) : (
            <>
              <span>Update Password</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center mt-6 pt-6 border-t border-slate-100">
        <Link
          href={accountUrl("/login", nextPath)}
          className="text-sm text-slate-600 hover:text-[#0a1628] font-semibold transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-[var(--font-urbanist,Urbanist),sans-serif] px-4 py-12">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image
              src="/logo.webp"
              alt="Tax Compliance Pro"
              width={220}
              height={65}
              className="object-contain dark:hidden"
              style={{ width: "220px", height: "auto", maxHeight: "65px" }}
              loading="eager"
            />
            <Image
              src="/logo_dark.webp"
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
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
