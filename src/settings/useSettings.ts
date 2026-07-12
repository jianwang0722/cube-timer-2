import { useCallback, useEffect, useState } from "react";

export interface Settings {
  theme: "dark" | "light";
  inspectionEnabled: boolean;
  holdMs: number;
  showPreview: boolean;
  inspectionSound: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  inspectionEnabled: false,
  holdMs: 300,
  showPreview: true,
  inspectionSound: false,
};

export const SETTINGS_KEY = "cubetimer.settings.v1";

function sanitize(value: unknown): Settings {
  if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;
  const raw = value as Record<string, unknown>;
  return {
    theme: raw.theme === "light" ? "light" : "dark",
    inspectionEnabled: typeof raw.inspectionEnabled === "boolean"
      ? raw.inspectionEnabled
      : DEFAULT_SETTINGS.inspectionEnabled,
    holdMs:
      typeof raw.holdMs === "number" && raw.holdMs >= 100 && raw.holdMs <= 2000
        ? raw.holdMs
        : DEFAULT_SETTINGS.holdMs,
    showPreview:
      typeof raw.showPreview === "boolean" ? raw.showPreview : DEFAULT_SETTINGS.showPreview,
    inspectionSound:
      typeof raw.inspectionSound === "boolean"
        ? raw.inspectionSound
        : DEFAULT_SETTINGS.inspectionSound,
  };
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw === null) return DEFAULT_SETTINGS;
    return sanitize(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export interface UseSettingsResult {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Persistence is best-effort.
    }
    document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => sanitize({ ...prev, ...patch }));
  }, []);

  return { settings, update };
}
