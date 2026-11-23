import { useEffect, useState } from "react";

// This plugin typechecks without the DOM library. Declare only what this module uses; `fetch` and
// `AbortController` exist on web, Electron and React Native.
declare const fetch: (
  url: string,
  init: { signal: unknown },
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
declare class AbortController {
  readonly signal: unknown;
  abort(): void;
}

/** The default daemon listen address. A daemon on another port is not detected. */
const LOCAL_STATUS_URL = "http://127.0.0.1:6767/api/status";
const TIMEOUT_MS = 3000;

/**
 * Paseo does not tell plugins which host runs on this device, so ask the loopback daemon for its
 * server id. On a phone, or a computer without a local daemon, the request fails and no host is
 * local, which is the correct answer there too.
 */
export function useLocalHostId(): string | null {
  const [serverId, setServerId] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    fetch(LOCAL_STATUS_URL, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        const id = (body as { serverId?: unknown } | null)?.serverId;
        if (typeof id === "string") setServerId(id);
        return undefined;
      })
      .catch(() => undefined)
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);
  return serverId;
}
