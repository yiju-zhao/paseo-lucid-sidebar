import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getPaseoClient, useHosts } from "@getpaseo/plugin/client";

/**
 * Data the built-in sidebar shows but plugin snapshots leave out: project keys and custom names,
 * and each workspace's pull request, checks and running service. Read from each online host's raw
 * Paseo API: one project list and one owned workspace subscription per host.
 */

type PaseoApi = ReturnType<typeof getPaseoClient>;
type WorkspaceList = Awaited<ReturnType<PaseoApi["workspaces"]["list"]>>;
type RawWorkspace = WorkspaceList["entries"][number];
type ProjectList = Awaited<ReturnType<PaseoApi["projects"]["list"]>>;
type RawProject = ProjectList["projects"][number];

export interface ProjectInfo {
  projectKey: string | null;
  customName: string | null;
}

export type PullRequestState = "open" | "merged" | "closed";

export interface PullRequestHint {
  url: string;
  number: number | null;
  state: PullRequestState;
}

export interface CheckSummary {
  state: "passed" | "failed" | "running";
  completed: number;
  total: number;
}

export interface ServiceHint {
  name: string;
  healthy: boolean;
}

export interface WorkspaceRuntime {
  pullRequest: PullRequestHint | null;
  checks: CheckSummary | null;
  service: ServiceHint | null;
}

const EMPTY: WorkspaceRuntime = { pullRequest: null, checks: null, service: null };

function pullRequestOf(workspace: RawWorkspace): PullRequestHint | null {
  const pr = workspace.githubRuntime?.pullRequest;
  if (!pr) return null;
  const parsed = /\/(?:pull|pulls|merge_requests)\/(\d+)/.exec(pr.url);
  const number = pr.number ?? (parsed ? Number(parsed[1]) : null);
  const state: PullRequestState = pr.isMerged
    ? "merged"
    : pr.state.toLowerCase() === "open"
      ? "open"
      : "closed";
  return { url: pr.url, number, state };
}

function checksOf(workspace: RawWorkspace): CheckSummary | null {
  const pr = workspace.githubRuntime?.pullRequest;
  if (!pr) return null;
  if (pr.checks && pr.checks.length > 0) {
    let completed = 0;
    let failed = false;
    for (const check of pr.checks) {
      if (check.status === "failure" || check.status === "cancelled") failed = true;
      if (check.status !== "pending") completed += 1;
    }
    const total = pr.checks.length;
    if (failed) return { state: "failed", completed: total, total };
    if (completed === total) return { state: "passed", completed, total };
    return { state: "running", completed, total };
  }
  switch (pr.checksStatus) {
    case "success":
      return { state: "passed", completed: 1, total: 1 };
    case "failure":
      return { state: "failed", completed: 1, total: 1 };
    case "pending":
      return { state: "running", completed: 0, total: 1 };
    default:
      return null;
  }
}

function serviceOf(workspace: RawWorkspace): ServiceHint | null {
  const running = (workspace.scripts ?? []).filter(
    (script) => script.lifecycle === "running" && (script.type ?? "service") === "service",
  );
  const pick = running.find((script) => script.health === "unhealthy") ?? running[0];
  return pick ? { name: pick.scriptName, healthy: pick.health !== "unhealthy" } : null;
}

function runtimeOf(workspace: RawWorkspace): WorkspaceRuntime {
  return {
    pullRequest: pullRequestOf(workspace),
    checks: checksOf(workspace),
    service: serviceOf(workspace),
  };
}

function sameRuntime(a: WorkspaceRuntime, b: WorkspaceRuntime): boolean {
  return (
    a.pullRequest?.url === b.pullRequest?.url &&
    a.pullRequest?.state === b.pullRequest?.state &&
    a.pullRequest?.number === b.pullRequest?.number &&
    a.checks?.state === b.checks?.state &&
    a.checks?.completed === b.checks?.completed &&
    a.checks?.total === b.checks?.total &&
    a.service?.name === b.service?.name &&
    a.service?.healthy === b.service?.healthy
  );
}

const entryKey = (hostId: string, id: string) => `${hostId}:${id}`;

class RuntimeStore {
  private projects = new Map<string, ProjectInfo>();
  private workspaces = new Map<string, WorkspaceRuntime>();
  /** Bumped when project info changes, so view keys are recomputed. */
  private projectRevision = 0;
  private duplicates = new Set<string>();
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    for (const listener of this.listeners) listener();
  }

  getProjectRevision = () => this.projectRevision;

  project(hostId: string, projectId: string): ProjectInfo | null {
    return this.projects.get(entryKey(hostId, projectId)) ?? null;
  }

  /**
   * The built-in sidebar's project identity: the project key, which merges one repository across
   * hosts, unless it is missing or shared by two projects on one host.
   */
  viewKey(hostId: string, projectId: string): string {
    const projectKey = this.project(hostId, projectId)?.projectKey;
    if (projectKey && !this.duplicates.has(entryKey(hostId, projectKey))) return projectKey;
    return JSON.stringify([hostId, projectId]);
  }

  private recountDuplicates() {
    const counts = new Map<string, number>();
    for (const [key, info] of this.projects) {
      if (!info.projectKey) continue;
      const hostId = key.slice(0, key.indexOf(":"));
      const id = entryKey(hostId, info.projectKey);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    this.duplicates = new Set([...counts].filter(([, count]) => count > 1).map(([id]) => id));
  }

  workspace(hostId: string, id: string): WorkspaceRuntime {
    return this.workspaces.get(entryKey(hostId, id)) ?? EMPTY;
  }

  setProjects(hostId: string, projects: readonly RawProject[]) {
    const prefix = `${hostId}:`;
    let changed = false;
    const seen = new Set<string>();
    for (const project of projects) {
      const key = entryKey(hostId, project.projectId);
      seen.add(key);
      const next: ProjectInfo = {
        projectKey: project.projectKey ?? null,
        customName: project.projectCustomName ?? null,
      };
      const current = this.projects.get(key);
      if (current?.projectKey === next.projectKey && current.customName === next.customName)
        continue;
      this.projects.set(key, next);
      changed = true;
    }
    for (const key of [...this.projects.keys()])
      if (key.startsWith(prefix) && !seen.has(key)) {
        this.projects.delete(key);
        changed = true;
      }
    if (changed) {
      this.recountDuplicates();
      this.projectRevision += 1;
      this.emit();
    }
  }

  setWorkspaces(hostId: string, workspaces: readonly RawWorkspace[], replace: boolean) {
    const prefix = `${hostId}:`;
    let changed = false;
    const seen = new Set<string>();
    for (const workspace of workspaces) {
      const key = entryKey(hostId, workspace.id);
      seen.add(key);
      changed = this.put(key, runtimeOf(workspace)) || changed;
    }
    if (replace)
      for (const key of [...this.workspaces.keys()])
        if (key.startsWith(prefix) && !seen.has(key)) {
          this.workspaces.delete(key);
          changed = true;
        }
    if (changed) this.emit();
  }

  removeWorkspace(hostId: string, id: string) {
    if (this.workspaces.delete(entryKey(hostId, id))) this.emit();
  }

  dropHost(hostId: string) {
    const prefix = `${hostId}:`;
    let changed = false;
    for (const map of [this.projects, this.workspaces] as Map<string, unknown>[])
      for (const key of [...map.keys()])
        if (key.startsWith(prefix)) {
          map.delete(key);
          changed = true;
        }
    if (changed) {
      this.recountDuplicates();
      this.projectRevision += 1;
      this.emit();
    }
  }

  private put(key: string, next: WorkspaceRuntime): boolean {
    const current = this.workspaces.get(key);
    if (current && sameRuntime(current, next)) return false;
    this.workspaces.set(key, next);
    return true;
  }
}

const RuntimeContext = createContext<RuntimeStore | null>(null);

function watchHost(store: RuntimeStore, hostId: string, watchWorkspaces: boolean): () => void {
  const api = getPaseoClient(hostId);
  let stopped = false;
  const cleanups: (() => void)[] = [];
  const report = (what: string) => (error: unknown) => {
    if (!stopped) console.warn(`[workspace sidebar] ${what} failed on ${hostId}`, error);
  };

  let projectTimer: ReturnType<typeof setTimeout> | null = null;
  const loadProjects = () => {
    api.projects
      .list()
      .then((result) => {
        if (!stopped) store.setProjects(hostId, result.projects);
        return undefined;
      })
      .catch(report("Project list"));
  };
  loadProjects();
  cleanups.push(
    api.projects.subscribe(() => {
      if (projectTimer) clearTimeout(projectTimer);
      projectTimer = setTimeout(loadProjects, 250);
    }),
  );
  cleanups.push(() => {
    if (projectTimer) clearTimeout(projectTimer);
  });

  if (watchWorkspaces) {
    api.workspaces
      .list({ subscribe: {}, page: { limit: 200 } })
      .then(async (result) => {
        const subscription = result.subscription;
        if (stopped) {
          void subscription.release().catch(report("Workspace subscription release"));
          return undefined;
        }
        cleanups.push(() => {
          void subscription.release().catch(report("Workspace subscription release"));
        });
        store.setWorkspaces(hostId, result.entries, false);
        cleanups.push(
          subscription.subscribe({
            snapshot: (snapshot) => store.setWorkspaces(hostId, snapshot.entries, false),
            update: (message) => {
              if (message.type !== "workspace_update") return;
              const payload = message.payload;
              if (payload.kind === "upsert")
                store.setWorkspaces(hostId, [payload.workspace], false);
              else store.removeWorkspace(hostId, payload.id);
            },
          }),
        );
        // Later pages fill in hosts with more than one page of workspaces.
        let cursor = result.pageInfo.hasMore ? result.pageInfo.nextCursor : null;
        while (cursor && !stopped) {
          const page = await api.workspaces.list({ page: { limit: 200, cursor } });
          if (stopped) break;
          store.setWorkspaces(hostId, page.entries, false);
          cursor = page.pageInfo.hasMore ? page.pageInfo.nextCursor : null;
        }
        return undefined;
      })
      .catch(report("Workspace subscription"));
  }

  return () => {
    stopped = true;
    for (const cleanup of cleanups.splice(0)) cleanup();
    store.dropHost(hostId);
  };
}

export function RuntimeProvider({
  watchWorkspaces,
  children,
}: {
  /** Off when no row item needs pull request, checks or service data. */
  watchWorkspaces: boolean;
  children: ReactNode;
}) {
  const store = useMemo(() => new RuntimeStore(), []);
  const hosts = useHosts();
  const online = hosts
    .filter((host) => host.status === "online")
    .map((host) => host.serverId)
    .sort()
    .join("\n");

  useEffect(() => {
    if (!online) return undefined;
    const stops = online.split("\n").map((hostId) => {
      try {
        return watchHost(store, hostId, watchWorkspaces);
      } catch (error) {
        // A host without a usable client leaves its rows without PR and project data.
        console.warn(`[workspace sidebar] Cannot watch ${hostId}`, error);
        return () => undefined;
      }
    });
    return () => {
      for (const stop of stops) stop();
    };
  }, [store, online, watchWorkspaces]);

  return <RuntimeContext.Provider value={store}>{children}</RuntimeContext.Provider>;
}

function useStore(): RuntimeStore {
  const store = useContext(RuntimeContext);
  if (!store) throw new Error("RuntimeProvider is missing");
  return store;
}

export function useWorkspaceRuntime(hostId: string, id: string): WorkspaceRuntime {
  const store = useStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.workspace(hostId, id),
    () => store.workspace(hostId, id),
  );
}

/**
 * Project info and view keys. The returned object changes identity whenever project info
 * changes, so memoized view keys recompute.
 */
export interface ProjectDirectory {
  info(hostId: string, projectId: string): ProjectInfo | null;
  viewKey(hostId: string, projectId: string): string;
}

export function useProjectDirectory(): ProjectDirectory {
  const store = useStore();
  const revision = useSyncExternalStore(
    store.subscribe,
    store.getProjectRevision,
    store.getProjectRevision,
  );
  return useMemo(
    () => ({
      info: (hostId: string, projectId: string) => store.project(hostId, projectId),
      viewKey: (hostId: string, projectId: string) => store.viewKey(hostId, projectId),
    }),
    // The revision is the change signal for the store's contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );
}
