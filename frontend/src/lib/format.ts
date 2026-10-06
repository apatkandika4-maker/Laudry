import type { OrderStatus, PaymentMethod, PaymentStatus, Unit } from "./types";

/** Ubah nilai API (string desimal) jadi angka aman. */
export function toNumber(value: string | number | null | undefined): number {
  const n = typeof value === "number" ? value : parseFloat(value ?? "0");
  return Number.isFinite(n) ? n : 0;
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatRupiah(value: string | number | null | undefined): string {
  return rupiah.format(Math.round(toNumber(value)));
}

export function formatNumber(value: string | number | null | undefined, maxFraction = 2): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: maxFraction }).format(toNumber(value));
}

export function formatQty(quantity: string | number, unit: Unit): string {
  return `${formatNumber(quantity)} ${unit}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Tanggal "YYYY-MM-DD" dibaca sebagai tanggal lokal (bukan UTC). */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** dd/mm/yyyy */
export function formatDate(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  if (!d) return "-";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** dd/mm/yyyy HH:mm */
export function formatDateTime(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  if (!d) return "-";
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDayName(value: string | Date): string {
  const d = parseDate(value);
  return d ? d.toLocaleDateString("id-ID", { weekday: "long" }) : "";
}

/** Date → "YYYY-MM-DD" (lokal) untuk input type=date & API. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Selisih hari kalender (dari tanggal input ke tanggal selesai). */
export function daysBetween(
  from: string | Date | null | undefined,
  to: string | Date | null | undefined
): number | null {
  const a = parseDate(from);
  const b = parseDate(to);
  if (!a || !b) return null;
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** "2 hari" / "Hari ini" berdasarkan tanggal pesanan dibuat & estimasi selesai. */
export function estimateLabel(createdAt: string | null | undefined, dueDate: string | null | undefined): string {
  const n = daysBetween(createdAt, dueDate);
  if (n === null) return "-";
  return n <= 0 ? "Hari ini" : `${n} hari`;
}

export function isOverdue(dueDate: string | null, status: OrderStatus): boolean {
  if (!dueDate || status === "diambil") return false;
  const due = parseDate(dueDate);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export const STATUS_FLOW: OrderStatus[] = ["diterima", "dicuci", "siap_diambil", "diambil"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  diterima: "Diterima",
  dicuci: "Dicuci",
  siap_diambil: "Siap Diambil",
  diambil: "Diambil",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  belum_bayar: "Belum Bayar",
  dp: "DP",
  lunas: "Lunas",
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  tunai: "Tunai",
  transfer: "Transfer",
  qris: "QRIS",
};

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = STATUS_FLOW.indexOf(status);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}

/** 0812-xxx → 62812xxx untuk wa.me */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return digits;
}

export function waLink(phone: string | null | undefined, text: string): string {
  const number = normalizePhone(phone);
  const query = `text=${encodeURIComponent(text)}`;
  return number ? `https://wa.me/${number}?${query}` : `https://wa.me/?${query}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
