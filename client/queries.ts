import { useCallback, useMemo } from "react";
import type { WorkspaceIndicator } from "@getpaseo/plugin";
import {
  useProjects,
  useWorkspaces,
  type ProjectRef,
  type WorkspaceRef,
} from "@getpaseo/plugin/client";
import type { SidebarPreferences } from "../shared/preferences";
import type { ProjectFacts, ProjectInput } from "./layout";
import {
  compareNames,
  comparePinned,
  compareStatusRows,
  compareWorkspaces,
  isVisible,
  labelKey,
  type Workspace,
} from "./model";
import type { ProjectDirectory } from "./runtime";

/**
 * The adapter between Paseo's query hooks and the list model. Queries return refs only, so each
 * fact the model needs is one query; this turns them into plain data.
 */
export interface SidebarData {
  /** Visible pinned workspaces, most recently pinned first. */
  pinned: readonly WorkspaceRef[];
  /** Projects in name order, filtered by host. */
  projects: ProjectInput<ProjectRef>[];
  facts: ProjectFacts<WorkspaceRef>;
  /** Visible unpinned workspaces by status, newest status change first. */
  statusGroups: readonly { key: string; title: string | null; items: readonly WorkspaceRef[] }[];
  /** Visible workspaces span two or more hosts. */
  multiHost: boolean;
  /** Every label in use, for the label filter. */
  labels: readonly { key: string; title: string }[];
  /** One project per view key, for the project filter. */
  projectOptions: readonly { viewKey: string; reference: ProjectRef }[];
}

export function useSidebarData(
  values: SidebarPreferences,
  directory: ProjectDirectory,
): SidebarData {
  const { showBackground, hostFilter, projectFilter, labelFilter, sort } = values;
  // Depend on the filters alone, so folding a section does not re-run every query.
  const filters = useMemo(
    () => ({ showBackground, hostFilter, projectFilter, labelFilter }),
    [showBackground, hostFilter, projectFilter, labelFilter],
  );
  const viewKeyOf = useCallback(
    (workspace: Workspace) => directory.viewKey(workspace.hostId, workspace.projectId),
    [directory],
  );
  const visible = useCallback(
    (workspace: Workspace) => isVisible(workspace, filters, viewKeyOf(workspace)),
    [filters, viewKeyOf],
  );
  const listed = useCallback(
    (workspace: Workspace) => !workspace.pinnedAt && visible(workspace),
    [visible],
  );

  const pinned = useWorkspaces(
    useMemo(
      () => ({ where: (w: Workspace) => !!w.pinnedAt && visible(w), orderBy: comparePinned }),
      [visible],
    ),
  );
  const byProject = useWorkspaces(
    useMemo(
      () => ({ where: listed, orderBy: compareWorkspaces(sort), groupBy: viewKeyOf }),
      [listed, sort, viewKeyOf],
    ),
  );
  const statusGroups = useWorkspaces(
    useMemo(
      () => ({
        where: listed,
        orderBy: compareStatusRows(
          (w) => directory.info(w.hostId, w.projectId)?.customName ?? w.projectDisplayName,
        ),
        groupBy: (w: Workspace) => ({ key: w.indicator, title: w.indicatorLabel ?? undefined }),
      }),
      [listed, directory],
    ),
  );
  const hostGroups = useWorkspaces(
    useMemo(() => ({ where: visible, groupBy: (w: Workspace) => w.hostId }), [visible]),
  );
  const labelGroups = useWorkspaces(
    useMemo(
      () => ({
        groupBy: (w: Workspace) =>
          w.labels.map((label) => ({ key: labelKey(label), title: label })),
      }),
      [],
    ),
  );
  const projectRefs = useProjects(
    useMemo(
      () => ({
        where: (project: { hostId: string }) =>
          hostFilter.length === 0 || hostFilter.includes(project.hostId),
        orderBy: (
          a: { displayName: string; hostId: string; ref: ProjectRef },
          b: { displayName: string; hostId: string; ref: ProjectRef },
        ) =>
          compareNames(a.displayName, b.displayName) ||
          directory
            .viewKey(a.hostId, a.ref.id)
            .localeCompare(directory.viewKey(b.hostId, b.ref.id)),
      }),
      [hostFilter, directory],
    ),
  );

  return useMemo(() => {
    const projects = projectRefs.map((ref) => ({
      ref,
      viewKey: directory.viewKey(ref.hostId, ref.id),
    }));
    const indicators = new Map<string, WorkspaceIndicator>();
    for (const group of statusGroups)
      for (const item of group.items) indicators.set(item.key, group.key as WorkspaceIndicator);
    const firstByView = new Map<string, ProjectRef>();
    for (const { ref, viewKey } of projects)
      if (!firstByView.has(viewKey)) firstByView.set(viewKey, ref);
    return {
      pinned,
      projects,
      facts: {
        rows: new Map(byProject.map((group) => [group.key, group.items])),
        indicators,
      },
      statusGroups,
      multiHost: hostGroups.length >= 2,
      labels: labelGroups
        .map((group) => ({ key: group.key, title: group.title ?? group.key }))
        .sort((a, b) => compareNames(a.title, b.title)),
      projectOptions: [...firstByView].map(([viewKey, reference]) => ({ viewKey, reference })),
    };
  }, [projectRefs, directory, statusGroups, pinned, byProject, hostGroups, labelGroups]);
}
