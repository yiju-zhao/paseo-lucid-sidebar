import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@getpaseo/plugin/client";
import {
  DEFAULT_PREFERENCES,
  sidebarSettings,
  type SidebarPreferences,
} from "../shared/preferences";
import {
  begin,
  emptyQueue,
  enqueue,
  land,
  settle,
  shown,
  type PatchFn,
  type QueueState,
} from "./save-queue";

type Patch = Partial<SidebarPreferences>;

export interface Preferences {
  /** The stored document has not been read yet; render nothing that writes it. */
  loading: boolean;
  values: SidebarPreferences;
  /** A patch, or a function of the latest values returning one. */
  update(patch: Patch | PatchFn<SidebarPreferences>): void;
  /** Set when the stored preferences cannot be read or saved; the view still works in memory. */
  error: string | null;
}

/** Stored preferences with optimistic updates; client/save-queue.ts holds the rules. */
export function usePreferences(): Preferences {
  const settings = useSettings(sidebarSettings);
  const ready = settings.status === "ready";
  const revision = ready ? settings.revision : null;
  const stored = ready ? settings.values : DEFAULT_PREFERENCES;
  const [state, setState] = useState<QueueState<SidebarPreferences>>(emptyQueue);
  const latestRevision = useRef(revision);
  latestRevision.current = revision;

  const values = useMemo(() => shown(state, stored), [state, stored]);

  useEffect(() => {
    if (revision !== null) setState((current) => land(current, revision));
  }, [revision]);

  useEffect(() => {
    if (settings.status !== "ready") return;
    const started = begin(state, settings.values, settings.revision);
    if (!started) return;
    // Patches queued since this render stay queued behind the save.
    const sent = state.queue.length;
    setState((current) => ({ ...started.next, queue: current.queue.slice(sent) }));
    void settings.save(started.doc, settings.revision).then((saved) => {
      setState((current) => settle(current, saved, latestRevision.current ?? ""));
      return undefined;
    });
  }, [state, settings]);

  const update = useCallback((patch: Patch | PatchFn<SidebarPreferences>) => {
    setState((current) => enqueue(current, typeof patch === "function" ? patch : () => patch));
  }, []);

  let error: string | null = settings.saveError;
  if (settings.status === "error" || settings.status === "invalid") error = settings.error;
  const loading = settings.status === "loading";
  return useMemo(() => ({ loading, values, update, error }), [loading, values, update, error]);
}
