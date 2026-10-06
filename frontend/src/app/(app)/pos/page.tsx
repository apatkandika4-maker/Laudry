"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiRequest, errorMessage } from "@/lib/api";
import { useSettings } from "@/lib/settings-context";
import {
  addDays,
  formatDate,
  formatDayName,
  formatNumber,
  formatRupiah,
  toISODate,
  toNumber,
} from "@/lib/format";
import type { Customer, Order, PaymentInput, Report, Service } from "@/lib/types";
import { Button, EmptyState, Field, IconButton, LoadingBlock, MoneyInput, SearchInput, inputClass } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/Toast";
import CustomerPicker from "@/components/CustomerPicker";
import PaymentModal from "@/components/PaymentModal";
import { ReceiptModal } from "@/components/Receipt";

type CartLine = { service: Service; qty: string };
type UnitFilter = "all" | "kg" | "pcs";

/** Pilihan estimasi selesai di kasir: 1 sampai 7 hari. */
const MAX_DAYS = 7;
const DAY_OPTIONS = Array.from({ length: MAX_DAYS }, (_, i) => i + 1);

function parseQty(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function stepOf(service: Service) {
  return service.unit === "kg" ? 0.5 : 1;
}

export default function PosPage() {
  const toast = useToast();
  const { settings } = useSettings();
  const searchRef = useRef<HTMLDivElement>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState<UnitFilter>("all");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [days, setDays] = useState<number | null>(null); // null = otomatis dari layanan

  const [payOpen, setPayOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);
  const [cartOpen, setCartOpen] = useState(false); // mobile
  const [today, setToday] = useState<Report | null>(null);

  const loadToday = useCallback(async () => {
    try {
      setToday(await apiRequest<Report>("/reports/summary"));
    } catch {
      // ringkasan opsional
    }
  }, []);

  useEffect(() => {
    apiRequest<Service[]>("/services?active_only=1")
      .then(setServices)
      .catch((err) => toast.error(errorMessage(err, "Gagal memuat layanan.")))
      .finally(() => setLoading(false));
    loadToday();
  }, [toast, loadToday]);

  // "/" untuk langsung mencari layanan
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.querySelector("input")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter(
      (s) => (unit === "all" || s.unit === unit) && (!q || s.name.toLowerCase().includes(q))
    );
  }, [services, query, unit]);

  const subtotal = cart.reduce((sum, l) => sum + toNumber(l.service.price) * parseQty(l.qty), 0);
  const discountValue = Math.min(Number(discount || 0), subtotal);
  const total = Math.max(subtotal - discountValue, 0);
  const itemCount = cart.length;
  // Estimasi 1–7 hari. Otomatis ikut layanan dengan estimasi terlama, bisa diganti manual.
  const autoDays = cart.length
    ? Math.min(MAX_DAYS, Math.max(1, ...cart.map((l) => l.service.estimated_days)))
    : 2;
  const effectiveDays = days ?? autoDays;
  // Dihitung dari tanggal transaksi diinput (hari ini).
  const effectiveDue = toISODate(addDays(new Date(), effectiveDays));

  function addService(service: Service) {
    setCart((lines) => {
      const found = lines.find((l) => l.service.id === service.id);
      if (found) {
        return lines.map((l) =>
          l.service.id === service.id
            ? { ...l, qty: String(+(parseQty(l.qty) + stepOf(service)).toFixed(2)) }
            : l
        );
      }
      return [...lines, { service, qty: "1" }];
    });
  }

  function changeQty(id: number, value: string) {
    setCart((lines) => lines.map((l) => (l.service.id === id ? { ...l, qty: value } : l)));
  }

  function bump(line: CartLine, dir: 1 | -1) {
    const next = +(parseQty(line.qty) + dir * stepOf(line.service)).toFixed(2);
    if (next <= 0) return removeLine(line.service.id);
    changeQty(line.service.id, String(next));
  }

  function removeLine(id: number) {
    setCart((lines) => lines.filter((l) => l.service.id !== id));
  }

  function resetTransaction() {
    setCart([]);
    setCustomer(null);
    setDiscount("");
    setNote("");
    setDays(null);
  }

  function startCheckout() {
    if (!customer) return toast.error("Pilih atau tambahkan pelanggan terlebih dahulu.");
    if (cart.length === 0) return toast.error("Keranjang masih kosong.");
    for (const l of cart) {
      const q = parseQty(l.qty);
      if (q <= 0) return toast.error(`Jumlah ${l.service.name} belum diisi.`);
      if (l.service.unit === "pcs" && !Number.isInteger(q))
        return toast.error(`Jumlah ${l.service.name} harus bilangan bulat (pcs).`);
    }
    if (Number(discount || 0) > subtotal) return toast.error("Diskon melebihi subtotal.");
    setCartOpen(false);
    setPayOpen(true);
  }

  async function submitOrder(payment: PaymentInput | null) {
    if (!customer) return;
    setSubmitting(true);
    try {
      const order = await apiRequest<Order>("/orders", {
        method: "POST",
        body: {
          customer_id: customer.id,
          items: cart.map((l) => ({ service_id: l.service.id, quantity: parseQty(l.qty) })),
          discount: discountValue,
          note: note.trim() || null,
          due_date: effectiveDue,
          payment,
        },
      });
      setPayOpen(false);
      resetTransaction();
      setReceipt(order);
      toast.success(`Transaksi ${order.invoice_code} tersimpan.`);
      loadToday();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menyimpan transaksi."));
    } finally {
      setSubmitting(false);
    }
  }

  const cartPanel = (
    <CartPanel
      cart={cart}
      customer={customer}
      onCustomer={setCustomer}
      onQty={changeQty}
      onBump={bump}
      onRemove={removeLine}
      onClear={resetTransaction}
      subtotal={subtotal}
      discount={discount}
      onDiscount={setDiscount}
      total={total}
      note={note}
      onNote={setNote}
      days={effectiveDays}
      autoDays={days === null}
      dueDate={effectiveDue}
      onDays={setDays}
      onCheckout={startCheckout}
    />
  );

  return (
    <div className="pb-24 lg:pb-0">
      {/* Kepala halaman */}
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">
            {formatDayName(new Date())}, {formatDate(new Date())}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Kasir</h1>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <MiniStat label="Pendapatan hari ini" value={today ? formatRupiah(today.revenue) : "—"} tone="blue" />
          <MiniStat label="Transaksi hari ini" value={today ? String(today.orders_count) : "—"} />
          <Link href="/orders?status=siap_diambil" className="block">
            <MiniStat
              label="Siap diambil"
              value={today ? String(today.queue.siap_diambil) : "—"}
              tone="amber"
              interactive
            />
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Daftar layanan */}
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div ref={searchRef} className="flex-1">
              <SearchInput value={query} onChange={setQuery} placeholder="Cari layanan...  (tekan / )" />
            </div>
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {(
                [
                  ["all", "Semua"],
                  ["kg", "Kiloan"],
                  ["pcs", "Satuan"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setUnit(v)}
                  className={`flex-1 rounded-lg px-4 py-1.5 text-sm font-medium transition sm:flex-none ${
                    unit === v ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingBlock label="Memuat layanan..." />
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
              <EmptyState
                icon="services"
                title={services.length ? "Layanan tidak ditemukan" : "Belum ada layanan aktif"}
                description={services.length ? "Coba kata kunci lain." : "Tambahkan layanan dulu supaya bisa dipilih di kasir."}
                action={
                  !services.length && (
                    <Link href="/services">
                      <Button icon="plus">Tambah Layanan</Button>
                    </Link>
                  )
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((s) => {
                const line = cart.find((l) => l.service.id === s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => addService(s)}
                    className={`group relative flex flex-col rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
                      line ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          s.unit === "kg" ? "bg-sky-50 text-sky-600" : "bg-violet-50 text-violet-600"
                        }`}
                      >
                        <Icon name={s.unit === "kg" ? "washer" : "services"} className="h-5 w-5" />
                      </span>
                      {line ? (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                          {formatNumber(parseQty(line.qty))} {s.unit}
                        </span>
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 opacity-0 transition group-hover:opacity-100">
                          <Icon name="plus" className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{s.name}</p>
                    <p className="mt-auto pt-2 text-[15px] font-bold text-slate-900">
                      {formatRupiah(s.price)}
                      <span className="text-xs font-medium text-slate-500"> /{s.unit}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.estimated_days === 0 ? "Selesai hari ini" : `Estimasi ${s.estimated_days} hari`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Keranjang (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-8">{cartPanel}</div>
        </aside>
      </div>

      {/* Bar bawah (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="flex w-full items-center justify-between rounded-xl bg-blue-600 px-4 py-3 text-white shadow-lg shadow-blue-600/30"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="cart" className="h-5 w-5" />
            {itemCount ? `${itemCount} layanan` : "Keranjang kosong"}
          </span>
          <span className="text-base font-bold">{formatRupiah(total)}</span>
        </button>
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-slate-900/40" onClick={() => setCartOpen(false)} />
          <div className="animate-pop-in absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-slate-50 p-3">
            <div className="mb-2 flex justify-end">
              <IconButton icon="close" label="Tutup keranjang" onClick={() => setCartOpen(false)} />
            </div>
            {cartPanel}
          </div>
        </div>
      )}

      <PaymentModal
        open={payOpen}
        mode="checkout"
        amountDue={total}
        submitting={submitting}
        onClose={() => setPayOpen(false)}
        onSubmit={submitOrder}
      />

      <ReceiptModal
        order={receipt}
        settings={settings}
        title="Transaksi Berhasil"
        onClose={() => setReceipt(null)}
        extraAction={
          <Button icon="plus" onClick={() => setReceipt(null)}>
            Transaksi Baru
          </Button>
        }
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "slate",
  interactive,
}: {
  label: string;
  value: string;
  tone?: "slate" | "blue" | "amber";
  interactive?: boolean;
}) {
  const color = { slate: "text-slate-900", blue: "text-blue-700", amber: "text-amber-600" }[tone];
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-4 ${interactive ? "transition hover:border-amber-300" : ""}`}
    >
      <p className="truncate text-[11px] font-medium text-slate-500 sm:text-xs">{label}</p>
      <p className={`mt-0.5 truncate text-base font-bold sm:text-lg ${color}`}>{value}</p>
    </div>
  );
}

function CartPanel(props: {
  cart: CartLine[];
  customer: Customer | null;
  onCustomer: (c: Customer | null) => void;
  onQty: (id: number, v: string) => void;
  onBump: (line: CartLine, dir: 1 | -1) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  subtotal: number;
  discount: number | "";
  onDiscount: (v: number | "") => void;
  total: number;
  note: string;
  onNote: (v: string) => void;
  days: number;
  autoDays: boolean;
  dueDate: string;
  onDays: (v: number | null) => void;
  onCheckout: () => void;
}) {
  const { cart } = props;
  const [showExtra, setShowExtra] = useState(false);
  const hasExtra = Number(props.discount || 0) > 0 || props.note.trim() !== "";

  return (
    <div className="flex max-h-[calc(100vh-4rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pelanggan</p>
        <CustomerPicker value={props.customer} onChange={props.onCustomer} />
      </div>

      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Pesanan {cart.length > 0 && <span className="text-slate-400">({cart.length})</span>}
        </p>
        {cart.length > 0 && (
          <button type="button" onClick={props.onClear} className="text-xs font-medium text-slate-400 hover:text-red-600">
            Kosongkan
          </button>
        )}
      </div>

      <div className="scroll-thin min-h-24 flex-1 overflow-y-auto px-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Icon name="cart" className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-700">Keranjang kosong</p>
            <p className="text-xs text-slate-500">Klik layanan di samping untuk menambahkan.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cart.map((line) => {
              const qty = parseQty(line.qty);
              return (
                <li key={line.service.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{line.service.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatRupiah(line.service.price)} / {line.service.unit}
                      </p>
                    </div>
                    <IconButton icon="trash" label={`Hapus ${line.service.name}`} tone="danger" onClick={() => props.onRemove(line.service.id)} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => props.onBump(line, -1)}
                        aria-label="Kurangi"
                        className="flex h-9 w-9 items-center justify-center rounded-l-xl text-slate-600 hover:bg-slate-100"
                      >
                        <Icon name="minus" className="h-4 w-4" />
                      </button>
                      <input
                        value={line.qty}
                        inputMode="decimal"
                        aria-label={`Jumlah ${line.service.name}`}
                        onChange={(e) => props.onQty(line.service.id, e.target.value.replace(/[^\d.,]/g, ""))}
                        className="h-9 w-14 bg-white text-center text-sm font-semibold text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => props.onBump(line, 1)}
                        aria-label="Tambah"
                        className="flex h-9 w-9 items-center justify-center rounded-r-xl text-slate-600 hover:bg-slate-100"
                      >
                        <Icon name="plus" className="h-4 w-4" />
                      </button>
                      <span className="pr-3 text-xs font-medium text-slate-500">{line.service.unit}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {formatRupiah(toNumber(line.service.price) * qty)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-slate-100 p-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Estimasi selesai</p>
            {!props.autoDays && (
              <button
                type="button"
                onClick={() => props.onDays(null)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800"
              >
                Otomatis
              </button>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="Estimasi selesai">
            {DAY_OPTIONS.map((d) => {
              const active = props.days === d;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => props.onDays(d)}
                  className={`rounded-lg border py-1.5 text-center transition ${
                    active
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                  }`}
                >
                  <span className="block text-sm font-bold leading-tight">{d}</span>
                  <span className={`block text-[10px] leading-tight ${active ? "text-blue-100" : "text-slate-400"}`}>
                    hari
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name="calendar" className="h-3.5 w-3.5" />
            Selesai{" "}
            <span className="font-semibold text-slate-800">
              {formatDayName(props.dueDate)}, {formatDate(props.dueDate)}
            </span>
            {props.autoDays && <span className="text-slate-400">· otomatis</span>}
          </p>
        </div>

        {showExtra || hasExtra ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Diskon">
              <MoneyInput value={props.discount} onChange={props.onDiscount} placeholder="0" />
            </Field>
            <Field label="Catatan">
              <input
                value={props.note}
                onChange={(e) => props.onNote(e.target.value)}
                maxLength={500}
                placeholder="Mis. pisah putih"
                className={inputClass}
              />
            </Field>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowExtra(true)}
            className="text-xs font-semibold text-blue-700 hover:text-blue-800"
          >
            + Tambah diskon / catatan
          </button>
        )}

        <div className="space-y-1.5 rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatRupiah(props.subtotal)}</span>
          </div>
          {Number(props.discount || 0) > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Diskon</span>
              <span>-{formatRupiah(Math.min(Number(props.discount), props.subtotal))}</span>
            </div>
          )}
          <div className="flex items-end justify-between border-t border-slate-200 pt-2">
            <span className="font-semibold text-slate-900">Total</span>
            <span className="text-2xl font-bold tracking-tight text-slate-900">{formatRupiah(props.total)}</span>
          </div>
        </div>

        <Button size="lg" icon="cash" className="w-full" disabled={cart.length === 0} onClick={props.onCheckout}>
          Bayar
        </Button>
      </div>
    </div>
  );
}
