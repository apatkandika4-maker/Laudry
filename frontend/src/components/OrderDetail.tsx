"use client";

import { useEffect, useState } from "react";
import Modal, { ConfirmDialog } from "./Modal";
import PaymentModal from "./PaymentModal";
import { paymentLabel, ReceiptModal, readyText, receiptText } from "./Receipt";
import { Button, LoadingBlock, PaymentBadge, StatusBadge } from "./ui";
import { Icon } from "./icons";
import { useToast } from "./Toast";
import { apiRequest, errorMessage } from "@/lib/api";
import { useSettings } from "@/lib/settings-context";
import {
  estimateLabel,
  formatDate,
  formatDateTime,
  formatNumber,
  formatRupiah,
  isOverdue,
  nextStatus,
  STATUS_FLOW,
  STATUS_LABEL,
  toNumber,
  waLink,
} from "@/lib/format";
import type { Order, OrderStatus, PaymentInput } from "@/lib/types";

/** Detail pesanan: status, pembayaran, struk, WA, hapus. */
export default function OrderDetailModal({
  orderId,
  onClose,
  onChanged,
  onDeleted,
}: {
  orderId: number | null;
  onClose: () => void;
  onChanged: (order: Order) => void;
  onDeleted: (id: number) => void;
}) {
  const toast = useToast();
  const { settings } = useSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyStatus, setBusyStatus] = useState<OrderStatus | null>(null);
  const [confirmPickup, setConfirmPickup] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (orderId === null) {
      setOrder(null);
      return;
    }
    setLoading(true);
    apiRequest<Order>(`/orders/${orderId}`)
      .then(setOrder)
      .catch((err) => {
        toast.error(errorMessage(err, "Gagal memuat pesanan."));
        onClose();
      })
      .finally(() => setLoading(false));
    // onClose sengaja tidak jadi dependensi agar tidak memuat ulang terus
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, toast]);

  const total = toNumber(order?.total);
  const paid = toNumber(order?.paid_amount);
  const remaining = Math.max(total - paid, 0);

  function update(next: Order) {
    setOrder(next);
    onChanged(next);
  }

  async function setStatus(status: OrderStatus, force = false) {
    if (!order || status === order.status) return;
    if (status === "diambil" && remaining > 0 && !force) {
      setConfirmPickup(true);
      return;
    }
    setBusyStatus(status);
    try {
      const next = await apiRequest<Order>(`/orders/${order.id}/status`, {
        method: "PATCH",
        body: { status },
      });
      update(next);
      toast.success(`Status diubah ke ${STATUS_LABEL[status]}.`);
    } catch (err) {
      toast.error(errorMessage(err, "Gagal mengubah status."));
    } finally {
      setBusyStatus(null);
      setConfirmPickup(false);
    }
  }

  async function pay(payment: PaymentInput | null) {
    if (!order || !payment) return;
    setPaying(true);
    try {
      const next = await apiRequest<Order>(`/orders/${order.id}/payments`, {
        method: "POST",
        body: payment,
      });
      update(next);
      setPayOpen(false);
      // Nota yang sama langsung ditampilkan ulang dengan status terbaru (LUNAS / sisa).
      setReceiptOpen(true);
      toast.success(
        next.payment_status === "lunas" ? "Pembayaran diterima. Pesanan lunas." : "Pembayaran sebagian diterima."
      );
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menyimpan pembayaran."));
    } finally {
      setPaying(false);
    }
  }

  async function remove() {
    if (!order) return;
    setDeleting(true);
    try {
      await apiRequest(`/orders/${order.id}`, { method: "DELETE" });
      toast.success(`Pesanan ${order.invoice_code} dihapus.`);
      setConfirmDelete(false);
      onDeleted(order.id);
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menghapus pesanan."));
    } finally {
      setDeleting(false);
    }
  }

  const next = order ? nextStatus(order.status) : null;
  const currentIndex = order ? STATUS_FLOW.indexOf(order.status) : 0;

  return (
    <>
      <Modal
        open={orderId !== null}
        title={order ? order.invoice_code : "Detail Pesanan"}
        description={order ? `Dibuat ${formatDateTime(order.created_at)}` : undefined}
        onClose={onClose}
        size="xl"
      >
        {loading || !order ? (
          <LoadingBlock label="Memuat pesanan..." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* Kiri: rincian */}
            <div className="space-y-5">
              {/* Status */}
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Status cucian</p>
                  {isOverdue(order.due_date, order.status) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                      <Icon name="alert" className="h-3.5 w-3.5" /> Lewat estimasi
                    </span>
                  )}
                </div>
                <ol className="grid grid-cols-4 gap-2">
                  {STATUS_FLOW.map((s, i) => {
                    const done = i <= currentIndex;
                    return (
                      <li key={s}>
                        <button
                          type="button"
                          disabled={busyStatus !== null}
                          onClick={() => setStatus(s)}
                          className="group w-full text-left"
                          title={`Tandai ${STATUS_LABEL[s]}`}
                        >
                          <span
                            className={`block h-1.5 rounded-full transition ${done ? "bg-blue-600" : "bg-slate-200 group-hover:bg-slate-300"}`}
                          />
                          <span
                            className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${i === currentIndex ? "text-blue-700" : done ? "text-slate-700" : "text-slate-400"}`}
                          >
                            {busyStatus === s ? (
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
                            ) : (
                              done && <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
                            )}
                            {STATUS_LABEL[s]}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
                {next && (
                  <Button
                    className="mt-4 w-full"
                    icon="check"
                    loading={busyStatus === next}
                    onClick={() => setStatus(next)}
                  >
                    Tandai {STATUS_LABEL[next]}
                  </Button>
                )}
                {order.status === "diambil" && order.picked_up_at && (
                  <p className="mt-3 text-xs text-slate-500">Diambil pada {formatDateTime(order.picked_up_at)}</p>
                )}
              </div>

              {/* Item */}
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold">Layanan</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Jumlah</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(order.items ?? []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.service_name}</p>
                          <p className="text-xs text-slate-500">{formatRupiah(item.price)} / {item.unit}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatNumber(item.quantity)} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{formatRupiah(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="space-y-1.5 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>{formatRupiah(order.subtotal)}</span>
                  </div>
                  {toNumber(order.discount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Diskon</span>
                      <span>-{formatRupiah(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-900">
                    <span>Total</span>
                    <span>{formatRupiah(total)}</span>
                  </div>
                </div>
              </div>

              {/* Riwayat bayar */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900">Riwayat pembayaran</p>
                {(order.payments ?? []).length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 px-4 py-4 text-center text-sm text-slate-500">
                    Belum ada pembayaran.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                    {(order.payments ?? []).map((p, i) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">{paymentLabel(order, i)}</p>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(p.created_at)}
                            {p.received && toNumber(p.received) > toNumber(p.amount)
                              ? ` · diterima ${formatRupiah(p.received)}, kembali ${formatRupiah(toNumber(p.received) - toNumber(p.amount))}`
                              : ""}
                          </p>
                        </div>
                        <span className="font-semibold text-emerald-700">{formatRupiah(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {order.note && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <span className="font-semibold">Catatan:</span> {order.note}
                </div>
              )}
            </div>

            {/* Kanan: ringkasan & aksi */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pelanggan</p>
                <p className="mt-2 font-semibold text-slate-900">{order.customer?.name}</p>
                <p className="text-sm text-slate-500">{order.customer?.phone || "Tanpa nomor HP"}</p>
                {order.customer?.address && <p className="mt-1 text-sm text-slate-500">{order.customer.address}</p>}
                {order.customer?.notes && <p className="mt-2 text-xs text-amber-700">⚑ {order.customer.notes}</p>}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pembayaran</p>
                  <PaymentBadge status={order.payment_status} />
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Dibayar</span>
                    <span>{formatRupiah(paid)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-900">Sisa</span>
                    <span className={remaining > 0 ? "text-red-600" : "text-emerald-600"}>{formatRupiah(remaining)}</span>
                  </div>
                </div>
                {remaining > 0 && (
                  <Button variant="success" icon="cash" className="mt-4 w-full" onClick={() => setPayOpen(true)}>
                    Pelunasan {formatRupiah(remaining)}
                  </Button>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-slate-500">Estimasi selesai</span>
                  <span className="font-medium text-slate-900">
                    {formatDate(order.due_date)}{" "}
                    <span className="text-slate-500">({estimateLabel(order.created_at, order.due_date)})</span>
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <Button variant="secondary" icon="printer" onClick={() => setReceiptOpen(true)}>
                  Lihat & Cetak Struk
                </Button>
                <a
                  href={waLink(
                    order.customer?.phone,
                    order.status === "siap_diambil" ? readyText(order, settings) : receiptText(order, settings)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Icon name="whatsapp" className="h-[18px] w-[18px]" />
                  {order.status === "siap_diambil" ? "Kabari Siap Diambil" : "Kirim Struk via WA"}
                </a>
                <Button variant="ghost" icon="trash" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
                  Hapus Pesanan
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <PaymentModal
        open={payOpen}
        mode="settle"
        amountDue={remaining}
        submitting={paying}
        onClose={() => setPayOpen(false)}
        onSubmit={pay}
      />

      <ReceiptModal order={receiptOpen ? order : null} settings={settings} onClose={() => setReceiptOpen(false)} />

      <ConfirmDialog
        open={confirmPickup}
        title="Masih ada sisa tagihan"
        tone="primary"
        confirmLabel="Tetap Tandai Diambil"
        loading={busyStatus === "diambil"}
        onClose={() => setConfirmPickup(false)}
        onConfirm={() => setStatus("diambil", true)}
        message={
          <>
            Pesanan ini masih kurang <b className="text-slate-900">{formatRupiah(remaining)}</b>. Sebaiknya terima
            pembayaran dulu. Tetap tandai sebagai diambil?
          </>
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus pesanan?"
        loading={deleting}
        confirmLabel="Hapus Pesanan"
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        message={
          <>
            Pesanan <b className="text-slate-900">{order?.invoice_code}</b> beserta riwayat pembayarannya akan dihapus
            permanen dan tidak tercatat lagi di laporan.
          </>
        }
      />
    </>
  );
}
