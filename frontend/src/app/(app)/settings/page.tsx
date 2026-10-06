"use client";

import { useEffect, useState } from "react";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { addDays, toISODate } from "@/lib/format";
import type { Order, Settings, User } from "@/lib/types";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { Receipt } from "@/components/Receipt";
import { useToast } from "@/components/Toast";

const SAMPLE_ORDER: Order = {
  id: 0,
  invoice_code: "INV-000000-0001",
  customer_id: 0,
  customer: { id: 0, name: "Contoh Pelanggan", phone: "081234567890", address: null, notes: null },
  subtotal: "28000",
  discount: "0",
  total: "28000",
  paid_amount: "28000",
  payment_status: "lunas",
  status: "diterima",
  note: null,
  due_date: toISODate(addDays(new Date(), 2)),
  picked_up_at: null,
  created_at: new Date().toISOString(),
  items: [
    { id: 1, service_id: null, service_name: "Cuci Setrika", unit: "kg", price: "8000", quantity: "3.5", subtotal: "28000" },
  ],
  payments: [
    { id: 1, amount: "28000", method: "tunai", received: "30000", note: null, created_at: new Date().toISOString() },
  ],
};

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: IconName;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Pengaturan" description="Profil toko yang tampil di struk, serta akun owner." />
      <div className="space-y-6">
        <StoreSettings />
        <div className="grid gap-6 xl:grid-cols-2">
          <ProfileSettings />
          <PasswordSettings />
        </div>
      </div>
    </>
  );
}

function StoreSettings() {
  const toast = useToast();
  const { settings, setSettings } = useSettings();
  const [form, setForm] = useState({ store_name: "", address: "", phone: "", receipt_footer: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForm({
      store_name: settings.store_name ?? "",
      address: settings.address ?? "",
      phone: settings.phone ?? "",
      receipt_footer: settings.receipt_footer ?? "",
    });
  }, [settings]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const res = await apiRequest<{ setting: Settings; message: string }>("/settings", {
        method: "PUT",
        body: {
          store_name: form.store_name.trim(),
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          receipt_footer: form.receipt_footer.trim() || null,
        },
      });
      setSettings(res.setting);
      toast.success(res.message);
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else toast.error(errorMessage(err, "Gagal menyimpan pengaturan."));
    } finally {
      setSaving(false);
    }
  }

  const preview: Settings = {
    id: settings?.id ?? 1,
    store_name: form.store_name || "Nama Toko",
    address: form.address || null,
    phone: form.phone || null,
    receipt_footer: form.receipt_footer || null,
  };

  return (
    <Section icon="store" title="Profil toko" description="Tampil di menu samping dan di setiap struk.">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={save} className="space-y-4">
          <Field label="Nama toko" required error={errors.store_name}>
            <input
              value={form.store_name}
              onChange={(e) => setForm({ ...form, store_name: e.target.value })}
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="No. HP / WhatsApp toko" error={errors.phone}>
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
                placeholder="Jl. ..."
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Catatan di bawah struk" error={errors.receipt_footer} hint="Misalnya ucapan terima kasih atau ketentuan pengambilan.">
            <textarea
              rows={3}
              value={form.receipt_footer}
              onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
              className={`${inputClass} h-auto resize-none py-2.5`}
            />
          </Field>
          <Button type="submit" loading={saving}>
            Simpan Profil Toko
          </Button>
        </form>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pratinjau struk</p>
          <div className="rounded-2xl bg-slate-100 p-4">
            <div className="mx-auto w-[240px] rounded-sm bg-white px-4 py-5 shadow-md">
              <Receipt order={SAMPLE_ORDER} settings={preview} />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ProfileSettings() {
  const toast = useToast();
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const res = await apiRequest<{ user: User; message: string }>("/profile", {
        method: "PUT",
        body: { name: form.name.trim(), email: form.email.trim() },
      });
      setUser(res.user);
      toast.success(res.message);
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else toast.error(errorMessage(err, "Gagal memperbarui profil."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section icon="user" title="Akun owner" description="Nama dan email untuk masuk ke aplikasi.">
      <form onSubmit={save} className="space-y-4">
        <Field label="Nama" required error={errors.name}>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Button type="submit" loading={saving}>
          Simpan Akun
        </Button>
      </form>
    </Section>
  );
}

function PasswordSettings() {
  const toast = useToast();
  const [form, setForm] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const res = await apiRequest<{ message: string }>("/profile/password", { method: "PUT", body: form });
      toast.success(res.message);
      setForm({ current_password: "", password: "", password_confirmation: "" });
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else toast.error(errorMessage(err, "Gagal mengganti password."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section icon="lock" title="Ganti password" description="Gunakan minimal 8 karakter.">
      <form onSubmit={save} className="space-y-4">
        <Field label="Password lama" required error={errors.current_password}>
          <input
            type="password"
            autoComplete="current-password"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password baru" required error={errors.password}>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Ulangi password baru" required>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password_confirmation}
              onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
        <Button type="submit" variant="secondary" loading={saving}>
          Ganti Password
        </Button>
      </form>
    </Section>
  );
}
