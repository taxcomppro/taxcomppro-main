import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { ReduxProvider } from "@/store/provider";
import AtlasWidgetLoader from "@/components/AtlasWidgetLoader";
import GhlChatWidget from "@/components/GhlChatWidget";
import { ThemeProvider } from "@/components/ThemeProvider";
import SitePreferences from "@/components/SitePreferences";
import PhoneRequirementGate from "@/components/auth/PhoneRequirementGate";


const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  display: "swap",
});


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};


export const metadata: Metadata = {
  metadataBase: new URL("https://taxcomppro.com"),
  title: "Tax Compliance Pro | Connect & Grow",
  description:
    "The premier community for tax professionals, CPA, and EA practitioners.",
  icons: {
    icon: "/fevicon.webp",
  },
  openGraph: {
    title: "Tax Compliance Pro | Connect & Grow",
    description:
      "The premier community for tax professionals, CPA, and EA practitioners.",
    images: [{ url: "/fevicon.webp", width: 512, height: 512 }],
    type: "website",
  },
};


export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${urbanist.variable} dark:bg-[#0f172a]`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="bg-white dark:bg-[#0f172a] dark:text-slate-100" suppressHydrationWarning>
        <ThemeProvider>
          <ReduxProvider>
            <PhoneRequirementGate>
            <Suspense>
              {children}
            </Suspense>
            <AtlasWidgetLoader />
            <GhlChatWidget />
            <SitePreferences />
            </PhoneRequirementGate>
          </ReduxProvider>
        </ThemeProvider>
      </body>
      <Script id="dub-analytics" strategy="afterInteractive">
        {`!(function(c,n){c[n]=c[n]||function(){(c[n].q=c[n].q||[]).push(arguments)};["trackClick","trackLead","trackSale"].forEach(function(t){c[n][t]=function(){var a=[].slice.call(arguments);a.unshift(t);c[n].apply(null,a)}});var s=document.createElement("script");s.defer=1;s.src="https://www.dubcdn.com/analytics/script.conversion-tracking.js";s.setAttribute("data-publishable-key","dub_pk_rNs7JBAEnzbsnCcp7Z4JV1LY");s.setAttribute("data-domain",".taxcomppro.com");document.head.appendChild(s)})(window,"dubAnalytics");`}
      </Script>
      <Script
        id="dub-referral-tracking"
        src="https://www.dubcdn.com/analytics/script.js"
        data-domains='{"refer":"taxcomppro.com"}'
        data-domain=".taxcomppro.com"
        strategy="afterInteractive"
      />
    </html>
  );
}
