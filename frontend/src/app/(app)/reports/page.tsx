"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiRequest, errorMessage } from "@/lib/api";
import {
  addDays,
  formatDate,
  formatNumber,
  formatRupiah,
  parseDate,
  toISODate,
} from "@/lib/format";
import type { Report } from "@/lib/types";
import { Button, Card, EmptyState, LoadingBlock, PageHeader, inputClass } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { useToast } from "@/components/Toast";

type Preset = "today" | "7" | "30" | "month" | "last-month" | "custom";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Hari ini" },
  { value: "7", label: "7 hari" },
  { value: "30", label: "30 hari" },
  { value: "month", label: "Bulan ini" },
  { value: "last-month", label: "Bulan lalu" },
  { value: "custom", label: "Pilih tanggal" },
];

function rangeOf(p: Preset): { from: string; to: string } {
  const today = new Date();
  switch (p) {
    case "7":
      return { from: toISODate(addDays(today, -6)), to: toISODate(today) };
    case "30":
      return { from: toISODate(addDays(today, -29)), to: toISODate(today) };
    case "month":
      return { from: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)), to: toISODate(today) };
    case "last-month": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: toISODate(first), to: toISODate(last) };
    }
    default:
      return { from: toISODate(today), to: toISODate(today) };
  }
}

export default function ReportsPage() {
  const toast = useToast();
  const [preset, setPreset] = useState<Preset>("7");
  const [range, setRange] = useState(rangeOf("7"));
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!range.from || !range.to) return;
    setLoading(true);
    try {
      setReport(await apiRequest<Report>(`/reports/summary?from=${range.from}&to=${range.to}`));
    } catch (err) {
      toast.error(errorMessage(err, "Gagal memuat laporan."));
    } finally {
      setLoading(false);
    }
  }, [range, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function choose(p: Preset) {
    setPreset(p);
    if (p !== "custom") setRange(rangeOf(p));
  }

  function downloadCsv() {
    if (!report) return;
    const rows = [
      ["Tanggal", "Pendapatan", "Jumlah Pesanan"],
      ...report.daily.map((d) => [formatDate(d.date), String(Math.round(d.revenue)), String(d.orders)]),
      [],
      ["Total", String(Math.round(report.revenue)), String(report.orders_count)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${report.from}_${report.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const singleDay = report ? report.from === report.to : false;

  return (
    <>
      <PageHeader
        title="Laporan"
        description={
          report
            ? singleDay
              ? `Periode ${formatDate(report.from)}`
              : `Periode ${formatDate(report.from)} – ${formatDate(report.to)}`
            : "Ringkasan pendapatan dan pesanan"
        }
        actions={
          <Button variant="secondary" icon="reports" disabled={!report} onClick={downloadCsv}>
            Unduh CSV
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="scroll-thin flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => choose(p.value)}
              className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                preset === p.value ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className={`${inputClass} w-40`}
              aria-label="Tanggal awal"
            />
            <span className="text-slate-400">–</span>
            <input
              type="date"
              value={range.to}
              min={range.from}
              max={toISODate(new Date())}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className={`${inputClass} w-40`}
              aria-label="Tanggal akhir"
            />
          </div>
        )}
      </div>

      {loading && !report ? (
        <LoadingBlock label="Menyusun laporan..." />
      ) : !report ? (
        <Card>
          <EmptyState icon="reports" title="Laporan belum tersedia" />
        </Card>
      ) : (
        <div className={`space-y-6 transition ${loading ? "opacity-60" : ""}`}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon="cash" tone="blue" label="Pendapatan" value={formatRupiah(report.revenue)} hint="Uang masuk pada periode ini" />
            <Kpi icon="orders" tone="violet" label="Pesanan masuk" value={formatNumber(report.orders_count)} hint={`Nilai ${formatRupiah(report.orders_value)}`} />
            <Kpi icon="pos" tone="emerald" label="Rata-rata pesanan" value={formatRupiah(report.average_order)} hint="Per transaksi" />
            <Link href="/orders?payment=belum_lunas" className="block">
              <Kpi
                icon="alert"
                tone="red"
                label="Piutang"
                value={formatRupiah(report.receivable.amount)}
                hint={`${report.receivable.count} pesanan belum lunas · lihat →`}
                interactive
              />
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Pendapatan harian</h2>
                  <p className="text-sm text-slate-500">Arahkan kursor ke batang untuk rinciannya</p>
                </div>
              </div>
              <RevenueChart daily={report.daily} />
            </Card>

            <div className="space-y-6">
              <Card className="p-5">
                <h2 className="font-semibold text-slate-900">Antrean cucian saat ini</h2>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["diterima", "Diterima", "bg-slate-100 text-slate-700"],
                      ["dicuci", "Dicuci", "bg-sky-50 text-sky-700"],
                      ["siap_diambil", "Siap ambil", "bg-amber-50 text-amber-700"],
                    ] as const
                  ).map(([key, label, color]) => (
                    <Link
                      key={key}
                      href={`/orders?status=${key}`}
                      className={`rounded-xl px-3 py-3 text-center transition hover:opacity-80 ${color}`}
                    >
                      <p className="text-2xl font-bold">{report.queue[key]}</p>
                      <p className="text-xs font-medium">{label}</p>
                    </Link>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Layanan terlaris</h2>
              <p className="text-sm text-slate-500">Berdasarkan nilai penjualan pada periode ini</p>
            </div>
            {report.top_services.length === 0 ? (
              <EmptyState icon="services" title="Belum ada penjualan pada periode ini" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {report.top_services.map((s, i) => {
                  const max = report.top_services[0].total || 1;
                  return (
                    <li key={`${s.name}-${s.unit}`} className="flex items-center gap-4 px-5 py-3.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium text-slate-900">{s.name}</p>
                          <p className="shrink-0 text-sm font-semibold text-slate-900">{formatRupiah(s.total)}</p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${(s.total / max) * 100}%` }} />
                          </div>
                          <span className="shrink-0 text-xs text-slate-500">
                            {formatNumber(s.quantity)} {s.unit} · {s.count}×
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  tone,
  interactive,
}: {
  icon: IconName;
  label: string;
  value: string;
  hint: string;
  tone: "blue" | "violet" | "emerald" | "red";
  interactive?: boolean;
}) {
  const color = {
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
  }[tone];
  return (
    <Card className={`h-full p-5 ${interactive ? "transition hover:border-red-200 hover:shadow-md" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </Card>
  );
}

function RevenueChart({ daily }: { daily: Report["daily"] }) {
  const max = Math.max(...daily.map((d) => d.revenue), 1);
  const every = Math.max(1, Math.ceil(daily.length / 10));
  const hasData = daily.some((d) => d.revenue > 0 || d.orders > 0);
  const gridValues = useMemo(() => [1, 0.5, 0].map((f) => max * f), [max]);

  if (!hasData) {
    return <EmptyState icon="reports" title="Belum ada transaksi" description="Tidak ada pemasukan pada periode ini." />;
  }

  return (
    <div className="flex gap-3">
      <div className="flex h-56 flex-col justify-between pb-6 text-right text-[11px] text-slate-400">
        {gridValues.map((v, i) => (
          <span key={i}>{v >= 1000 ? `${formatNumber(v / 1000, 0)}rb` : formatNumber(v, 0)}</span>
        ))}
      </div>
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
          {gridValues.map((_, i) => (
            <div key={i} className="border-t border-dashed border-slate-200" />
          ))}
        </div>
        <div className="relative flex h-56 items-end gap-[3px]">
          {daily.map((d, i) => {
            const pct = (d.revenue / max) * 100;
            const date = parseDate(d.date);
            return (
              <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end pb-6">
                <div
                  className="w-full rounded-t-md bg-blue-500/85 transition group-hover:bg-blue-600"
                  style={{ height: `${Math.max(pct, d.revenue > 0 ? 2 : 0)}%` }}
                />
                {i % every === 0 && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-400">
                    {date ? `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}` : ""}
                  </span>
                )}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                  <p className="font-semibold">{formatDate(d.date)}</p>
                  <p>{formatRupiah(d.revenue)}</p>
                  <p className="text-slate-300">{d.orders} pesanan</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
