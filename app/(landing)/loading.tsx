export default function LoadingPage() {
  return <div className="mx-auto w-full max-w-6xl px-6 py-12" role="status" aria-label="Loading page"><div className="motion-safe:animate-pulse space-y-5" aria-hidden="true"><div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-800"/><div className="h-4 w-72 max-w-full rounded bg-slate-200 dark:bg-slate-800"/><div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800/60"/></div><span className="sr-only">Loading page…</span></div>;
}
