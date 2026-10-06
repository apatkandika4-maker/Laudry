"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, errorMessage } from "@/lib/api";
import { formatRupiah, initials, waLink } from "@/lib/format";
import type { BulkDeleteResult, Customer, Paginated } from "@/lib/types";
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
  SearchInput,
  Toggle,
  td,
  th,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { ConfirmDialog } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import CustomerFormModal from "@/components/CustomerForm";

export default function CustomersPage() {
  const toast = useToast();
  const [data, setData] = useState<Paginated<Customer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  // hapus: satu, terpilih, atau semua
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [withOrders, setWithOrders] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [debounced]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), per_page: "15" });
      if (debounced) q.set("search", debounced);
      const res = await apiRequest<Paginated<Customer>>(`/customers?${q}`);
      setData(res);
      const ids = new Set(res.data.map((c) => c.id));
      setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))));
    } catch (err) {
      toast.error(errorMessage(err, "Gagal memuat pelanggan."));
    } finally {
      setLoading(false);
    }
  }, [page, debounced, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageIds = rows.map((c) => c.id);
  const checkedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allChecked = pageIds.length > 0 && checkedOnPage === pageIds.length;
  const selectedRows = rows.filter((c) => selected.has(c.id));
  const selectedOrderCount = selectedRows.reduce((sum, c) => sum + (c.orders_count ?? 0), 0);

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

  function openDelete(kind: "one" | "bulk" | "all", customer?: Customer) {
    setWithOrders(false);
    if (kind === "one" && customer) setDeleting(customer);
    if (kind === "bulk") setBulkOpen(true);
    if (kind === "all") setAllOpen(true);
  }

  function afterDelete(message: string, ok: boolean) {
    if (ok) toast.success(message);
    else toast.error(message);
    setSelected(new Set());
    setDeleting(null);
    setBulkOpen(false);
    setAllOpen(false);
    load();
  }

  async function removeOne() {
    if (!deleting) return;
    setBusy(true);
    try {
      const qs = withOrders ? "?with_orders=1" : "";
      const res = await apiRequest<{ message: string }>(`/customers/${deleting.id}${qs}`, { method: "DELETE" });
      afterDelete(res.message, true);
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menghapus pelanggan."));
    } finally {
      setBusy(false);
    }
  }

  async function removeMany(all: boolean) {
    setBusy(true);
    try {
      const res = await apiRequest<BulkDeleteResult>("/customers/bulk-delete", {
        method: "POST",
        body: all
          ? { all: true, search: debounced || null, with_orders: withOrders }
          : { ids: [...selected], with_orders: withOrders },
      });
      // Jika semua di halaman ini terhapus, kembali ke halaman 1
      if (res.deleted > 0 && page > 1) setPage(1);
      afterDelete(res.message, res.deleted > 0);
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menghapus pelanggan."));
    } finally {
      setBusy(false);
    }
  }

  const oneHasOrders = (deleting?.orders_count ?? 0) > 0;

  return (
    <>
      <PageHeader
        title="Pelanggan"
        description={data ? `${total} pelanggan terdaftar` : "Data pelanggan laundry"}
        actions={
          <>
            <Button
              variant="secondary"
              icon="trash"
              className="text-red-600 hover:bg-red-50"
              disabled={total === 0}
              onClick={() => openDelete("all")}
            >
              {debounced ? "Hapus Semua Hasil Cari" : "Hapus Semua"}
            </Button>
            <Button
              icon="plus"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Tambah Pelanggan
            </Button>
          </>
        }
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nama, no. HP, atau alamat..."
            className="max-w-md"
          />
        </div>

        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button size="sm" variant="danger" icon="trash" onClick={() => openDelete("bulk")}>
            Hapus Terpilih ({selected.size})
          </Button>
        </BulkBar>

        {loading && !data ? (
          <LoadingBlock label="Memuat pelanggan..." />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="customers"
            title={debounced ? "Pelanggan tidak ditemukan" : "Belum ada pelanggan"}
            description={debounced ? "Coba kata kunci lain." : "Pelanggan juga bisa ditambahkan langsung dari layar kasir."}
          />
        ) : (
          <div className={`overflow-x-auto transition ${loading ? "opacity-60" : ""}`}>
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="w-12 py-3 pl-4">
                    <Checkbox
                      label="Pilih semua di halaman ini"
                      checked={allChecked}
                      indeterminate={checkedOnPage > 0 && !allChecked}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className={th}>Pelanggan</th>
                  <th className={th}>No. HP</th>
                  <th className={th}>Alamat</th>
                  <th className={`${th} text-right`}>Pesanan</th>
                  <th className={`${th} text-right`}>Total Belanja</th>
                  <th className={`${th} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`cursor-pointer transition ${selected.has(c.id) ? "bg-blue-50/50" : "hover:bg-slate-50"}`}
                  >
                    <td className="w-12 py-3.5 pl-4">
                      <Checkbox label={`Pilih ${c.name}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {initials(c.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{c.name}</p>
                          {c.notes && <p className="max-w-xs truncate text-xs text-amber-700">⚑ {c.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className={td} onClick={(e) => e.stopPropagation()}>
                      {c.phone ? (
                        <a
                          href={waLink(c.phone, `Halo ${c.name},`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-slate-700 hover:text-emerald-700"
                          title="Chat WhatsApp"
                        >
                          <Icon name="whatsapp" className="h-4 w-4 text-emerald-600" />
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className={`${td} max-w-[220px] truncate text-slate-600`} title={c.address ?? ""}>
                      {c.address || "-"}
                    </td>
                    <td className={`${td} text-right text-slate-700`}>{c.orders_count ?? 0}</td>
                    <td className={`${td} text-right font-medium text-slate-900`}>{formatRupiah(c.orders_total ?? 0)}</td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <IconButton
                          icon="edit"
                          label={`Edit ${c.name}`}
                          onClick={() => {
                            setEditing(c);
                            setFormOpen(true);
                          }}
                        />
                        <IconButton
                          icon="trash"
                          tone="danger"
                          label={`Hapus ${c.name}`}
                          onClick={() => openDelete("one", c)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
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

      <CustomerFormModal
        open={formOpen}
        customer={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
      />

      {/* Hapus satu */}
      <ConfirmDialog
        open={!!deleting}
        title="Hapus pelanggan?"
        loading={busy}
        confirmLabel={oneHasOrders ? "Hapus Pelanggan & Pesanan" : "Hapus"}
        confirmDisabled={oneHasOrders && !withOrders}
        onClose={() => setDeleting(null)}
        onConfirm={removeOne}
        message={
          oneHasOrders ? (
            <>
              <p>
                <b className="text-slate-900">{deleting?.name}</b> punya{" "}
                <b className="text-slate-900">{deleting?.orders_count} riwayat pesanan</b>. Untuk menghapus pelanggan
                ini, riwayat pesanannya harus ikut dihapus.
              </p>
              <div className="mt-4">
                <WithOrdersToggle
                  checked={withOrders}
                  onChange={setWithOrders}
                  label={`Hapus juga ${deleting?.orders_count} riwayat pesanan`}
                />
              </div>
            </>
          ) : (
            <>
              Yakin menghapus <b className="text-slate-900">{deleting?.name}</b>? Data tidak bisa dikembalikan.
            </>
          )
        }
      />

      {/* Hapus terpilih */}
      <ConfirmDialog
        open={bulkOpen}
        title={`Hapus ${selected.size} pelanggan?`}
        confirmLabel={`Hapus ${selected.size} Pelanggan`}
        loading={busy}
        onClose={() => setBulkOpen(false)}
        onConfirm={() => removeMany(false)}
        message={
          <>
            <p>Pelanggan terpilih akan dihapus permanen.</p>
            {selectedOrderCount > 0 && (
              <div className="mt-4 space-y-2">
                <WithOrdersToggle
                  checked={withOrders}
                  onChange={setWithOrders}
                  label={`Hapus juga ${selectedOrderCount} riwayat pesanan`}
                />
                {!withOrders && (
                  <p className="text-xs text-slate-500">Jika tidak dicentang, pelanggan yang punya pesanan dilewati.</p>
                )}
              </div>
            )}
          </>
        }
      />

      {/* Hapus semua */}
      <ConfirmDialog
        open={allOpen}
        title={debounced ? `Hapus semua hasil "${debounced}"?` : "Hapus SEMUA pelanggan?"}
        confirmLabel={`Hapus ${total} Pelanggan`}
        requireText="HAPUS"
        loading={busy}
        onClose={() => setAllOpen(false)}
        onConfirm={() => removeMany(true)}
        message={
          <>
            <p>
              <b className="text-slate-900">{total} pelanggan</b>
              {debounced ? " yang cocok dengan pencarian" : ""} akan dihapus permanen dan tidak bisa dikembalikan.
            </p>
            <div className="mt-4 space-y-2">
              <WithOrdersToggle checked={withOrders} onChange={setWithOrders} label="Hapus juga semua riwayat pesanannya" />
              {!withOrders && (
                <p className="text-xs text-slate-500">Jika tidak dicentang, pelanggan yang punya pesanan dilewati.</p>
              )}
            </div>
          </>
        }
      />
    </>
  );
}

function WithOrdersToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <Toggle
      checked={checked}
      onChange={onChange}
      label={label}
      description="Pesanan & pembayarannya ikut terhapus dan hilang dari laporan."
    />
  );
}
