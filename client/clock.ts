import { useSyncExternalStore } from "react";

/**
 * One shared minute clock for relative times. It ticks only while something reads it, and only
 * the readers re-render.
 */
const TICK_MS = 30_000;
let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const notify of listeners) notify();
    }, TICK_MS);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const read = () => now;

export function useNow(): number {
  return useSyncExternalStore(subscribe, read, read);
}
