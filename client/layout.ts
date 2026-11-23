import type { WorkspaceIndicator } from "@getpaseo/plugin";
import { keys } from "./keys";
import {
  aggregateIndicator,
  clusterByHost,
  PINNED_LIMIT,
  statusRank,
  WORKSPACE_LIMIT,
} from "./model";

/**
 * The sidebar list model: what appears, in which order, folded or not. Pure functions from plain
 * data to a tree of sections, host groups, project blocks and row lists; renderers only draw it.
 */

/** Anything the list orders: a workspace or project ref. */
export interface Item {
  readonly key: string;
  readonly hostId: string;
}

export type CompareHosts = (a: string, b: string) => number;

/** State shared by every list: how hosts sort, and what is folded or expanded. */
export interface ListState {
  /**
   * Keep each host's items together under host headings. Decided for the whole view (the
   * preference, and visible workspaces spanning hosts), so a section with a single host still
   * gets its heading.
   */
  groupHosts: boolean;
  compareHosts: CompareHosts;
  /** Stored collapse keys. */
  collapsed: ReadonlySet<string>;
  /** Show-more keys expanded in this session. */
  expanded: ReadonlySet<string>;
  /** Key of the open workspace. */
  activeKey: string | null;
}

/** Space below an open project block. */
export const PROJECT_SPACING = 12;
/** Space below a project header, which is all a folded block has. */
export const HEADER_MARGIN = 4;

// Row lists ----------------------------------------------------------------------------------

export interface HostRows<T> {
  hostId: string;
  collapseKey: string;
  collapsed: boolean;
  /** Every row of the host in the list, shown or not. */
  total: number;
  rows: T[];
}

export interface RowList<T> {
  /** Key of the list's show-more state. */
  key: string;
  /** Rows in order, when the list is not split into hosts. */
  rows: T[];
  /** Host groups in order, when hosts are kept together. */
  hosts: HostRows<T>[] | null;
  /** The "Show more" toggle, when folding would hide rows. */
  more: { hidden: number; expanded: boolean } | null;
}

/**
 * Rows of one section with the built-in "Show more" rule: the first `limit` rows show, and in
 * workspace groups every row that is not done shows too. The open workspace always shows, first
 * in its host. Folded hosts keep their heading; hosts with nothing shown are left out.
 */
export function buildRowList<T extends Item>(
  key: string,
  items: readonly T[],
  state: ListState,
  options: { limit: number; isDone?: (item: T) => boolean },
): RowList<T> {
  const ordered = state.groupHosts ? clusterByHost(items, state.compareHosts) : [...items];
  const hostIds = [...new Set(ordered.map((item) => item.hostId))];
  const split = state.groupHosts && hostIds.length > 0;
  const hostKey = (hostId: string) => keys.sectionHost(key, hostId);
  const open = split
    ? ordered.filter((item) => !state.collapsed.has(hostKey(item.hostId)))
    : ordered;

  let hoisted: T | null = null;
  const baseline: T[] = [];
  let hidden = 0;
  open.forEach((item, index) => {
    if (index < options.limit || (options.isDone ? !options.isDone(item) : false)) {
      baseline.push(item);
    } else if (item.key === state.activeKey) hoisted = item;
    else hidden += 1;
  });
  const expanded = state.expanded.has(key);
  const shown = expanded ? open : hoisted ? [hoisted, ...baseline] : baseline;
  const more = hidden > 0 ? { hidden, expanded } : null;
  if (!split) return { key, rows: shown, hosts: null, more };

  const hosts = hostIds
    .map((hostId) => {
      const collapseKey = hostKey(hostId);
      return {
        hostId,
        collapseKey,
        collapsed: state.collapsed.has(collapseKey),
        total: ordered.filter((item) => item.hostId === hostId).length,
        rows: shown.filter((item) => item.hostId === hostId),
      };
    })
    .filter((group) => group.collapsed || group.rows.length > 0);
  return { key, rows: [], hosts, more };
}

export function buildPinned<T extends Item>(items: readonly T[], state: ListState): RowList<T> {
  return buildRowList(keys.pinned, items, state, { limit: PINNED_LIMIT });
}

// Project grouping ---------------------------------------------------------------------------

export interface ProjectInput<P extends Item> {
  ref: P;
  viewKey: string;
}

/** Facts about workspaces, keyed for project grouping. */
export interface ProjectFacts<T extends Item> {
  /** Listed (visible, unpinned) rows per view key, in the workspace sort, across hosts. */
  rows: ReadonlyMap<string, readonly T[]>;
  /** Status of each listed row, by row key. */
  indicators: ReadonlyMap<string, WorkspaceIndicator>;
}

export interface ProjectBlock<P extends Item, T extends Item> {
  key: string;
  viewKey: string;
  /** Host of the first project ref; the only host when hosts are kept together. */
  hostId: string;
  /** One ref per host the block covers; the first names the project. */
  projects: P[];
  collapseKey: string;
  collapsed: boolean;
  /** Status of its rows, for the folded badge. */
  aggregate: WorkspaceIndicator;
  rows: RowList<T>;
  /** Space below the block. */
  spacing: number;
}

export interface HostBlocks<P extends Item, T extends Item> {
  hostId: string;
  collapseKey: string;
  collapsed: boolean;
  /** Projects under the host. */
  count: number;
  /** The host's blocks; renderers skip them while the host is folded. */
  blocks: ProjectBlock<P, T>[];
  /** Where the guide line stops above the group's bottom edge. */
  guideBottom: number;
}

export interface ProjectLayout<P extends Item, T extends Item> {
  /** Blocks in order, when they are not split into hosts. */
  blocks: ProjectBlock<P, T>[];
  hosts: HostBlocks<P, T>[] | null;
}

/**
 * Project blocks in name order, leaving out projects with no listed workspace. With hosts kept together, each host gets its own block of a
 * project, and blocks sit under host headings; otherwise a project merges across hosts.
 * `projects` must arrive sorted by name and already filtered by host.
 */
export function buildProjects<P extends Item, T extends Item>(
  projects: readonly ProjectInput<P>[],
  facts: ProjectFacts<T>,
  state: ListState,
  filters: { projects: readonly string[] },
): ProjectLayout<P, T> {
  const entries = new Map<string, { viewKey: string; hostId: string | null; refs: P[] }>();
  for (const { ref, viewKey } of projects) {
    if (filters.projects.length > 0 && !filters.projects.includes(viewKey)) continue;
    const hostId = state.groupHosts ? ref.hostId : null;
    const key = keys.block(viewKey, hostId);
    const entry = entries.get(key) ?? { viewKey, hostId, refs: [] };
    entry.refs.push(ref);
    entries.set(key, entry);
  }

  const blocks: ProjectBlock<P, T>[] = [];
  for (const [key, { viewKey, hostId, refs }] of entries) {
    const all = facts.rows.get(viewKey) ?? [];
    const items = hostId === null ? all : all.filter((item) => item.hostId === hostId);
    // A project with nothing to list is left out: never used, all pinned, or all filtered.
    if (items.length === 0) continue;
    const collapseKey = keys.project(viewKey);
    const collapsed = state.collapsed.has(collapseKey);
    const indicators = items.flatMap((item) => facts.indicators.get(item.key) ?? []);
    blocks.push({
      key,
      viewKey,
      hostId: refs[0].hostId,
      projects: refs,
      collapseKey,
      collapsed,
      aggregate: aggregateIndicator(indicators),
      // A block holds one host or merges hosts on purpose, so its rows are never split.
      rows: buildRowList(
        key,
        items,
        { ...state, groupHosts: false },
        {
          limit: WORKSPACE_LIMIT,
          isDone: (item) => facts.indicators.get(item.key) === "done",
        },
      ),
      spacing: collapsed ? 0 : PROJECT_SPACING,
    });
  }

  const ordered = state.groupHosts ? clusterByHost(blocks, state.compareHosts) : blocks;
  const hostIds = [...new Set(ordered.map((block) => block.hostId))];
  if (!state.groupHosts) return { blocks: ordered, hosts: null };
  return {
    blocks: [],
    hosts: hostIds.map((hostId) => {
      const own = ordered.filter((block) => block.hostId === hostId);
      const collapseKey = keys.host(hostId);
      const collapsed = state.collapsed.has(collapseKey);
      const last = own[own.length - 1];
      return {
        hostId,
        collapseKey,
        collapsed,
        count: own.length,
        blocks: own,
        guideBottom: (last.spacing || HEADER_MARGIN) + 2,
      };
    }),
  };
}

// Status grouping ----------------------------------------------------------------------------

export interface StatusSection<T extends Item> {
  indicator: WorkspaceIndicator;
  title: string | null;
  collapseKey: string;
  collapsed: boolean;
  rows: RowList<T>;
}

export function buildStatusGroups<T extends Item>(
  groups: readonly { key: string; title: string | null; items: readonly T[] }[],
  state: ListState,
): StatusSection<T>[] {
  return [...groups]
    .sort((a, b) => statusRank(a.key) - statusRank(b.key))
    .map((group) => {
      const indicator = group.key as WorkspaceIndicator;
      const collapseKey = keys.status(indicator);
      return {
        indicator,
        title: group.title,
        collapseKey,
        collapsed: state.collapsed.has(collapseKey),
        rows: buildRowList(collapseKey, group.items, state, {
          limit: WORKSPACE_LIMIT,
          isDone: () => indicator === "done",
        }),
      };
    });
}

// Fold all / unfold all ------------------------------------------------------------------------

/** Every fold in project grouping: host headings and projects. */
export function projectDisclosures<P extends Item, T extends Item>(
  layout: ProjectLayout<P, T>,
): string[] {
  const blocks = layout.hosts ? layout.hosts.flatMap((host) => host.blocks) : layout.blocks;
  return unique([
    ...(layout.hosts ?? []).map((host) => host.collapseKey),
    ...blocks.map((block) => block.collapseKey),
  ]);
}

/** Every fold in status grouping: status groups and the host headings inside them. */
export function statusDisclosures<T extends Item>(sections: readonly StatusSection<T>[]): string[] {
  return unique(
    sections.flatMap((section) => [
      section.collapseKey,
      ...(section.rows.hosts ?? []).map((host) => host.collapseKey),
    ]),
  );
}

const unique = (items: readonly string[]) => [...new Set(items)];

/**
 * The stored collapse keys after "fold all" or "unfold all" over `disclosures`: fold all while
 * anything is open, otherwise unfold all. Other keys, such as Pinned, are kept.
 */
export function toggleAll(collapsed: readonly string[], disclosures: readonly string[]): string[] {
  const anyOpen = disclosures.some((key) => !collapsed.includes(key));
  if (anyOpen) return unique([...collapsed, ...disclosures]);
  return collapsed.filter((key) => !disclosures.includes(key));
}
