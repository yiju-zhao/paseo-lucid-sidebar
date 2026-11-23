import type { PluginWorkspaceSnapshot } from "@getpaseo/plugin";
import type { HostSidebarPreferences } from "../shared/preferences";

export type Workspace = PluginWorkspaceSnapshot;

/** Lower sorts first: things waiting on the user, then running work, then finished work. */
const PRIORITY: Record<Workspace["indicator"], number> = {
  needs_input: 0,
  failed: 1,
  attention: 2,
  running: 3,
  done: 4,
};

function activityAt(workspace: Workspace): string {
  return workspace.lastPromptAt ?? workspace.statusEnteredAt ?? workspace.createdAt ?? "";
}

export function displayTitle(workspace: Workspace, source: HostSidebarPreferences["titleSource"]) {
  if (source === "branch" && workspace.branch) return workspace.branch;
  return workspace.title ?? workspace.name;
}

export function compareWorkspaces(sort: HostSidebarPreferences["sort"]) {
  const newest = (a: Workspace, b: Workspace) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  switch (sort) {
    case "name":
      return (a: Workspace, b: Workspace) =>
        (a.title ?? a.name).localeCompare(b.title ?? b.name);
    case "activity":
      return (a: Workspace, b: Workspace) =>
        activityAt(b).localeCompare(activityAt(a)) || newest(a, b);
    case "priority":
      return (a: Workspace, b: Workspace) =>
        PRIORITY[a.indicator] - PRIORITY[b.indicator] ||
        activityAt(b).localeCompare(activityAt(a));
    default:
      return newest;
  }
}

/** Background and archiving workspaces stay hidden, like the built-in sidebar. */
export function matchesFilters(workspace: Workspace, preferences: HostSidebarPreferences): boolean {
  if (workspace.background || workspace.archivingAt) return false;
  if (preferences.hiddenHosts.includes(workspace.hostId)) return false;
  if (preferences.status === "active" && workspace.indicator === "done") return false;
  if (
    preferences.status === "attention" &&
    (workspace.indicator === "done" || workspace.indicator === "running")
  )
    return false;
  if (
    preferences.labels.length > 0 &&
    !workspace.labels.some((label) => preferences.labels.includes(label))
  )
    return false;
  return true;
}

export function hasActiveFilter(preferences: HostSidebarPreferences): boolean {
  return (
    preferences.status !== "all" ||
    preferences.labels.length > 0 ||
    preferences.hiddenHosts.length > 0
  );
}

/** Compact age such as `5m`, `3h`, `2d`. */
export function relativeTime(workspace: Workspace, now: number): string {
  const at = Date.parse(activityAt(workspace));
  if (Number.isNaN(at)) return "";
  const minutes = Math.max(0, Math.floor((now - at) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export function toggled<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}
