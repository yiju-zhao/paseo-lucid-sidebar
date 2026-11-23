import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * Transient view state: the one open inline menu, the workspace being renamed, and expanded
 * "Show more" lists. Rows subscribe to their own slice, so opening a menu re-renders only the
 * rows whose answer changed, not the whole list.
 */
interface UiSnapshot {
  menu: string | null;
  renaming: string | null;
  expanded: ReadonlySet<string>;
}

class UiStore {
  private snapshot: UiSnapshot = { menu: null, renaming: null, expanded: new Set() };
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get = () => this.snapshot;

  private set(patch: Partial<UiSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }

  setMenu = (menu: string | null) => this.set({ menu });
  setRenaming = (renaming: string | null) => this.set({ renaming });
  toggleExpanded = (key: string) => {
    const expanded = new Set(this.snapshot.expanded);
    if (!expanded.delete(key)) expanded.add(key);
    this.set({ expanded });
  };
}

const UiContext = createContext<UiStore | null>(null);

export function UiStateProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => new UiStore(), []);
  return <UiContext.Provider value={store}>{children}</UiContext.Provider>;
}

function useStore(): UiStore {
  const store = useContext(UiContext);
  if (!store) throw new Error("UiStateProvider is missing");
  return store;
}

function useSlice<T>(select: (snapshot: UiSnapshot) => T): T {
  const store = useStore();
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(store.get()),
  );
}

/** An inline menu identified by `key`; opening it closes any other. */
export function useMenu(key: string) {
  const store = useStore();
  const open = useSlice((snapshot) => snapshot.menu === key);
  const toggle = useCallback(
    () => store.setMenu(store.get().menu === key ? null : key),
    [store, key],
  );
  const show = useCallback(() => store.setMenu(key), [store, key]);
  return { open, toggle, show, close: useCloseMenu() };
}

export function useCloseMenu() {
  const store = useStore();
  return useCallback(() => store.setMenu(null), [store]);
}

export function useRenaming(key: string) {
  const store = useStore();
  const renaming = useSlice((snapshot) => snapshot.renaming === key);
  const start = useCallback(() => store.setRenaming(key), [store, key]);
  const stop = useCallback(() => store.setRenaming(null), [store]);
  return { renaming, start, stop };
}

/** Expanded show-more lists, for the list model. */
export function useExpanded(): ReadonlySet<string> {
  return useSlice((snapshot) => snapshot.expanded);
}

export function useToggleExpanded(): (key: string) => void {
  return useStore().toggleExpanded;
}
