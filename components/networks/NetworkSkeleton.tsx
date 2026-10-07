"use client";

import React from "react";

export function NetworkPostSkeleton() {
  return (
    <div className="pn-v2-card mb-4 space-y-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <span className="np-shimmer w-11 h-11 rounded-full shrink-0" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <span className="np-shimmer h-4 w-36 rounded-md" />
          <span className="np-shimmer h-3 w-24 rounded-md opacity-60" />
        </div>
        <span className="np-shimmer h-5 w-20 rounded-full shrink-0 opacity-50" />
      </div>
      <div className="space-y-2 pt-1">
        <span className="np-shimmer h-4 w-3/4 rounded-md" />
        <span className="np-shimmer h-3.5 w-full rounded-md opacity-80" />
        <span className="np-shimmer h-3.5 w-4/5 rounded-md opacity-70" />
      </div>
      <div className="np-shimmer h-40 w-full rounded-xl opacity-90" />
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <span className="np-shimmer h-3 w-24 rounded-md opacity-60" />
        <span className="np-shimmer h-8 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export default function NetworkSkeleton() {
  return (
    <div
      className="pn-v2-shell"
      role="status"
      aria-label="Loading Pro Network"
      aria-busy="true"
    >
      <span className="sr-only">Loading your network…</span>

      {/* ── LEFT DARK SIDEBAR SKELETON ── */}
      <aside className="pn-v2-sidebar" aria-hidden="true">
        <div>


          {/* User Profile Card placeholder */}
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 border border-white/10 mb-6">
            <span className="np-shimmer w-12 h-12 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <span className="np-shimmer h-3.5 w-28 rounded-md" />
              <span className="np-shimmer h-2.5 w-20 rounded-md opacity-60" />
            </div>
          </div>

          {/* Nav Items */}
          <div className="space-y-1.5">
            <span className="np-shimmer h-3 w-20 rounded-md mb-3 ml-2 opacity-50" />
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02]"
              >
                <span className="np-shimmer w-4 h-4 rounded-md shrink-0 opacity-70" />
                <span
                  className="np-shimmer h-3.5 rounded-md"
                  style={{ width: `${60 + (i % 3) * 20}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Support Box */}
        <div className="pt-4">
          <span className="np-shimmer h-12 w-full rounded-2xl" />
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA SKELETON ── */}
      <div className="pn-v2-main-content flex-1 flex flex-col min-w-0 min-h-screen" aria-hidden="true">
        {/* Header Bar */}
        <header className="pn-v2-skeleton-header relative min-h-[125px] sm:min-h-[145px] px-6 py-5 flex items-center justify-between gap-4 border-b border-white/10 overflow-hidden">
          <div className="flex items-center gap-3 z-10">
            <span className="np-shimmer h-8 w-24 rounded-xl" />
            <span className="np-shimmer w-14 h-14 rounded-2xl shrink-0 ring-2 ring-white/10" />
            <div className="space-y-2">
              <span className="np-shimmer h-5 w-48 rounded-lg" />
              <div className="flex items-center gap-2">
                <span className="np-shimmer h-3 w-28 rounded-md opacity-60" />
                <span className="np-shimmer h-3 w-20 rounded-md opacity-60" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 z-10">
            <span className="np-shimmer h-9 w-24 rounded-xl" />
            <span className="np-shimmer w-9 h-9 rounded-full" />
          </div>
        </header>

        {/* Subnav Tab Bar */}
        <nav className="pn-v2-subnav">
          <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-none">
            {Array.from({ length: 8 }, (_, i) => (
              <span
                key={i}
                className="np-shimmer h-7 rounded-lg shrink-0"
                style={{ width: `${70 + (i % 3) * 15}px` }}
              />
            ))}
          </div>
          <span className="np-shimmer h-8 w-56 rounded-lg hidden md:block shrink-0" />
        </nav>

        {/* Viewport Dashboard Content */}
        <div className="p-6 flex-1 max-w-[1600px] w-full mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Announcement card skeleton */}
              <div className="pn-v2-card space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="np-shimmer h-3.5 w-32 rounded-md" />
                  <span className="np-shimmer h-3 w-16 rounded-md opacity-60" />
                </div>
                <span className="np-shimmer h-4 w-3/4 rounded-md" />
                <span className="np-shimmer h-3 w-full rounded-md opacity-80" />
                <span className="np-shimmer h-3 w-5/6 rounded-md opacity-70" />
              </div>

              {/* Discussions Feed Card */}
              <div className="pn-v2-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="np-shimmer h-3.5 w-40 rounded-md" />
                  <span className="np-shimmer h-8 w-32 rounded-xl" />
                </div>
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 border-b border-white/5">
                    <span className="np-shimmer w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <span className="np-shimmer h-3.5 rounded-md" style={{ width: i % 2 ? "85%" : "65%" }} />
                      <span className="np-shimmer h-2.5 w-48 rounded-md" />
                    </div>
                  </div>
                ))}
                <span className="np-shimmer h-3 w-32 rounded-md mx-auto" />
              </div>
            </div>

            {/* Right Column (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Pro Talks Card skeleton */}
              <div className="pn-v2-card space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="np-shimmer h-3.5 w-36 rounded-md" />
                  <span className="np-shimmer h-3 w-16 rounded-md opacity-60" />
                </div>
                <div className="space-y-3 pt-1">
                  {Array.from({ length: 2 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02]">
                      <span className="np-shimmer w-10 h-10 rounded-xl shrink-0" />
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <span className="np-shimmer h-3.5 w-32 rounded-md" />
                        <span className="np-shimmer h-2.5 w-20 rounded-md opacity-60" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resources Card skeleton */}
              <div className="pn-v2-card space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="np-shimmer h-3.5 w-32 rounded-md" />
                  <span className="np-shimmer h-3 w-16 rounded-md opacity-60" />
                </div>
                <div className="space-y-2.5 pt-1">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02]">
                      <span className="np-shimmer w-8 h-8 rounded-lg shrink-0" />
                      <div className="space-y-1 flex-1 min-w-0">
                        <span className="np-shimmer h-3 w-28 rounded-md" />
                        <span className="np-shimmer h-2.5 w-16 rounded-md opacity-60" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Members Card skeleton */}
              <div className="pn-v2-card space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="np-shimmer h-3.5 w-36 rounded-md" />
                  <span className="np-shimmer h-3 w-16 rounded-md opacity-60" />
                </div>
                <div className="space-y-2 pt-1">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02]">
                      <span className="np-shimmer w-8 h-8 rounded-full shrink-0" />
                      <div className="space-y-1 flex-1 min-w-0">
                        <span className="np-shimmer h-3 w-24 rounded-md" />
                        <span className="np-shimmer h-2 w-16 rounded-md opacity-60" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
