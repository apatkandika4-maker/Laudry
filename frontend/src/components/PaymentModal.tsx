"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { Button, Field, MoneyInput } from "./ui";
import { Icon } from "./icons";
import { formatRupiah } from "@/lib/format";
import type { PaymentInput } from "@/lib/types";

type PayType = "lunas" | "dp" | "nanti";

/** Usulan nominal uang tunai: pas + pembulatan ke atas. */
function cashSuggestions(amount: number): number[] {
  if (amount <= 0) return [];
  const steps = [5000, 10000, 20000, 50000, 100000];
  const values = new Set<number>([amount]);
  for (const s of steps) {
    const v = Math.ceil(amount / s) * s;
    if (v > amount) values.add(v);
  }
  return [...values].sort((a, b) => a - b).slice(0, 5);
}

/**
 * Modal pembayaran tunai.
 * - mode "checkout": dari kasir, bisa Lunas / DP / Bayar Nanti.
 * - mode "settle": pelunasan pesanan, nominal default = sisa tagihan.
 */
export default function PaymentModal({
  open,
  mode,
  amountDue,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "checkout" | "settle";
  amountDue: number;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payment: PaymentInput | null) => void;
}) {
  const [type, setType] = useState<PayType>("lunas");
  const [amount, setAmount] = useState<number | "">("");
  const [received, setReceived] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType("lunas");
    setAmount(mode === "settle" ? amountDue : Math.round(amountDue / 2 / 1000) * 1000 || "");
    setReceived("");
    setError(null);
  }, [open, mode, amountDue]);

  const payAmount = type === "lunas" ? amountDue : type === "nanti" ? 0 : Number(amount || 0);
  const receivedValue = received === "" ? payAmount : received;
  const change = receivedValue - payAmount;
  const remainingAfter = Math.max(amountDue - payAmount, 0);
  const suggestions = useMemo(() => cashSuggestions(payAmount), [payAmount]);

  function submit() {
    setError(null);
    if (type === "nanti") return onSubmit(null);
    if (payAmount <= 0) return setError("Nominal bayar harus lebih dari 0.");
    if (payAmount > amountDue) return setError(`Nominal melebihi tagihan ${formatRupiah(amountDue)}.`);
    if (type === "dp" && payAmount >= amountDue && mode === "checkout") {
      return setError("Nominal DP harus kurang dari total. Pilih Lunas jika dibayar penuh.");
    }
    if (receivedValue < payAmount) return setError("Uang diterima kurang dari nominal bayar.");
    onSubmit({ amount: payAmount, method: "tunai", received: receivedValue });
  }

  const typeOptions: { value: PayType; label: string; hint: string }[] =
    mode === "checkout"
      ? [
          { value: "lunas", label: "Lunas", hint: "Bayar penuh" },
          { value: "dp", label: "DP", hint: "Bayar sebagian" },
          { value: "nanti", label: "Bayar Nanti", hint: "Saat diambil" },
        ]
      : [
          { value: "lunas", label: "Lunasi", hint: "Bayar sisa" },
          { value: "dp", label: "Sebagian", hint: "Cicil" },
        ];

  return (
    <Modal
      open={open}
      title={mode === "checkout" ? "Pembayaran" : "Pelunasan"}
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="success"
            size="lg"
            icon="check"
            loading={submitting}
            onClick={submit}
            className="sm:min-w-48"
          >
            {type === "nanti" ? "Simpan Pesanan" : `Bayar ${formatRupiah(payAmount)}`}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-5"
      >
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 px-5 py-4 text-white">
          <p className="text-sm text-blue-100">{mode === "checkout" ? "Total tagihan" : "Sisa tagihan"}</p>
          <p className="mt-0.5 text-3xl font-bold tracking-tight">{formatRupiah(amountDue)}</p>
        </div>

        <div className={`grid gap-2 ${typeOptions.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {typeOptions.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                type === t.value
                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/15"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className={`block text-sm font-semibold ${type === t.value ? "text-blue-700" : "text-slate-800"}`}>
                {t.label}
              </span>
              <span className="block text-xs text-slate-500">{t.hint}</span>
            </button>
          ))}
        </div>

        {type !== "nanti" && (
          <>
            {type === "dp" && (
              <Field label={mode === "checkout" ? "Nominal DP" : "Nominal dibayar"} required>
                <MoneyInput value={amount} onChange={setAmount} autoFocus />
              </Field>
            )}

            {payAmount > 0 && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <Field label="Uang diterima">
                  <MoneyInput
                    value={received}
                    onChange={setReceived}
                    placeholder={new Intl.NumberFormat("id-ID").format(payAmount)}
                    autoFocus={type === "lunas"}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setReceived(v)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        receivedValue === v
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                      }`}
                    >
                      {i === 0 ? "Uang pas" : formatRupiah(v)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                  <span className="text-sm text-slate-600">Kembalian</span>
                  <span className={`text-xl font-bold ${change < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {change < 0 ? `Kurang ${formatRupiah(-change)}` : formatRupiah(change)}
                  </span>
                </div>
              </div>
            )}

            {type === "dp" && payAmount > 0 && remainingAfter > 0 && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Sisa <b>{formatRupiah(remainingAfter)}</b> tercatat di nota yang sama dan dilunasi saat cucian diambil
                (menu Pesanan → Pelunasan). Tidak perlu membuat transaksi baru.
              </p>
            )}
          </>
        )}

        {type === "nanti" && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Pesanan disimpan dengan status <b>Belum Bayar</b>. Pembayaran diterima nanti dari menu Pesanan.
          </p>
        )}

        {error && (
          <p className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <Icon name="alert" className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
