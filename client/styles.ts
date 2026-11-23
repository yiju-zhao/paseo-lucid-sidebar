import type { PluginSidebarViewProps } from "@getpaseo/plugin/client";
import type { Workspace } from "./model";

export type Theme = PluginSidebarViewProps["theme"];

/**
 * Hosts and workspaces share a leading icon column and a text column.
 * Project tags sit on the left of each workspace's second line, with branch/status on the right.
 *
 *   | INSET | LEAD (icon / dot) | GAP | text …
 */
const INSET = 8;
const LEAD = 18;
const GAP = 8;
/** Section margin from the sidebar edge; toolbar aligns to the same column. */
const MARGIN = 6;
const TEXT_X = INSET + LEAD + GAP;

/**
 * Color carries meaning only:
 * - status (needs input, failed, running) is the one thing that asks for attention, so it keeps
 *   its color;
 * - host identity is the host name's pill, plus a faint tint behind pinned blocks;
 * - project identity is a solid color on its tag avatar; a pinned project's group repeats that
 *   color as a spine and a faint tint, so its workspaces read as one block;
 * - the selected workspace uses the theme accent for its outline and leading bar;
 * - other icons, counts and actions are neutral.
 */
export function makeStyles(theme: Theme, compact: boolean) {
  const c = theme.colors;
  const rowPad = compact ? 8 : 6;
  return {
    root: { paddingTop: 2, paddingBottom: 16 },

    // Toolbar: quiet text buttons, aligned to the content column.
    toolbar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 14,
      paddingLeft: MARGIN + INSET,
      paddingRight: 12,
      paddingVertical: 6,
    },
    toolButton: { flexDirection: "row" as const, alignItems: "center" as const, gap: 5 },
    toolText: { color: c.foregroundMuted, fontSize: 11, lineHeight: 14 },
    toolTextOn: { color: c.foreground },
    chip: {
      paddingHorizontal: 8,
      paddingVertical: compact ? 6 : 3,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipOn: { backgroundColor: c.surface2, borderColor: c.foregroundMuted },
    chipText: { color: c.foregroundMuted, fontSize: 11, lineHeight: 14 },
    chipTextOn: { color: c.foreground },
    panel: {
      marginHorizontal: MARGIN,
      marginBottom: 6,
      padding: 10,
      gap: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    panelLabel: { color: c.foregroundMuted, fontSize: 10, lineHeight: 12, letterSpacing: 0.5 },
    chips: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6 },

    // Host: a labelled region. Its name sits in a pill of the host color; that pill is the host's
    // only colored element in the main list.
    hostSection: {
      marginHorizontal: MARGIN,
      marginTop: 10,
      paddingBottom: 2,
      borderRadius: 6,
    },
    hostPill: {
      flexShrink: 1,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 5,
    },
    hostPillText: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "600" as const,
      letterSpacing: 0.2,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: GAP,
      minHeight: 26,
      paddingLeft: INSET,
      paddingRight: 10,
    },
    headerTitle: {
      flex: 1,
      color: c.foregroundMuted,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "600" as const,
      letterSpacing: 0.4,
    },
    headerSpacer: { flex: 1 },
    lead: { width: LEAD, alignItems: "center" as const, justifyContent: "center" as const },

    // Project: a secondary tag, capped so branch/status text still has room.
    projectTag: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      flexShrink: 1,
      maxWidth: "55%" as const,
      gap: 4,
      paddingLeft: 2,
      paddingRight: 5,
      paddingVertical: 2,
      borderRadius: 5,
      backgroundColor: c.surface1,
    },
    projectTagText: {
      flexShrink: 1,
      minWidth: 0,
      color: c.foregroundMuted,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: "500" as const,
    },
    tagAvatar: {
      width: 14,
      height: 14,
      borderRadius: 4,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    tagAvatarText: {
      color: "#ffffff",
      fontSize: 9,
      lineHeight: 12,
      fontWeight: "600" as const,
    },

    // Pinned project: one card per project. The spine and tint take the project's color; the
    // header names the project once, so the rows inside drop their tags.
    projectGroup: {
      marginHorizontal: MARGIN,
      marginTop: 8,
      paddingBottom: 3,
      borderRadius: 8,
      borderWidth: 1,
      overflow: "hidden" as const,
    },
    projectSpine: {
      position: "absolute" as const,
      top: 0,
      bottom: 0,
      left: 0,
      width: 3,
    },
    projectHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      minHeight: 30,
      paddingLeft: INSET - 1,
      paddingRight: 6,
    },
    projectHeaderMain: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: GAP,
      paddingVertical: compact ? 7 : 5,
      paddingRight: 6,
    },
    projectAvatar: {
      width: 18,
      height: 18,
      borderRadius: 5,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    projectAvatarText: {
      color: "#ffffff",
      fontSize: 10,
      lineHeight: 13,
      fontWeight: "700" as const,
    },
    projectName: {
      flexShrink: 1,
      minWidth: 0,
      color: c.foreground,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "600" as const,
    },
    hostPillSmall: { flexShrink: 2, paddingHorizontal: 5, paddingVertical: 1 },
    hostPillTextSmall: { fontSize: 10, lineHeight: 13, fontWeight: "600" as const },
    projectAction: {
      paddingHorizontal: 5,
      paddingVertical: 6,
      opacity: 0.75,
    },
    projectRows: { paddingHorizontal: 2 },

    // Workspace: the primary content, with metadata and its project tag below.
    rowShell: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      marginVertical: 1,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "transparent",
    },
    row: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: GAP,
      paddingLeft: INSET - 1,
      paddingRight: 2,
      paddingVertical: rowPad,
    },
    rowExpanded: { backgroundColor: c.surface2 },
    rowActive: { backgroundColor: c.surface2, borderColor: c.accent },
    rowActiveTint: {
      position: "absolute" as const,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      borderRadius: 5,
      backgroundColor: c.accent,
      opacity: 0.1,
    },
    rowActiveBar: {
      position: "absolute" as const,
      top: 8,
      bottom: 8,
      left: 0,
      width: 3,
      borderRadius: 2,
      backgroundColor: c.accent,
    },
    dotLead: { width: LEAD, height: 17, alignItems: "center" as const, justifyContent: "center" as const },
    dot: { width: 7, height: 7, borderRadius: 4 },
    rowBody: { flex: 1, minWidth: 0 },
    rowLine: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    rowTitle: {
      flex: 1,
      minWidth: 0,
      color: c.foreground,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "500" as const,
    },
    rowTitleActive: { fontWeight: "600" as const },
    rowFooter: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      marginTop: 3,
      minHeight: 18,
    },
    detailFill: { flex: 1, minWidth: 0, textAlign: "right" as const },
    rowDetail: { color: c.foregroundMuted, fontSize: 10, lineHeight: 14 },
    /** Second line of a row inside a pinned project group, where there is no tag beside it. */
    rowDetailOnly: { marginTop: 2 },
    added: { color: c.statusSuccess, opacity: 0.7, fontSize: 11, lineHeight: 14 },
    removed: { color: c.statusDanger, opacity: 0.7, fontSize: 11, lineHeight: 14 },
    actions: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 6,
      paddingLeft: TEXT_X,
      paddingRight: 10,
      paddingBottom: 6,
    },

    // Shared bits.
    meta: { color: c.foregroundMuted, fontSize: 11, lineHeight: 14 },
    /** Secondary affordances (+, ⋯) recede until needed. */
    add: { color: c.foregroundMuted, opacity: 0.6, fontSize: 14, lineHeight: 16, paddingHorizontal: 4 },
    moreActive: { color: c.foreground, opacity: 1 },
    more: { paddingRight: 8, paddingLeft: 2 },
    pinnedDivider: { height: 1, marginHorizontal: MARGIN, marginTop: 10, backgroundColor: c.border },
    input: {
      flex: 1,
      minWidth: 120,
      color: c.foreground,
      fontSize: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    note: { color: c.foregroundMuted, fontSize: 11, paddingLeft: TEXT_X, paddingVertical: 6 },
    error: { color: c.statusDanger, fontSize: 11, paddingHorizontal: 12, paddingVertical: 4 },
  };
}

export type Styles = ReturnType<typeof makeStyles>;

/** Muted identity accents for host pills and pinned tints. */
export const HOST_COLORS = [
  "#6b8fd6",
  "#4fae9f",
  "#d08a63",
  "#9a7bd0",
  "#c9708a",
  "#bfa24f",
  "#6fa87b",
  "#7f8ea3",
];

/** Solid avatar fills paired with white initials in both light and dark themes. */
const PROJECT_COLORS = [
  "#8b78f4",
  "#5689ed",
  "#40a788",
  "#ce8a43",
  "#cf6487",
  "#5a9eb8",
  "#ad78ca",
  "#a18b4d",
];

/** Hash the project key so sorting, filtering and other projects never change its color. */
export function projectAvatarStyle(key: string) {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index++) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  }
  return { backgroundColor: PROJECT_COLORS[(hash >>> 0) % PROJECT_COLORS.length] };
}

/** First letter or digit, uppercased; falls back to the first character (e.g. CJK). */
export function initial(name: string): string {
  const match = /[\p{L}\p{N}]/u.exec(name);
  return (match ? match[0] : (name.trim()[0] ?? "?")).toUpperCase();
}

/** Idle workspaces get a quiet neutral dot; only states that matter get color. */
export function indicatorColor(theme: Theme, indicator: Workspace["indicator"]): string {
  switch (indicator) {
    case "running":
      return theme.colors.accent;
    case "needs_input":
    case "attention":
      return theme.colors.statusWarning;
    case "failed":
      return theme.colors.statusDanger;
    default:
      return theme.colors.border;
  }
}
