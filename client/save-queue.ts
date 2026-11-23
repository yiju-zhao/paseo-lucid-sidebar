/**
 * Optimistic saves against a revisioned document, as a pure state machine.
 *
 * Changes are patch functions, applied in order. Each patch is applied exactly once to a
 * document that does not yet contain it: unsaved patches over the document being saved, or over
 * the stored document when nothing is in flight. A save leaves flight only when it has both
 * succeeded and the stored revision has moved on, in either order: Paseo's `save` stores the new
 * revision before its promise resolves, and nothing here may rely on that order.
 */
export type PatchFn<T> = (values: T) => Partial<T>;

export interface QueueState<T> {
  /** Patches not yet sent. */
  queue: readonly PatchFn<T>[];
  /** The save in progress: its patches, the document it wrote, and the revision it replaced. */
  flight: {
    patches: readonly PatchFn<T>[];
    doc: T;
    revision: string;
    saved: boolean;
  } | null;
  /** The queue and revision a save failed with; retried only after either changes. */
  failed: { queue: readonly PatchFn<T>[]; revision: string } | null;
}

export const emptyQueue = <T>(): QueueState<T> => ({ queue: [], flight: null, failed: null });

const apply = <T>(patches: readonly PatchFn<T>[], base: T): T =>
  patches.reduce((current, patch) => ({ ...current, ...patch(current) }), base);

/** What to show: unsaved patches over the document in flight, or over the stored one. */
export function shown<T>(state: QueueState<T>, stored: T): T {
  return apply(state.queue, state.flight ? state.flight.doc : stored);
}

export function enqueue<T>(state: QueueState<T>, patch: PatchFn<T>): QueueState<T> {
  return { ...state, queue: [...state.queue, patch] };
}

/** The document to save now, and the state while it saves; null when nothing should save. */
export function begin<T>(
  state: QueueState<T>,
  stored: T,
  revision: string,
): { doc: T; next: QueueState<T> } | null {
  if (state.flight || state.queue.length === 0) return null;
  if (state.failed?.queue === state.queue && state.failed.revision === revision) return null;
  const doc = apply(state.queue, stored);
  return {
    doc,
    next: {
      queue: [],
      flight: { patches: state.queue, doc, revision, saved: false },
      failed: null,
    },
  };
}

/** The save finished. A failed save's patches return to the front of the queue. */
export function settle<T>(state: QueueState<T>, saved: boolean, revision: string): QueueState<T> {
  const flight = state.flight;
  if (!flight) return state;
  if (saved) return land({ ...state, flight: { ...flight, saved: true } }, revision);
  const queue = [...flight.patches, ...state.queue];
  return { queue, flight: null, failed: { queue, revision } };
}

/** The stored revision is now `revision`; a saved flight whose write arrived leaves. */
export function land<T>(state: QueueState<T>, revision: string): QueueState<T> {
  const flight = state.flight;
  if (!flight?.saved || flight.revision === revision) return state;
  return { ...state, flight: null };
}
