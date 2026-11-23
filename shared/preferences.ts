import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const GROUPINGS = ["project", "status"] as const;
export const SORTS = ["created", "lastPrompt"] as const;
export const TITLE_SOURCES = ["title", "branch"] as const;
export const TRAILING = ["timestamp", "diff", "none"] as const;
export const CHECKS_DISPLAY = ["iconAndText", "icon", "none"] as const;

export type Grouping = (typeof GROUPINGS)[number];
export type Sort = (typeof SORTS)[number];
export type TitleSource = (typeof TITLE_SOURCES)[number];
export type Trailing = (typeof TRAILING)[number];
export type ChecksDisplay = (typeof CHECKS_DISPLAY)[number];

const rowItems = z.object({
  branch: z.boolean().default(false),
  project: z.boolean().default(true),
  host: z.boolean().default(true),
  changeRequest: z.boolean().default(true),
  services: z.boolean().default(true),
  labels: z.boolean().default(true),
});

export type RowItems = z.output<typeof rowItems>;
export type RowItem = keyof RowItems;

/**
 * Display preferences, mirroring the built-in sidebar's display menu. Device scoped: stored on
 * this installation and never synced to other devices. The built-in preferences cannot be read
 * by plugins, so these start from the built-in defaults.
 */
export const sidebarSettings = defineSettings({
  id: "sidebar",
  scope: "device",
  version: 2,
  // v2 turns the project tag on once; it now leads the tags in the project's color.
  migrate: (values) => {
    const stored = values as Record<string, unknown>;
    const items = (stored.rowItems ?? {}) as Record<string, unknown>;
    return { ...stored, rowItems: { ...items, project: true } };
  },
  schema: z.object({
    grouping: z.enum(GROUPINGS).default("project"),
    sort: z.enum(SORTS).default("created"),
    titleSource: z.enum(TITLE_SOURCES).default("title"),
    trailing: z.enum(TRAILING).default("timestamp"),
    checks: z.enum(CHECKS_DISPLAY).default("iconAndText"),
    rowItems: rowItems.default({
      branch: false,
      project: true,
      host: true,
      changeRequest: true,
      services: true,
      labels: true,
    }),
    showBackground: z.boolean().default(false),
    /** Inside each section, keep a host's workspaces together: local host first, then by name. */
    clusterByHost: z.boolean().default(true),
    /** Server ids. Empty means every host. */
    hostFilter: z.array(z.string()).default([]),
    /** Project view keys. Empty means every project. */
    projectFilter: z.array(z.string()).default([]),
    /** Lowercased label names; the empty string stands for "Unlabelled". Empty means no filter. */
    labelFilter: z.array(z.string()).default([]),
    /**
     * `pinned`, `project:<blockKey>`, `status:<indicator>`, `host:<hostId>` for a host in project
     * grouping, or `<section>|host:<hostId>` for a host heading inside a section.
     */
    collapsed: z.array(z.string()).default([]),
  }),
});

export type SidebarPreferences = z.output<typeof sidebarSettings.schema>;

export const DEFAULT_PREFERENCES: SidebarPreferences = {
  grouping: "project",
  sort: "created",
  titleSource: "title",
  trailing: "timestamp",
  checks: "iconAndText",
  rowItems: {
    branch: false,
    project: true,
    host: true,
    changeRequest: true,
    services: true,
    labels: true,
  },
  showBackground: false,
  clusterByHost: true,
  hostFilter: [],
  projectFilter: [],
  labelFilter: [],
  collapsed: [],
};
