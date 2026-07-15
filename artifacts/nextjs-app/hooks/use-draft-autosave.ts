"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Auto-save draft helper — persists to localStorage and optional remote callback (NFR usability).
 */
export function useDraftAutosave<T>(opts: {
  key: string;
  value: T;
  enabled?: boolean;
  debounceMs?: number;
  onRemoteSave?: (value: T) => Promise<void> | void;
}) {
  const { key, value, enabled = true, debounceMs = 1200, onRemoteSave } = opts;
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const first = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        // Consumer hydrates separately via loadDraft()
      }
    } catch { /* */ }
  }, [key, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("saving");
    const t = setTimeout(async () => {
      try {
        localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
        if (onRemoteSave) await onRemoteSave(value);
        setSavedAt(new Date());
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, debounceMs);
    return () => clearTimeout(t);
  }, [value, key, enabled, debounceMs, onRemoteSave]);

  function loadDraft(): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { value: T };
      return parsed.value ?? null;
    } catch {
      return null;
    }
  }

  function clearDraft() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
    setStatus("idle");
  }

  return { status, savedAt, loadDraft, clearDraft };
}
