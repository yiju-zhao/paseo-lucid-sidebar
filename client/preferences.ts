import { useCallback, useState } from "react";
import { useSettings } from "@getpaseo/plugin/client";
import {
  DEFAULT_PREFERENCES,
  hostSidebar,
  type HostSidebarPreferences,
} from "../shared/preferences";

export interface Preferences {
  values: HostSidebarPreferences;
  update(patch: Partial<HostSidebarPreferences>): void;
  /** Set when the stored preferences cannot be read or saved; the view still works in memory. */
  error: string | null;
}

/** Stored preferences, falling back to in-memory values while they cannot be read. */
export function usePreferences(): Preferences {
  const settings = useSettings(hostSidebar);
  const [local, setLocal] = useState<HostSidebarPreferences>(DEFAULT_PREFERENCES);
  const ready = settings.status === "ready";
  const values = ready ? settings.values : local;

  const update = useCallback(
    (patch: Partial<HostSidebarPreferences>) => {
      if (settings.status === "ready") {
        void settings.save({ ...settings.values, ...patch }, settings.revision);
        return;
      }
      setLocal((current) => ({ ...current, ...patch }));
    },
    [settings],
  );

  let error: string | null = settings.saveError;
  if (settings.status === "error" || settings.status === "invalid") error = settings.error;
  return { values, update, error };
}
