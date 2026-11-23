import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const SORTS = ["created", "activity", "name", "priority"] as const;
export const STATUS_FILTERS = ["all", "active", "attention"] as const;
export const TITLE_SOURCES = ["title", "branch"] as const;
export const TRAILING = ["diff", "time"] as const;

/**
 * Display preferences for the host sidebar. Device scoped: stored on this installation, shared by
 * its client surfaces, never synced to other devices.
 */
export const hostSidebar = defineSettings({
  id: "host-sidebar",
  scope: "device",
  version: 2,
  // v2 resets the sort to created time once; every other preference is kept.
  migrate: (values) => ({ ...(values as Record<string, unknown>), sort: "created" }),
  schema: z.object({
    sort: z.enum(SORTS).default("created"),
    status: z.enum(STATUS_FILTERS).default("all"),
    titleSource: z.enum(TITLE_SOURCES).default("title"),
    trailing: z.enum(TRAILING).default("diff"),
    /** Host ids hidden from the list. */
    hiddenHosts: z.array(z.string()).default([]),
    /** When non-empty, only workspaces carrying one of these labels are listed. */
    labels: z.array(z.string()).default([]),
    /** `host:<hostId>`, `pinned/host:<hostId>` or `pinned/project:<projectKey>`. */
    collapsed: z.array(z.string()).default([]),
    /**
     * Project ref keys, in pin order. All of a pinned project's workspaces are listed in the
     * pinned area as one group. Paseo has no project pinning of its own.
     */
    pinnedProjects: z.array(z.string()).default([]),
  }),
});

export type HostSidebarPreferences = z.output<typeof hostSidebar.schema>;

export const DEFAULT_PREFERENCES: HostSidebarPreferences = {
  sort: "created",
  status: "all",
  titleSource: "title",
  trailing: "diff",
  hiddenHosts: [],
  labels: [],
  collapsed: [],
  pinnedProjects: [],
};
