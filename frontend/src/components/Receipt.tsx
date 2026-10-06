"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Modal from "./Modal";
import { Button } from "./ui";
import { Icon } from "./icons";
import {
  estimateLabel,
  formatDate,
  formatDateTime,
  formatDayName,
  formatNumber,
  formatRupiah,
  STATUS_LABEL,
  toNumber,
  waLink,
} from "@/lib/format";
import type { Order, Settings } from "@/lib/types";

/** "Senin, 05/10/2026" (short: "Sen, 05/10/2026" agar muat di kertas 58mm). */
function dueText(dueDate: string | null, short = false): string {
  if (!dueDate) return "-";
  const day = formatDayName(dueDate);
  return `${short ? day.slice(0, 3) : day}, ${formatDate(dueDate)}`;
}

/**
 * Label pembayaran ke-i: pembayaran pertama yang belum menutup total = "DP",
 * pembayaran berikutnya yang membuat lunas = "Pelunasan", selain itu "Cicilan".
 */
export function paymentLabel(order: Order, index: number): string {
  const payments = order.payments ?? [];
  const total = toNumber(order.total);
  const paidUntil = payments.slice(0, index + 1).reduce((sum, p) => sum + toNumber(p.amount), 0);
  const settled = paidUntil >= total;
  if (index === 0) return settled ? "Bayar" : "DP";
  return settled ? "Pelunasan" : "Cicilan";
}

function totals(order: Order) {
  const total = toNumber(order.total);
  const paid = toNumber(order.paid_amount);
  const payments = order.payments ?? [];
  const last = payments[payments.length - 1];
  const change = last?.received ? toNumber(last.received) - toNumber(last.amount) : 0;
  return { total, paid, remaining: Math.max(total - paid, 0), change };
}

function Row({ left, right, bold }: { left: React.ReactNode; right: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <span className="min-w-0">{left}</span>
      <span className="shrink-0 text-right">{right}</span>
    </div>
  );
}

const Divider = () => <div className="my-1.5 border-t border-dashed border-black/60" />;

/** Isi struk ukuran thermal 58mm. */
export function Receipt({ order, settings }: { order: Order; settings: Settings | null }) {
  const { total, paid, remaining, change } = totals(order);
  const discount = toNumber(order.discount);

  return (
    <div className="font-mono text-[11px] leading-[1.45] text-black">
      <div className="text-center">
        <p className="text-[13px] font-bold uppercase">{settings?.store_name ?? "Laundry"}</p>
        {settings?.address && <p>{settings.address}</p>}
        {settings?.phone && <p>Telp/WA {settings.phone}</p>}
      </div>
      <Divider />
      <Row left="No" right={order.invoice_code} />
      <Row left="Tanggal" right={formatDateTime(order.created_at)} />
      <Row left="Pelanggan" right={order.customer?.name ?? "-"} />
      {order.customer?.phone && <Row left="HP" right={order.customer.phone} />}
      <Divider />
      {(order.items ?? []).map((item) => (
        <div key={item.id} className="mb-1">
          <p>{item.service_name}</p>
          <Row
            left={`${formatNumber(item.quantity)} ${item.unit} x ${formatNumber(item.price, 0)}`}
            right={formatNumber(item.subtotal, 0)}
          />
        </div>
      ))}
      <Divider />
      <Row left="Subtotal" right={formatRupiah(order.subtotal)} />
      {discount > 0 && <Row left="Diskon" right={`-${formatRupiah(discount)}`} />}
      <Row left="TOTAL" right={formatRupiah(total)} bold />
      {(order.payments ?? []).map((p, i) => (
        <Row
          key={p.id}
          left={`${paymentLabel(order, i)} ${formatDate(p.created_at).slice(0, 5)}`}
          right={formatRupiah(p.amount)}
        />
      ))}
      {change > 0 && <Row left="Kembalian" right={formatRupiah(change)} />}
      <Row
        left={remaining > 0 ? "SISA" : "STATUS"}
        right={remaining > 0 ? formatRupiah(remaining) : paid > 0 || total === 0 ? "LUNAS" : "-"}
        bold
      />
      <Divider />
      <Row left="Masuk" right={formatDate(order.created_at)} />
      <Row left="Estimasi" right={estimateLabel(order.created_at, order.due_date)} bold />
      <Row left="Selesai" right={dueText(order.due_date, true)} bold />
      <Row left="Status" right={STATUS_LABEL[order.status]} />
      {order.note && <p className="mt-1">Catatan: {order.note}</p>}
      {settings?.receipt_footer && (
        <>
          <Divider />
          <p className="text-center">{settings.receipt_footer}</p>
        </>
      )}
    </div>
  );
}

/** Versi teks struk untuk WhatsApp. */
export function receiptText(order: Order, settings: Settings | null): string {
  const { total, paid, remaining } = totals(order);
  const discount = toNumber(order.discount);
  const lines = [
    `*${settings?.store_name ?? "Laundry"}*`,
    `Nota: ${order.invoice_code}`,
    `Tanggal: ${formatDateTime(order.created_at)}`,
    `Pelanggan: ${order.customer?.name ?? "-"}`,
    "",
    ...(order.items ?? []).map(
      (i) =>
        `• ${i.service_name} ${formatNumber(i.quantity)} ${i.unit} x ${formatRupiah(i.price)} = ${formatRupiah(i.subtotal)}`
    ),
    "",
    `Subtotal: ${formatRupiah(order.subtotal)}`,
    ...(discount > 0 ? [`Diskon: -${formatRupiah(discount)}`] : []),
    `*Total: ${formatRupiah(total)}*`,
    ...(order.payments ?? []).map(
      (p, i) => `${paymentLabel(order, i)} (${formatDate(p.created_at)}): ${formatRupiah(p.amount)}`
    ),
    ...(paid === 0 ? ["Dibayar: Rp 0"] : []),
    remaining > 0 ? `*Sisa: ${formatRupiah(remaining)}*` : "Status bayar: *LUNAS*",
    `Estimasi: *${estimateLabel(order.created_at, order.due_date)}*`,
    `Selesai: *${dueText(order.due_date)}*`,
  ];
  if (order.note) lines.push(`Catatan: ${order.note}`);
  if (settings?.receipt_footer) lines.push("", settings.receipt_footer);
  return lines.join("\n");
}

/** Pesan WhatsApp: cucian siap diambil. */
export function readyText(order: Order, settings: Settings | null): string {
  const { remaining } = totals(order);
  const store = settings?.store_name ?? "kami";
  return [
    `Halo ${order.customer?.name ?? "Kak"},`,
    `cucian Anda dengan nota *${order.invoice_code}* sudah *siap diambil* di ${store}.`,
    remaining > 0 ? `Sisa pembayaran: *${formatRupiah(remaining)}*.` : "Pembayaran sudah lunas.",
    "Terima kasih!",
  ].join("\n");
}

/** Salinan struk khusus cetak, dirender langsung di <body>. */
function PrintCopy({ order, settings }: { order: Order; settings: Settings | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="receipt-print-root">
      <Receipt order={order} settings={settings} />
    </div>,
    document.body
  );
}

export function ReceiptModal({
  order,
  settings,
  onClose,
  title = "Struk Pesanan",
  extraAction,
}: {
  order: Order | null;
  settings: Settings | null;
  onClose: () => void;
  title?: string;
  extraAction?: React.ReactNode;
}) {
  return (
    <Modal
      open={!!order}
      title={title}
      description={order ? `${order.invoice_code} · ${order.customer?.name ?? ""}` : undefined}
      onClose={onClose}
      size="md"
      footer={
        order && (
          <>
            <a
              href={waLink(order.customer?.phone, receiptText(order, settings))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <Icon name="whatsapp" className="h-[18px] w-[18px]" />
              Kirim WA
            </a>
            <Button variant="secondary" icon="printer" onClick={() => window.print()}>
              Cetak Struk
            </Button>
            {extraAction}
          </>
        )
      }
    >
      {order && (
        <>
          <div className="rounded-2xl bg-slate-100 p-4 sm:p-6">
            <div className="mx-auto w-[260px] rounded-sm bg-white px-4 py-5 shadow-md">
              <Receipt order={order} settings={settings} />
            </div>
          </div>
          {!order.customer?.phone && (
            <p className="mt-3 text-xs text-slate-500">
              Pelanggan belum punya nomor HP. Tombol WA akan membuka WhatsApp tanpa tujuan, pilih kontak secara manual.
            </p>
          )}
          <PrintCopy order={order} settings={settings} />
        </>
      )}
    </Modal>
  );
}
