"use client";

import { useEffect, useRef, useState } from "react";
import CustomerFormModal from "./CustomerForm";
import { Icon } from "./icons";
import { Spinner, inputClass } from "./ui";
import { apiRequest } from "@/lib/api";
import { initials } from "@/lib/format";
import type { Customer, Paginated } from "@/lib/types";

/** Cari & pilih pelanggan, atau tambah pelanggan baru langsung dari kasir. */
export default function CustomerPicker({
  value,
  onChange,
}: {
  value: Customer | null;
  onChange: (c: Customer | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // cari dengan jeda supaya tidak membanjiri server
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiRequest<Paginated<Customer>>(
          `/customers?per_page=6&search=${encodeURIComponent(query.trim())}`
        );
        setResults(res.data);
        setHighlight(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function pick(c: Customer) {
    onChange(c);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const max = results.length; // indeks terakhir = "tambah baru"
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, max));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight < results.length) pick(results[highlight]);
      else setFormOpen(true);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          {initials(value.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{value.name}</p>
          <p className="truncate text-xs text-slate-500">{value.phone || "Tanpa nomor HP"}</p>
          {value.notes && <p className="mt-0.5 truncate text-xs text-amber-700">⚑ {value.notes}</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
        >
          Ganti
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <Icon
        name="user"
        className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
      />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Cari nama / no. HP pelanggan..."
        className={`${inputClass} h-11 pl-10`}
        role="combobox"
        aria-expanded={open}
        aria-controls="customer-results"
      />
      {loading && <Spinner className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />}

      {open && (
        <div
          id="customer-results"
          role="listbox"
          className="animate-fade-in absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          {results.length === 0 && !loading && (
            <p className="px-4 py-3 text-sm text-slate-500">
              {query ? "Pelanggan tidak ditemukan." : "Belum ada pelanggan."}
            </p>
          )}
          {results.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={highlight === i}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(c)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${highlight === i ? "bg-slate-50" : ""}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {initials(c.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">{c.name}</span>
                <span className="block truncate text-xs text-slate-500">{c.phone || "Tanpa nomor HP"}</span>
              </span>
              <span className="text-xs text-slate-400">{c.orders_count ?? 0}× order</span>
            </button>
          ))}
          <button
            type="button"
            onMouseEnter={() => setHighlight(results.length)}
            onClick={() => setFormOpen(true)}
            className={`flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-blue-700 ${highlight === results.length ? "bg-blue-50" : ""}`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <Icon name="plus" className="h-4 w-4" />
            </span>
            {query ? `Tambah pelanggan "${query}"` : "Tambah pelanggan baru"}
          </button>
        </div>
      )}

      <CustomerFormModal
        open={formOpen}
        initialName={query}
        onClose={() => setFormOpen(false)}
        onSaved={(c) => {
          setFormOpen(false);
          pick(c);
        }}
      />
    </div>
  );
}
