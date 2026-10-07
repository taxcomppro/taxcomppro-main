"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VERSION = 1;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function useCreationDraft<T extends Record<string, unknown>>(
  kind: string,
  userId: string | undefined,
  snapshot: T,
  restore: (value: T) => void,
) {
  const key = userId ? `tcp:creation:${VERSION}:${kind}:${userId}` : null;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const restoreRef = useRef(restore);
  const cleared = useRef(false);
  useEffect(() => { restoreRef.current = restore; }, [restore]);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    cleared.current = false;
    // Restore after mount so browser storage cannot cause a hydration mismatch.
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.version === VERSION && saved.savedAt > Date.now() - MAX_AGE && saved.data && typeof saved.data === "object" && !Array.isArray(saved.data)) {
            restoreRef.current(saved.data as T);
            setMessage("Your draft has been restored. Pick up where you left off.");
          } else localStorage.removeItem(key);
        }
      } catch {
        setMessage("Draft storage is unavailable. Keep this page open until you are ready to publish.");
      }
      setLoadedKey(key);
    });
    return () => { cancelled = true; };
  }, [key]);

  const save = useCallback((manual = true) => {
    if (!key || loadedKey !== key || cleared.current) return false;
    try {
      localStorage.setItem(key, JSON.stringify({ version: VERSION, savedAt: Date.now(), data: snapshot }));
      if (manual) setMessage("Draft saved on this browser for 7 days. Nothing has been published.");
      return true;
    } catch {
      setMessage("We couldn't save your draft. Keep this page open and try again before leaving for Stripe.");
      return false;
    }
  }, [key, loadedKey, snapshot]);

  useEffect(() => {
    if (loadedKey !== key || !key || cleared.current) return;
    const timeout = window.setTimeout(() => save(false), 400);
    return () => window.clearTimeout(timeout);
  }, [key, loadedKey, save]);

  const clear = useCallback(() => {
    cleared.current = true;
    if (key) {
      try { localStorage.removeItem(key); } catch { /* Publication already succeeded. */ }
    }
  }, [key]);

  const startNew = useCallback(() => { cleared.current = false; setMessage(""); }, []);

  return { startNew, ready: !!key && loadedKey === key, save, clear, message };
}
