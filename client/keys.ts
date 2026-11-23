import type { WorkspaceIndicator } from "@getpaseo/plugin";

/**
 * Every collapse and show-more key the view stores or tracks. Collapse keys persist in the
 * device preferences, so changing a format here needs a settings migration.
 */
export const keys = {
  /** The Pinned section. */
  pinned: "pinned",
  /** A project, under every host it appears on. */
  project: (viewKey: string) => `project:${viewKey}`,
  status: (indicator: WorkspaceIndicator) => `status:${indicator}`,
  /** A host heading above its projects in project grouping. */
  host: (hostId: string) => `host:${hostId}`,
  /** A host heading inside a section, such as Pinned or a status group. */
  sectionHost: (section: string, hostId: string) => `${section}|host:${hostId}`,
  /** A project block's own rows: one per host when hosts are kept together. */
  block: (viewKey: string, hostId: string | null) =>
    hostId === null ? `block:${viewKey}` : `block:${hostId}:${viewKey}`,
};
