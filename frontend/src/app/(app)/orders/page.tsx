"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest, errorMessage } from "@/lib/api";
import {
  addDays,
  formatDate,
  formatDateTime,
  formatRupiah,
  isOverdue,
  nextStatus,
  STATUS_FLOW,
  STATUS_LABEL,
  toISODate,
  toNumber,
} from "@/lib/format";
import type { BulkDeleteResult, Order, OrderStatus, OrdersResponse } from "@/lib/types";
import {
  BulkBar,
  Button,
  Card,
  Checkbox,
  EmptyState,
  IconButton,
  LoadingBlock,
  PageHeader,
  Pagination,
  PaymentBadge,
  SearchInput,
  StatusBadge,
  inputClass,
  td,
  th,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { ConfirmDialog } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import OrderDetailModal from "@/components/OrderDetail";

type Period = "all" | "today" | "7" | "30";
type PaymentFilter = "" | "belum_lunas" | "lunas";

const PERIOD_LABEL: Record<Period, string> = {
  all: "",
  today: "hari ini",
  "7": "7 hari terakhir",
  "30": "30 hari terakhir",
};

function periodRange(p: Period): { from?: string; to?: string } {
  const today = new Date();
  if (p === "today") return { from: toISODate(today), to: toISODate(today) };
  if (p === "7") return { from: toISODate(addDays(today, -6)), to: toISODate(today) };
  if (p === "30") return { from: toISODate(addDays(today, -29)), to: toISODate(today) };
  return {};
}

export default function OrdersPage() {
  const toast = useToast();
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [payment, setPayment] = useState<PaymentFilter>("");
  const [period, setPeriod] = useState<Period>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [advancing, setAdvancing] = useState<number | null>(null);

  // hapus: satu, terpilih, atau semua
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // filter awal dari URL, mis. /orders?status=siap_diambil
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("status") as OrderStatus | null;
    if (s && STATUS_FLOW.includes(s)) setStatus(s);
    if (params.get("payment") === "belum_lunas") setPayment("belum_lunas");
    setReady(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  function filters() {
    const { from, to } = periodRange(period);
    return {
      status: status || null,
      payment: payment || null,
      search: debounced || null,
      from: from ?? null,
      to: to ?? null,
    };
  }

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), per_page: "15" });
    if (status) q.set("status", status);
    if (payment) q.set("payment", payment);
    if (debounced) q.set("search", debounced);
    const { from, to } = periodRange(period);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    try {
      const res = await apiRequest<OrdersResponse>(`/orders?${q}`);
      setData(res);
      const ids = new Set(res.data.map((o) => o.id));
      setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))));
    } catch (err) {
      toast.error(errorMessage(err, "Gagal memuat pesanan."));
    } finally {
      setLoading(false);
    }
  }, [page, status, payment, debounced, period, toast]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  // kembali ke halaman 1 & kosongkan pilihan setiap filter berubah
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [status, payment, debounced, period]);

  async function advance(order: Order) {
    const next = nextStatus(order.status);
    if (!next) return;
    if (next === "diambil" && toNumber(order.total) > toNumber(order.paid_amount)) {
      setOpenId(order.id); // tampilkan detail supaya pembayaran diselesaikan dulu
      return;
    }
    setAdvancing(order.id);
    try {
      await apiRequest(`/orders/${order.id}/status`, { method: "PATCH", body: { status: next } });
      toast.success(`${order.invoice_code} → ${STATUS_LABEL[next]}`);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal mengubah status."));
    } finally {
      setAdvancing(null);
    }
  }

  const orders = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageIds = orders.map((o) => o.id);
  const checkedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allChecked = pageIds.length > 0 && checkedOnPage === pageIds.length;
  const filtered = !!(status || payment || debounced || period !== "all");

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allChecked ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function done(message: string, ok: boolean) {
    if (ok) toast.success(message);
    else toast.error(message);
    setSelected(new Set());
    setDeleting(null);
    setBulkOpen(false);
    setAllOpen(false);
    if (page > 1) setPage(1);
    else load();
  }

  async function removeOne() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await apiRequest<{ message: string }>(`/orders/${deleting.id}`, { method: "DELETE" });
      done(res.message, true);
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menghapus pesanan."));
    } finally {
      setBusy(false);
    }
  }

  async function removeMany(all: boolean) {
    setBusy(true);
    try {
      const res = await apiRequest<BulkDeleteResult>("/orders/bulk-delete", {
        method: "POST",
        body: all ? { all: true, filters: filters() } : { ids: [...selected] },
      });
      done(res.message, res.deleted > 0);
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menghapus pesanan."));
    } finally {
      setBusy(false);
    }
  }

  const counts = data?.status_counts;
  const allCount = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const tabs: { value: OrderStatus | ""; label: string; count: number }[] = [
    { value: "", label: "Semua", count: allCount },
    ...STATUS_FLOW.map((s) => ({ value: s, label: STATUS_LABEL[s], count: counts?.[s] ?? 0 })),
  ];

  const filterDesc = [
    status && `status ${STATUS_LABEL[status]}`,
    payment && (payment === "lunas" ? "lunas" : "belum lunas"),
    period !== "all" && PERIOD_LABEL[period],
    debounced && `pencarian "${debounced}"`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHeader
        title="Pesanan"
        description="Pantau cucian, ubah status, dan terima pelunasan."
        actions={
          <>
            <Button
              variant="secondary"
              icon="trash"
              className="text-red-600 hover:bg-red-50"
              disabled={total === 0}
              onClick={() => setAllOpen(true)}
            >
              {filtered ? "Hapus Semua Hasil Filter" : "Hapus Semua"}
            </Button>
            <Link href="/pos">
              <Button icon="plus">Transaksi Baru</Button>
            </Link>
          </>
        }
      />

      <div className="scroll-thin mb-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.value || "all"}
            type="button"
            onClick={() => setStatus(t.value)}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
              status === t.value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {t.label}
            <span
              className={`rounded-md px-1.5 py-0.5 text-xs ${status === t.value ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari no. nota, nama, atau HP pelanggan..."
            className="flex-1"
          />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className={`${inputClass} md:w-44`}
            aria-label="Periode"
          >
            <option value="all">Semua waktu</option>
            <option value="today">Hari ini</option>
            <option value="7">7 hari terakhir</option>
            <option value="30">30 hari terakhir</option>
          </select>
          <select
            value={payment}
            onChange={(e) => setPayment(e.target.value as PaymentFilter)}
            className={`${inputClass} md:w-44`}
            aria-label="Pembayaran"
          >
            <option value="">Semua pembayaran</option>
            <option value="belum_lunas">Belum lunas</option>
            <option value="lunas">Lunas</option>
          </select>
        </div>

        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button size="sm" variant="danger" icon="trash" onClick={() => setBulkOpen(true)}>
            Hapus Terpilih ({selected.size})
          </Button>
        </BulkBar>

        {loading && !data ? (
          <LoadingBlock label="Memuat pesanan..." />
        ) : orders.length === 0 ? (
          <EmptyState
            icon="orders"
            title="Tidak ada pesanan"
            description={
              filtered ? "Tidak ada pesanan yang cocok dengan filter ini." : "Transaksi dari kasir akan muncul di sini."
            }
          />
        ) : (
          <div className={`overflow-x-auto transition ${loading ? "opacity-60" : ""}`}>
            <table className="w-full min-w-[920px]">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="w-12 py-3 pl-4">
                    <Checkbox
                      label="Pilih semua pesanan di halaman ini"
                      checked={allChecked}
                      indeterminate={checkedOnPage > 0 && !allChecked}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className={th}>Nota</th>
                  <th className={th}>Pelanggan</th>
                  <th className={`${th} text-right`}>Total</th>
                  <th className={th}>Bayar</th>
                  <th className={th}>Status</th>
                  <th className={th}>Estimasi</th>
                  <th className={`${th} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {orders.map((o) => {
                  const remaining = toNumber(o.total) - toNumber(o.paid_amount);
                  const next = nextStatus(o.status);
                  const late = isOverdue(o.due_date, o.status);
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setOpenId(o.id)}
                      className={`cursor-pointer transition ${selected.has(o.id) ? "bg-blue-50/50" : "hover:bg-slate-50"}`}
                    >
                      <td className="w-12 py-3.5 pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          label={`Pilih ${o.invoice_code}`}
                          checked={selected.has(o.id)}
                          onChange={() => toggle(o.id)}
                        />
                      </td>
                      <td className={td}>
                        <p className="font-mono text-[13px] font-semibold text-slate-900">{o.invoice_code}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(o.created_at)}</p>
                      </td>
                      <td className={td}>
                        <p className="font-medium text-slate-900">{o.customer?.name}</p>
                        <p className="text-xs text-slate-500">{o.customer?.phone || "-"}</p>
                      </td>
                      <td className={`${td} text-right`}>
                        <p className="font-semibold text-slate-900">{formatRupiah(o.total)}</p>
                        {remaining > 0 && <p className="text-xs text-red-600">Sisa {formatRupiah(remaining)}</p>}
                      </td>
                      <td className={td}>
                        <PaymentBadge status={o.payment_status} />
                      </td>
                      <td className={td}>
                        <StatusBadge status={o.status} />
                      </td>
                      <td className={td}>
                        <p className={late ? "font-medium text-red-600" : "text-slate-700"}>{formatDate(o.due_date)}</p>
                        {late && <p className="text-xs text-red-600">Terlambat</p>}
                      </td>
                      <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {next ? (
                            <Button size="sm" variant="soft" loading={advancing === o.id} onClick={() => advance(o)}>
                              {STATUS_LABEL[next]}
                              <Icon name="chevron-right" className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <span className="px-2 text-xs text-slate-400">Selesai</span>
                          )}
                          <IconButton
                            icon="trash"
                            tone="danger"
                            label={`Hapus ${o.invoice_code}`}
                            onClick={() => setDeleting(o)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <Pagination
            page={data.current_page}
            lastPage={data.last_page}
            total={data.total}
            from={data.from}
            to={data.to}
            onChange={setPage}
          />
        )}
      </Card>

      <OrderDetailModal
        orderId={openId}
        onClose={() => {
          setOpenId(null);
          load(); // segarkan hitungan per status
        }}
        onChanged={(updated) =>
          setData((d) => (d ? { ...d, data: d.data.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)) } : d))
        }
        onDeleted={() => {
          setOpenId(null);
          load();
        }}
      />

      {/* Hapus satu */}
      <ConfirmDialog
        open={!!deleting}
        title="Hapus pesanan?"
        confirmLabel="Hapus Pesanan"
        loading={busy}
        onClose={() => setDeleting(null)}
        onConfirm={removeOne}
        message={
          <>
            Pesanan <b className="text-slate-900">{deleting?.invoice_code}</b> ({deleting?.customer?.name},{" "}
            {formatRupiah(deleting?.total ?? 0)}) beserta riwayat pembayarannya akan dihapus permanen dan tidak tercatat
            lagi di laporan.
          </>
        }
      />

      {/* Hapus terpilih */}
      <ConfirmDialog
        open={bulkOpen}
        title={`Hapus ${selected.size} pesanan?`}
        confirmLabel={`Hapus ${selected.size} Pesanan`}
        loading={busy}
        onClose={() => setBulkOpen(false)}
        onConfirm={() => removeMany(false)}
        message="Pesanan terpilih beserta riwayat pembayarannya akan dihapus permanen dan tidak tercatat lagi di laporan."
      />

      {/* Hapus semua */}
      <ConfirmDialog
        open={allOpen}
        title={filtered ? "Hapus semua hasil filter?" : "Hapus SEMUA pesanan?"}
        confirmLabel={`Hapus ${total} Pesanan`}
        requireText="HAPUS"
        loading={busy}
        onClose={() => setAllOpen(false)}
        onConfirm={() => removeMany(true)}
        message={
          <>
            <b className="text-slate-900">{total} pesanan</b>
            {filtered ? <> sesuai filter ({filterDesc})</> : " (seluruh pesanan)"} beserta riwayat pembayarannya akan
            dihapus permanen. Laporan pendapatan ikut berubah dan data tidak bisa dikembalikan.
          </>
        }
      />
    </>
  );
}
