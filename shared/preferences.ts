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
export type ChecksDisplay = (typeof CHECKS_DISPLAY)[number];

/** Second-line items with an on/off switch. The project leads the line; see client/row-items. */
const rowItems = z.object({
  project: z.boolean().default(true),
  branch: z.boolean().default(false),
  /** Host headings: each host's projects and workspaces together under its name. */
  host: z.boolean().default(true),
  changeRequest: z.boolean().default(true),
  services: z.boolean().default(true),
  labels: z.boolean().default(true),
});

export type RowItem = keyof z.output<typeof rowItems>;

const schema = z.object({
  grouping: z.enum(GROUPINGS).default("project"),
  sort: z.enum(SORTS).default("created"),
  titleSource: z.enum(TITLE_SOURCES).default("title"),
  trailing: z.enum(TRAILING).default("timestamp"),
  checks: z.enum(CHECKS_DISPLAY).default("iconAndText"),
  // `prefault` parses the empty object, so the item defaults above apply.
  rowItems: rowItems.prefault({}),
  showBackground: z.boolean().default(false),
  /** Server ids. Empty means every host. */
  hostFilter: z.array(z.string()).default([]),
  /** Project view keys. Empty means every project. */
  projectFilter: z.array(z.string()).default([]),
  /** Lowercased label names; the empty string stands for "Unlabelled". Empty means no filter. */
  labelFilter: z.array(z.string()).default([]),
  /** Collapse keys; client/keys.ts owns their format. */
  collapsed: z.array(z.string()).default([]),
});

/**
 * Display preferences, mirroring the built-in sidebar's display menu. Device scoped: stored on
 * this installation and never synced to other devices.
 */
export const sidebarSettings = defineSettings({
  id: "sidebar",
  scope: "device",
  version: 4,
  migrate: (values, fromVersion) => {
    const stored = { ...(values as Record<string, unknown>) };
    // v2: the project item now leads the second line; turn it on once.
    if (fromVersion < 2)
      stored.rowItems = { ...(stored.rowItems as Record<string, unknown>), project: true };
    // v3: project collapse is keyed by view key alone, so it survives "Keep hosts together".
    // Per-host keys were `project:["<host>","<viewKey>"]`.
    if (fromVersion < 3 && Array.isArray(stored.collapsed)) {
      const keys = (stored.collapsed as unknown[]).filter((key) => typeof key === "string");
      stored.collapsed = [...new Set(keys.map(migrateProjectKey))];
    }
    // v4: one Host switch replaces Keep hosts together and the row's host badge.
    if (fromVersion < 4) {
      const items = { ...(stored.rowItems as Record<string, unknown>) };
      items.host = items.host !== false && stored.clusterByHost !== false;
      stored.rowItems = items;
      delete stored.clusterByHost;
    }
    return stored;
  },
  schema,
});

function migrateProjectKey(key: string): string {
  if (!key.startsWith('project:["')) return key;
  try {
    const parsed: unknown = JSON.parse(key.slice("project:".length));
    if (Array.isArray(parsed) && typeof parsed[1] === "string") return `project:${parsed[1]}`;
  } catch {
    // Not a per-host key after all; keep it.
  }
  return key;
}

export type SidebarPreferences = z.output<typeof schema>;

export const DEFAULT_PREFERENCES: SidebarPreferences = schema.parse({});
