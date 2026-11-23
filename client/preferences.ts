import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@getpaseo/plugin/client";
import {
  DEFAULT_PREFERENCES,
  sidebarSettings,
  type SidebarPreferences,
} from "../shared/preferences";

type Patch = Partial<SidebarPreferences>;

export interface Preferences {
  values: SidebarPreferences;
  /** A patch, or a function of the latest values returning one. */
  update(patch: Patch | ((values: SidebarPreferences) => Patch)): void;
  /** Set when the stored preferences cannot be read or saved; the view still works in memory. */
  error: string | null;
}

/**
 * Stored preferences with optimistic updates. Saves are revision checked, so changes made while
 * a save is in flight wait for the new revision and are then saved together.
 */
export function usePreferences(): Preferences {
  const settings = useSettings(sidebarSettings);
  const ready = settings.status === "ready";
  const [optimistic, setOptimistic] = useState<SidebarPreferences | null>(null);
  const stored = ready ? settings.values : DEFAULT_PREFERENCES;
  const values = optimistic ?? stored;
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const inFlight = useRef(false);
  const pending = useRef<SidebarPreferences | null>(null);

  const flush = useCallback(() => {
    if (settings.status !== "ready" || inFlight.current || !pending.current) return;
    const next = pending.current;
    pending.current = null;
    inFlight.current = true;
    void settings.save(next, settings.revision).then((saved) => {
      inFlight.current = false;
      if (!saved && !pending.current) setOptimistic(null);
      return undefined;
    });
  }, [settings]);

  // A new revision means the last save landed; save anything queued behind it.
  useEffect(() => {
    if (pending.current) flush();
    else if (!inFlight.current) setOptimistic(null);
  }, [ready, ready ? settings.revision : null, flush]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback<Preferences["update"]>(
    (patch) => {
      const current = valuesRef.current;
      const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
      valuesRef.current = next;
      setOptimistic(next);
      pending.current = next;
      flush();
    },
    [flush],
  );

  let error: string | null = settings.saveError;
  if (settings.status === "error" || settings.status === "invalid") error = settings.error;
  return useMemo(() => ({ values, update, error }), [values, update, error]);
}
