import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Users, MessagesSquare } from "lucide-react";

const POINTS = [
  {
    icon: ShieldCheck,
    title: "Audit protection built in",
    body: "Due diligence SOPs, checklists and the compliance vault, kept current with IRS guidance.",
  },
  {
    icon: Users,
    title: "A verified peer network",
    body: "Compare positions with CPAs, EAs and preparers who work the same returns you do.",
  },
  {
    icon: MessagesSquare,
    title: "Answers when it is busy",
    body: "ATLAS AI plus live Pro Talks, so a season question does not wait until Monday.",
  },
];

/**
 * The brand half of the split auth layout.
 * Hidden below `lg` so small screens get the form alone with no scrolling past marketing.
 */
export default function AuthBrandPanel() {
  return (
    <aside className="relative hidden lg:flex lg:w-[46%] xl:w-[42%] shrink-0 flex-col justify-between overflow-hidden bg-[#0a1628] p-12 xl:p-14">
      {/* Ambient depth. Matches the landing hero treatment. */}
      <div className="pointer-events-none absolute -top-40 -left-24 h-[420px] w-[420px] rounded-full bg-[#ffbe24]/12 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-[460px] w-[460px] rounded-full bg-[#1a3a6b]/50 blur-[130px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />

      <div className="relative z-10">
        <Link href="/" className="inline-block">
          <Image
            src="/logo_dark 1.webp"
            alt="Tax Compliance Pro"
            width={240}
            height={70}
            className="object-contain"
            style={{ width: "240px", height: "auto", maxHeight: "70px" }}
            priority
          />
        </Link>
      </div>

      <div className="relative z-10 max-w-[420px]">
        <h2 className="text-[34px] xl:text-[38px] font-black leading-[1.12] tracking-tight text-white">
          Built for the pros who
          <span className="text-[#ffbe24]"> sign the return.</span>
        </h2>

        <ul className="mt-10 space-y-7">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/8">
                <Icon className="h-[18px] w-[18px] text-[#ffbe24]" strokeWidth={2} />
              </span>
              <div>
                <div className="text-[15px] font-bold text-white">{title}</div>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Tax Compliance Pro
      </p>
    </aside>
  );
}
