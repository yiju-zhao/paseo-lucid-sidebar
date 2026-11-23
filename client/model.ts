import type { PluginWorkspaceSnapshot, WorkspaceIndicator } from "@getpaseo/plugin";
import type { SidebarPreferences, Sort, TitleSource } from "../shared/preferences";

/** Pure workspace rules: ordering, visibility and formatting. No React. */

export type Workspace = PluginWorkspaceSnapshot;

/** Status groups, in the order the built-in status grouping shows them. */
const STATUS_ORDER: readonly WorkspaceIndicator[] = [
  "needs_input",
  "failed",
  "attention",
  "running",
  "done",
];

export const STATUS_LABEL: Record<WorkspaceIndicator, string> = {
  needs_input: "Needs input",
  failed: "Failed",
  attention: "Ready to review",
  running: "Working",
  done: "Done",
};

/** Position of a status group; statuses a newer host invents sort last. */
export function statusRank(indicator: string): number {
  const index = STATUS_ORDER.indexOf(indicator as WorkspaceIndicator);
  return index === -1 ? STATUS_ORDER.length : index;
}

/** Aggregate priority for a collapsed project's badge. `done` shows nothing. */
const AGGREGATE_ORDER: readonly WorkspaceIndicator[] = [
  "needs_input",
  "failed",
  "running",
  "attention",
  "done",
];

export function aggregateIndicator(indicators: Iterable<WorkspaceIndicator>): WorkspaceIndicator {
  let best = AGGREGATE_ORDER.length - 1;
  for (const indicator of indicators) {
    const index = AGGREGATE_ORDER.indexOf(indicator);
    if (index !== -1) best = Math.min(best, index);
  }
  return AGGREGATE_ORDER[best];
}

/** Rows shown before "Show more". */
export const WORKSPACE_LIMIT = 7;
export const PINNED_LIMIT = 20;

/** Trimmed branch name; blank and detached `HEAD` read as no branch. */
export function normalizeBranch(branch: string | null): string | null {
  const value = branch?.trim();
  return value && value !== "HEAD" ? value : null;
}

export function displayTitle(workspace: Workspace, source: TitleSource): string {
  if (source === "branch") return normalizeBranch(workspace.branch) ?? workspace.name;
  return workspace.name;
}

const workspaceKey = (workspace: Workspace) => `${workspace.hostId}:${workspace.id}`;
const time = (value: string | null) => (value ? Date.parse(value) || 0 : 0);
const byKey = (a: Workspace, b: Workspace) => workspaceKey(a).localeCompare(workspaceKey(b));

export const compareNames = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

/** Workspaces inside a project. Missing times sort as zero, so they land last. */
export function compareWorkspaces(sort: Sort) {
  if (sort === "lastPrompt")
    return (a: Workspace, b: Workspace) =>
      time(b.lastPromptAt ?? b.createdAt) - time(a.lastPromptAt ?? a.createdAt) || byKey(a, b);
  return (a: Workspace, b: Workspace) => time(b.createdAt) - time(a.createdAt) || byKey(a, b);
}

/** Most recently pinned first. */
export const comparePinned = (a: Workspace, b: Workspace) =>
  (b.pinnedAt ?? "").localeCompare(a.pinnedAt ?? "") || byKey(a, b);

/** Rows inside a status group: most recent status change first. */
export function compareStatusRows(projectName: (workspace: Workspace) => string) {
  return (a: Workspace, b: Workspace) => {
    const at = time(a.statusEnteredAt);
    const bt = time(b.statusEnteredAt);
    if (at !== bt) {
      if (!a.statusEnteredAt) return 1;
      if (!b.statusEnteredAt) return -1;
      return bt - at;
    }
    return (
      compareNames(projectName(a), projectName(b)) || compareNames(a.name, b.name) || byKey(a, b)
    );
  };
}

export const labelKey = (label: string) => label.trim().toLowerCase();

/** Whether a workspace passes the visibility filters; `viewKey` is its project's view key. */
export type VisibilityFilters = Pick<
  SidebarPreferences,
  "showBackground" | "hostFilter" | "projectFilter" | "labelFilter"
>;

export function isVisible(
  workspace: Workspace,
  preferences: VisibilityFilters,
  viewKey: string,
): boolean {
  if (!preferences.showBackground && workspace.background) return false;
  if (preferences.hostFilter.length > 0 && !preferences.hostFilter.includes(workspace.hostId))
    return false;
  if (preferences.projectFilter.length > 0 && !preferences.projectFilter.includes(viewKey))
    return false;
  if (preferences.labelFilter.length > 0) {
    const labels = workspace.labels.length > 0 ? workspace.labels.map(labelKey) : [""];
    if (!labels.some((label) => preferences.labelFilter.includes(label))) return false;
  }
  return true;
}

export function hasFilter(preferences: VisibilityFilters): boolean {
  return (
    preferences.hostFilter.length > 0 ||
    preferences.projectFilter.length > 0 ||
    preferences.labelFilter.length > 0
  );
}

/**
 * Stable partition by host in `compareHosts` order. Order inside a host is kept, so the
 * section's own sort still applies within each host.
 */
export function clusterByHost<T extends { hostId: string }>(
  items: readonly T[],
  compareHosts: (a: string, b: string) => number,
): T[] {
  const order = [...new Set(items.map((item) => item.hostId))].sort(compareHosts);
  return order.flatMap((hostId) => items.filter((item) => item.hostId === hostId));
}

/** `now`, `5m`, `3h`, `2d`, then `Jan 15`. */
export function formatAge(at: string | null, now: number): string | null {
  if (!at) return null;
  const then = Date.parse(at);
  if (Number.isNaN(then)) return null;
  const minutes = Math.floor(Math.max(0, now - then) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const date = new Date(then);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/** `950`, `1.2k`, `3m`: compact, one decimal at most. */
export function compactNumber(value: number): string {
  const units = [
    [1e9, "b"],
    [1e6, "m"],
    [1e3, "k"],
  ] as const;
  for (const [size, suffix] of units) {
    if (Math.abs(value) >= size) return `${Math.round((value / size) * 10) / 10}${suffix}`;
  }
  return String(value);
}

export function toggled<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

/** The first character of the last path segment, uppercased. */
export function projectInitial(name: string): string {
  const segment = name.split("/").filter(Boolean).pop() ?? name;
  return (segment.trim()[0] ?? "?").toUpperCase();
}
