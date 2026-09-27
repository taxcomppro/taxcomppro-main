"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { CERTIFICATE_DISCLAIMER } from "@/lib/training";

interface Result {
  valid: boolean; certificateNumber?: string; preparerName?: string; officeName?: string | null;
  trainingTitle?: string; versionLabel?: string; issuedAt?: string; score?: number;
}

export default function VerifyCertificatePage() {
  const { number } = useParams<{ number: string }>();
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch(`/api/verify-certificate/${number}`).then(r => r.json()).then(setResult);
  }, [number]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/"><Image src="/logo.webp" alt="Tax Compliance Pro" width={200} height={60} className="object-contain" style={{ width: "200px", height: "auto", maxHeight: "60px" }} loading="eager" /></Link>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center">
          {result === null ? (
            <Loader2 className="w-8 h-8 animate-spin text-[#0a1628] mx-auto" />
          ) : result.valid ? (
            <>
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="font-black text-[#0a1628] text-lg mb-1">Certificate Verified</p>
              <p className="text-xs text-slate-400 mb-5">{result.certificateNumber}</p>
              <div className="bg-slate-50 rounded-xl p-4 text-left text-sm space-y-2 mb-5">
                <div><span className="text-slate-400 text-xs">Preparer:</span> <span className="font-bold text-[#0a1628]">{result.preparerName}</span></div>
                {result.officeName && <div><span className="text-slate-400 text-xs">Office:</span> <span className="font-bold text-[#0a1628]">{result.officeName}</span></div>}
                <div><span className="text-slate-400 text-xs">Training:</span> <span className="font-bold text-[#0a1628]">{result.trainingTitle}</span></div>
                <div><span className="text-slate-400 text-xs">Version:</span> <span className="font-bold text-[#0a1628]">{result.versionLabel}</span></div>
                <div><span className="text-slate-400 text-xs">Issued:</span> <span className="font-bold text-[#0a1628]">{result.issuedAt && new Date(result.issuedAt).toLocaleDateString()}</span></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">{CERTIFICATE_DISCLAIMER}</p>
            </>
          ) : (
            <>
              <ShieldX className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="font-black text-[#0a1628] text-lg mb-1">Certificate Not Found</p>
              <p className="text-sm text-slate-500">This certificate number could not be verified.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
