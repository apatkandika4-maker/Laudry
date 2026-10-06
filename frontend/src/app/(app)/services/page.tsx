"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/api";
import { formatRupiah, toNumber } from "@/lib/format";
import type { BulkDeleteResult, Service, Unit } from "@/lib/types";
import {
  BulkBar,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  IconButton,
  LoadingBlock,
  MoneyInput,
  PageHeader,
  SearchInput,
  Toggle,
  inputClass,
  td,
  th,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import Modal, { ConfirmDialog } from "@/components/Modal";
import { useToast } from "@/components/Toast";

type StatusFilter = "all" | "active" | "inactive";
type FormState = { name: string; unit: Unit; price: number | ""; estimated_days: string; is_active: boolean };
const EMPTY: FormState = { name: "", unit: "kg", price: "", estimated_days: "2", is_active: true };

export default function ServicesPage() {
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Service | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest<Service[]>("/services");
      setServices(data);
      const ids = new Set(data.map((s) => s.id));
      setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))));
    } catch (err) {
      toast.error(errorMessage(err, "Gagal memuat layanan."));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter(
      (s) =>
        (filter === "all" || (filter === "active" ? s.is_active : !s.is_active)) &&
        (!q || s.name.toLowerCase().includes(q))
    );
  }, [services, search, filter]);

  const visibleIds = visible.map((s) => s.id);
  const checked = visibleIds.filter((id) => selected.has(id)).length;
  const allChecked = visibleIds.length > 0 && checked === visibleIds.length;
  const activeCount = services.filter((s) => s.is_active).length;

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
      visibleIds.forEach((id) => (allChecked ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function openForm(service: Service | null) {
    setEditing(service);
    setErrors({});
    setForm(
      service
        ? {
            name: service.name,
            unit: service.unit,
            price: Math.round(toNumber(service.price)),
            estimated_days: String(service.estimated_days),
            is_active: service.is_active,
          }
        : EMPTY
    );
    setFormOpen(true);
  }

  function bodyOf(f: FormState) {
    return {
      name: f.name.trim(),
      unit: f.unit,
      price: f.price === "" ? null : f.price,
      estimated_days: f.estimated_days === "" ? null : Number(f.estimated_days),
      is_active: f.is_active,
    };
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (editing) {
        await apiRequest(`/services/${editing.id}`, { method: "PUT", body: bodyOf(form) });
        toast.success("Layanan diperbarui.");
      } else {
        await apiRequest("/services", { method: "POST", body: bodyOf(form) });
        toast.success(`Layanan ${form.name.trim()} ditambahkan.`);
      }
      setFormOpen(false);
      load();
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else toast.error(errorMessage(err, "Gagal menyimpan layanan."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Service) {
    setToggling(s.id);
    try {
      await apiRequest("/services/bulk-status", { method: "POST", body: { ids: [s.id], is_active: !s.is_active } });
      setServices((list) => list.map((x) => (x.id === s.id ? { ...x, is_active: !s.is_active } : x)));
      toast.success(`${s.name} ${s.is_active ? "dinonaktifkan" : "diaktifkan"}.`);
    } catch (err) {
      toast.error(errorMessage(err, "Gagal mengubah status."));
    } finally {
      setToggling(null);
    }
  }

  async function bulkStatus(active: boolean) {
    setBusy(true);
    try {
      const res = await apiRequest<{ message: string }>("/services/bulk-status", {
        method: "POST",
        body: { ids: [...selected], is_active: active },
      });
      toast.success(res.message);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal mengubah status."));
    } finally {
      setBusy(false);
    }
  }

  async function removeOne() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiRequest(`/services/${deleting.id}`, { method: "DELETE" });
      toast.success(`Layanan ${deleting.name} dihapus.`);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menghapus layanan."));
    } finally {
      setDeleting(null);
      setBusy(false);
    }
  }

  async function removeBulk() {
    setBusy(true);
    try {
      const res = await apiRequest<BulkDeleteResult>("/services/bulk-delete", {
        method: "POST",
        body: { ids: [...selected] },
      });
      toast.success(res.message);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menghapus layanan."));
    } finally {
      setBulkDelete(false);
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Layanan"
        description={`${activeCount} aktif dari ${services.length} layanan. Layanan aktif tampil di kasir.`}
        actions={
          <Button icon="plus" onClick={() => openForm(null)}>
            Tambah Layanan
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari layanan..." className="sm:w-80" />
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(
              [
                ["all", "Semua"],
                ["active", "Aktif"],
                ["inactive", "Nonaktif"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilter(v)}
                className={`flex-1 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  filter === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button size="sm" variant="secondary" icon="check" disabled={busy} onClick={() => bulkStatus(true)}>
            Aktifkan
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => bulkStatus(false)}>
            Nonaktifkan
          </Button>
          <Button size="sm" variant="danger" icon="trash" disabled={busy} onClick={() => setBulkDelete(true)}>
            Hapus
          </Button>
        </BulkBar>

        {loading ? (
          <LoadingBlock label="Memuat layanan..." />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="services"
            title={services.length ? "Tidak ada layanan yang cocok" : "Belum ada layanan"}
            description={services.length ? "Ubah filter atau kata kunci." : "Tambahkan layanan pertama, misalnya Cuci Kering Lipat per kg."}
            action={
              !services.length && (
                <Button icon="plus" onClick={() => openForm(null)}>
                  Tambah Layanan
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px]">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="w-12 py-3 pl-4">
                    <Checkbox
                      label="Pilih semua layanan"
                      checked={allChecked}
                      indeterminate={checked > 0 && !allChecked}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className={th}>Layanan</th>
                  <th className={`${th} text-right`}>Harga</th>
                  <th className={th}>Estimasi</th>
                  <th className={`${th} text-right`}>Terjual</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {visible.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`cursor-pointer transition ${selected.has(s.id) ? "bg-blue-50/50" : "hover:bg-slate-50"} ${s.is_active ? "" : "text-slate-400"}`}
                  >
                    <td className="w-12 py-3.5 pl-4">
                      <Checkbox label={`Pilih ${s.name}`} checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            s.unit === "kg" ? "bg-sky-50 text-sky-600" : "bg-violet-50 text-violet-600"
                          }`}
                        >
                          <Icon name={s.unit === "kg" ? "washer" : "services"} className="h-[18px] w-[18px]" />
                        </span>
                        <div>
                          <p className={`font-medium ${s.is_active ? "text-slate-900" : "text-slate-500"}`}>{s.name}</p>
                          <p className="text-xs text-slate-500">{s.unit === "kg" ? "Kiloan" : "Satuan"}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${td} text-right font-semibold ${s.is_active ? "text-slate-900" : ""}`}>
                      {formatRupiah(s.price)}
                      <span className="text-xs font-normal text-slate-500"> /{s.unit}</span>
                    </td>
                    <td className={`${td} text-slate-600`}>
                      {s.estimated_days === 0 ? "Hari ini" : `${s.estimated_days} hari`}
                    </td>
                    <td className={`${td} text-right text-slate-600`}>{s.order_items_count ?? 0}×</td>
                    <td className={td} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={s.is_active}
                        aria-label={`Status ${s.name}`}
                        disabled={toggling === s.id}
                        onClick={() => toggleActive(s)}
                        className="flex items-center gap-2 disabled:opacity-50"
                      >
                        <span
                          className={`relative h-5 w-9 rounded-full transition ${s.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${s.is_active ? "left-[18px]" : "left-0.5"}`}
                          />
                        </span>
                        <span className={`text-xs font-medium ${s.is_active ? "text-emerald-700" : "text-slate-500"}`}>
                          {s.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </button>
                    </td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <IconButton icon="edit" label={`Edit ${s.name}`} onClick={() => openForm(s)} />
                        <IconButton icon="trash" tone="danger" label={`Hapus ${s.name}`} onClick={() => setDeleting(s)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={formOpen}
        title={editing ? "Edit Layanan" : "Layanan Baru"}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button loading={saving} onClick={() => save()}>
              Simpan
            </Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Nama layanan" required error={errors.name}>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Cuci Setrika"
              className={inputClass}
            />
          </Field>

          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">
              Satuan <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["kg", "Kiloan", "Dihitung per kg"],
                  ["pcs", "Satuan", "Dihitung per pcs"],
                ] as const
              ).map(([v, label, hint]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm({ ...form, unit: v })}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    form.unit === v ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/15" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className={`block text-sm font-semibold ${form.unit === v ? "text-blue-700" : "text-slate-800"}`}>{label}</span>
                  <span className="block text-xs text-slate-500">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`Harga per ${form.unit}`} required error={errors.price}>
              <MoneyInput value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="8.000" />
            </Field>
            <Field label="Estimasi selesai" required error={errors.estimated_days} hint="0 = selesai hari ini">
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={form.estimated_days}
                  onChange={(e) => setForm({ ...form, estimated_days: e.target.value })}
                  className={`${inputClass} pr-12`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                  hari
                </span>
              </div>
            </Field>
          </div>

          <Toggle
            checked={form.is_active}
            onChange={(v) => setForm({ ...form, is_active: v })}
            label="Tampilkan di kasir"
            description="Matikan jika layanan sedang tidak tersedia."
          />
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Hapus layanan?"
        loading={busy}
        onClose={() => setDeleting(null)}
        onConfirm={removeOne}
        message={
          <>
            Layanan <b className="text-slate-900">{deleting?.name}</b> akan dihapus. Riwayat pesanan lama tetap aman.
            Kalau hanya ingin menyembunyikan dari kasir, cukup nonaktifkan.
          </>
        }
      />

      <ConfirmDialog
        open={bulkDelete}
        title={`Hapus ${selected.size} layanan?`}
        confirmLabel={`Hapus ${selected.size} Layanan`}
        loading={busy}
        onClose={() => setBulkDelete(false)}
        onConfirm={removeBulk}
        message="Layanan terpilih akan dihapus. Riwayat pesanan lama tetap aman."
      />
    </>
  );
}
