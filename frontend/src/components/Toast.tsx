"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";

type Tone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tone: Tone;
  text: string;
}

interface ToastContextValue {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const STYLE: Record<Tone, { box: string; icon: "check" | "alert" }> = {
  success: { box: "border-emerald-200 bg-white text-slate-800 [&_svg]:text-emerald-600", icon: "check" },
  error: { box: "border-red-200 bg-white text-slate-800 [&_svg]:text-red-600", icon: "alert" },
  info: { box: "border-blue-200 bg-white text-slate-800 [&_svg]:text-blue-600", icon: "check" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: Tone, text: string) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-3), { id, tone, text }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 4000);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (t) => push("success", t),
      error: (t) => push("error", t),
      info: (t) => push("info", t),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:items-end"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg shadow-slate-900/10 ${STYLE[t.tone].box}`}
          >
            <Icon name={STYLE[t.tone].icon} className="mt-0.5 h-[18px] w-[18px] shrink-0" strokeWidth={2.2} />
            <span className="flex-1 leading-relaxed">{t.text}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Tutup notifikasi"
              className="text-slate-400 hover:text-slate-700"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam ToastProvider");
  return ctx;
}
