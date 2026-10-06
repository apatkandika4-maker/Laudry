"use client";

import { forwardRef } from "react";
import { Icon, type IconName } from "./icons";
import { PAYMENT_LABEL, STATUS_LABEL } from "@/lib/format";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Tombol                                                              */
/* ------------------------------------------------------------------ */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "soft";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 active:bg-blue-800",
  secondary:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  success: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700",
  soft: "bg-blue-50 text-blue-700 hover:bg-blue-100",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-5 text-base",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    icon?: IconName;
    loading?: boolean;
  }
>(function Button(
  { variant = "primary", size = "md", icon, loading, className = "", children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <Spinner className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      ) : (
        icon && <Icon name={icon} className={size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]"} />
      )}
      {children}
    </button>
  );
});

export function IconButton({
  icon,
  label,
  className = "",
  tone = "default",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  tone?: "default" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
      : "text-slate-400 hover:bg-slate-100 hover:text-slate-700";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-40 ${color} ${className}`}
      {...rest}
    >
      <Icon name={icon} className="h-[18px] w-[18px]" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Form                                                                */
/* ------------------------------------------------------------------ */

export const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-500";

export function Field({
  label,
  required,
  error,
  hint,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  error?: string[] | string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {message ? (
        <span className="mt-1.5 block text-xs text-red-600">{message}</span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );
}

/** Input angka rupiah: tampil "12.000", nilai berupa angka. */
export function MoneyInput({
  value,
  onChange,
  className = "",
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: number | "";
  onChange: (v: number | "") => void;
}) {
  const display = value === "" ? "" : new Intl.NumberFormat("id-ID").format(value);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
        Rp
      </span>
      <input
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits === "" ? "" : Number(digits));
        }}
        className={`${inputClass} pl-9 ${className}`}
        {...rest}
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
    >
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
    />
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={`relative ${className}`}>
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
      />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} pl-10 ${value ? "pr-9" : ""}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Hapus pencarian"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tampilan                                                            */
/* ------------------------------------------------------------------ */

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon = "search",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <p className="mt-4 font-semibold text-slate-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label = "Memuat..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
      <Spinner className="h-5 w-5 text-blue-600" />
      {label}
    </div>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  diterima: "bg-slate-100 text-slate-700 ring-slate-200",
  dicuci: "bg-sky-50 text-sky-700 ring-sky-200",
  siap_diambil: "bg-amber-50 text-amber-700 ring-amber-200",
  diambil: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const STATUS_DOT: Record<OrderStatus, string> = {
  diterima: "bg-slate-400",
  dicuci: "bg-sky-500",
  siap_diambil: "bg-amber-500",
  diambil: "bg-emerald-500",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  belum_bayar: "bg-red-50 text-red-700 ring-red-200",
  dp: "bg-orange-50 text-orange-700 ring-orange-200",
  lunas: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${PAYMENT_STYLE[status]}`}
    >
      {PAYMENT_LABEL[status]}
    </span>
  );
}

export { STATUS_DOT };

/* ------------------------------------------------------------------ */
/* Tabel: aksi massal & halaman                                        */
/* ------------------------------------------------------------------ */

export function BulkBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-blue-900">
        <span className="font-semibold">{count}</span> data dipilih
        <button
          type="button"
          onClick={onClear}
          className="ml-3 text-xs font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
        >
          Batalkan pilihan
        </button>
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Pagination({
  page,
  lastPage,
  total,
  from,
  to,
  onChange,
}: {
  page: number;
  lastPage: number;
  total: number;
  from: number | null;
  to: number | null;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500 sm:flex-row">
      <span>
        Menampilkan <span className="font-medium text-slate-700">{from}</span>–
        <span className="font-medium text-slate-700">{to}</span> dari{" "}
        <span className="font-medium text-slate-700">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <IconButton
          icon="chevron-left"
          label="Halaman sebelumnya"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        />
        <span className="px-2 text-slate-700">
          {page} / {lastPage}
        </span>
        <IconButton
          icon="chevron-right"
          label="Halaman berikutnya"
          disabled={page >= lastPage}
          onClick={() => onChange(page + 1)}
        />
      </div>
    </div>
  );
}

export const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
export const td = "px-4 py-3.5 align-middle";
