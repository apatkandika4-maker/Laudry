"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { Button, Field, inputClass } from "./ui";
import { useToast } from "./Toast";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/api";
import type { Customer } from "@/lib/types";

type FormState = { name: string; phone: string; address: string; notes: string };

/** Form tambah / edit pelanggan (dipakai di Kasir & halaman Pelanggan). */
export default function CustomerFormModal({
  open,
  customer,
  initialName = "",
  onClose,
  onSaved,
}: {
  open: boolean;
  customer?: Customer | null;
  initialName?: string;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>({ name: "", phone: "", address: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      customer
        ? {
            name: customer.name,
            phone: customer.phone ?? "",
            address: customer.address ?? "",
            notes: customer.notes ?? "",
          }
        : { name: initialName, phone: "", address: "", notes: "" }
    );
  }, [open, customer, initialName]);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setErrors({});
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    };
    try {
      const saved = customer
        ? await apiRequest<Customer>(`/customers/${customer.id}`, { method: "PUT", body })
        : await apiRequest<Customer>("/customers", { method: "POST", body });
      toast.success(customer ? "Data pelanggan diperbarui." : `Pelanggan ${saved.name} ditambahkan.`);
      onSaved(saved);
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else toast.error(errorMessage(err, "Gagal menyimpan pelanggan."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={customer ? "Edit Pelanggan" : "Pelanggan Baru"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button loading={saving} onClick={() => save()}>
            Simpan
          </Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <Field label="Nama" required error={errors.name}>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Contoh: Budi Santoso"
            className={inputClass}
          />
        </Field>
        <Field label="No. HP / WhatsApp" error={errors.phone} hint="Dipakai untuk kirim struk & kabar cucian siap.">
          <input
            value={form.phone}
            inputMode="tel"
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="0812xxxxxxxx"
            className={inputClass}
          />
        </Field>
        <Field label="Alamat" error={errors.address}>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Untuk antar jemput (opsional)"
            className={inputClass}
          />
        </Field>
        <Field label="Catatan" error={errors.notes}>
          <textarea
            value={form.notes}
            rows={2}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Contoh: alergi pewangi, pakaian harus digantung"
            className={`${inputClass} h-auto resize-none py-2.5`}
          />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
