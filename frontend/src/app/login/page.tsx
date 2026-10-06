"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button, Field, inputClass } from "@/components/ui";
import { Icon } from "@/components/icons";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/pos");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError ? (err.errors?.email?.[0] ?? err.message) : "Gagal masuk. Coba lagi."
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel foto */}
      <section className="relative hidden overflow-hidden lg:block">
        <img src="/hero-laundry.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-blue-900/50 to-blue-900/10" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Icon name="washer" className="h-6 w-6" />
            </span>
            <span className="text-lg font-semibold">Kasir Laundry</span>
          </div>
          <div className="max-w-md">
            <h2 className="text-4xl font-bold leading-tight">Catat, cuci, serahkan. Semua rapi di satu layar.</h2>
            <p className="mt-4 text-blue-100">
              Kasir cepat, status cucian jelas, dan laporan pendapatan siap dibaca kapan saja.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
              {[
                ["pos", "Kasir cepat"],
                ["printer", "Struk & WA"],
                ["reports", "Laporan harian"],
              ].map(([icon, label]) => (
                <div key={label} className="rounded-xl bg-white/10 px-3 py-3 backdrop-blur">
                  <Icon name={icon as "pos"} className="h-5 w-5" />
                  <p className="mt-2 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Icon name="washer" className="h-6 w-6" />
            </span>
            <span className="text-lg font-bold text-slate-900">Kasir Laundry</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Selamat datang kembali</h1>
          <p className="mt-1.5 text-sm text-slate-500">Masuk dengan akun owner untuk membuka kasir.</p>

          {error && (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Email">
              <input
                type="email"
                autoComplete="username"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@laundry.test"
                className={`${inputClass} h-11`}
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} h-11 pr-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                >
                  {showPassword ? "Sembunyikan" : "Lihat"}
                </button>
              </div>
            </Field>
            <Button type="submit" size="lg" loading={submitting} className="w-full">
              Masuk
            </Button>
          </form>

          <p className="mt-8 flex items-center gap-2 text-xs text-slate-400">
            <Icon name="lock" className="h-3.5 w-3.5" />
            Hanya untuk pemilik laundry.
          </p>
        </div>
      </section>
    </main>
  );
}
