import Link from "next/link";
import Image from "next/image";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";

/**
 * Split layout shared by every auth screen: brand panel on the left, form on the right.
 * Below `lg` the panel is dropped and the form gets the whole viewport with the logo on top,
 * so small screens never scroll past marketing to reach the fields.
 */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] bg-[#f8fafc] font-[var(--font-urbanist,Urbanist),sans-serif] dark:bg-[#0a1220]">
      <AuthBrandPanel />

      <main className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-12 sm:px-8">
        <div className="w-full max-w-[440px]">
          <div className="mb-9 flex justify-center lg:hidden">
            <Link href="/">
              <Image
                src="/Tonique_blanchard_upscale_upscaled (1).png"
                alt="Tax Compliance Pro"
                width={220}
                height={65}
                className="object-contain dark:hidden"
                style={{ width: "220px", height: "auto", maxHeight: "65px" }}
                priority
              />
              <Image
                src="/logo_dark 1.webp"
                alt="Tax Compliance Pro"
                width={220}
                height={65}
                className="hidden object-contain dark:block"
                style={{ width: "220px", height: "auto", maxHeight: "65px" }}
                priority
              />
            </Link>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * Progress rail for the 3-step registration flow.
 * Uses width, not colour alone, so the current position survives greyscale and low vision.
 */
export function StepRail({ current, total = 3 }: { current: number; total?: number }) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-1.5" role="presentation">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < current ? "bg-[#ffbe24]" : "bg-slate-200 dark:bg-white/12"
            }`}
          />
        ))}
      </div>
      <p className="mt-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
        Step {current} of {total}
      </p>
    </div>
  );
}
