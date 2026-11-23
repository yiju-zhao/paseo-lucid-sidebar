import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@getpaseo/plugin/client";
import {
  DEFAULT_PREFERENCES,
  sidebarSettings,
  type SidebarPreferences,
} from "../shared/preferences";

type Patch = Partial<SidebarPreferences>;
type PatchFn = (values: SidebarPreferences) => Patch;

export interface Preferences {
  /** The stored document has not been read yet; render nothing that writes it. */
  loading: boolean;
  values: SidebarPreferences;
  /** A patch, or a function of the latest values returning one. */
  update(patch: Patch | PatchFn): void;
  /** Set when the stored preferences cannot be read or saved; the view still works in memory. */
  error: string | null;
}

/**
 * Stored preferences with optimistic updates. Changes queue as patches over the stored values,
 * so a change made during a save, or after another surface saved, applies to the newest
 * document. One save runs at a time against the displayed revision; acknowledged patches leave
 * the queue once that save's new revision arrives.
 */
export function usePreferences(): Preferences {
  const settings = useSettings(sidebarSettings);
  const ready = settings.status === "ready";
  const revision = ready ? settings.revision : null;
  const base = ready ? settings.values : DEFAULT_PREFERENCES;
  const [queue, setQueue] = useState<readonly PatchFn[]>([]);
  const [saving, setSaving] = useState(false);
  const acked = useRef<{ count: number; revision: string } | null>(null);
  const failed = useRef<{ queue: readonly PatchFn[]; revision: string } | null>(null);

  const values = useMemo(
    () => queue.reduce((current, patch) => ({ ...current, ...patch(current) }), base),
    [queue, base],
  );

  // The saved revision arrived: its patches are now part of the stored values.
  useEffect(() => {
    const done = acked.current;
    if (!done || revision === null || revision === done.revision) return;
    acked.current = null;
    setQueue((current) => current.slice(done.count));
  }, [revision]);

  useEffect(() => {
    if (!ready || saving || acked.current || queue.length === 0) return;
    // A failed save retries only after the queue or the stored document changes.
    if (failed.current?.queue === queue && failed.current.revision === settings.revision) return;
    const attempt = { count: queue.length, revision: settings.revision };
    setSaving(true);
    void settings.save(values, settings.revision).then((saved) => {
      if (saved) acked.current = attempt;
      else failed.current = { queue, revision: attempt.revision };
      setSaving(false);
      return undefined;
    });
  }, [ready, saving, queue, values, settings]);

  const update = useCallback((patch: Patch | PatchFn) => {
    setQueue((current) => [...current, typeof patch === "function" ? patch : () => patch]);
  }, []);

  let error: string | null = settings.saveError;
  if (settings.status === "error" || settings.status === "invalid") error = settings.error;
  const loading = settings.status === "loading";
  return useMemo(() => ({ loading, values, update, error }), [loading, values, update, error]);
}
