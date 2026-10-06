"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, inputClass } from "./ui";
import { Icon } from "./icons";

/** Urutan modal yang terbuka, supaya Esc hanya menutup modal paling atas. */
const openStack: string[] = [];

const SIZES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/** Dialog modal (dirender ke body). Tutup lewat Esc, tombol X, atau klik latar. */
export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof SIZES;
}) {
  const [mounted, setMounted] = useState(false);
  const id = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    openStack.push(id);
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openStack[openStack.length - 1] === id) closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const i = openStack.lastIndexOf(id);
      if (i >= 0) openStack.splice(i, 1);
      if (openStack.length === 0) document.body.style.overflow = "";
    };
  }, [open, id]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="animate-fade-in absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-pop-in relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl ${SIZES[size]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="-mr-2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Hapus",
  tone = "danger",
  loading,
  onConfirm,
  onClose,
  confirmDisabled = false,
  requireText,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  confirmDisabled?: boolean;
  /** Jika diisi, pengguna harus mengetik teks ini dulu (untuk aksi berisiko seperti hapus semua). */
  requireText?: string;
}) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);
  const blocked =
    confirmDisabled || (!!requireText && typed.trim().toUpperCase() !== requireText.toUpperCase());

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button variant={tone} loading={loading} disabled={blocked} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone === "danger" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}
        >
          <Icon name="alert" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 text-sm leading-relaxed text-slate-600">
          {message}
          {requireText && (
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">
                Ketik <b className="text-slate-900">{requireText}</b> untuk melanjutkan
              </span>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoFocus
                placeholder={requireText}
                className={inputClass}
              />
            </label>
          )}
        </div>
      </div>
    </Modal>
  );
}
