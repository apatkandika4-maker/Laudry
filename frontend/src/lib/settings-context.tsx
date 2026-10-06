"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest } from "./api";
import type { Settings } from "./types";

interface SettingsContextValue {
  settings: Settings | null;
  setSettings: (s: Settings) => void;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

/** Profil toko (nama, alamat, HP, catatan struk) untuk tampilan & struk. */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  const reload = useCallback(async () => {
    try {
      setSettings(await apiRequest<Settings>("/settings"));
    } catch {
      // abaikan: tampilan tetap jalan dengan nilai default
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings, reload }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings harus dipakai di dalam SettingsProvider");
  return ctx;
}
