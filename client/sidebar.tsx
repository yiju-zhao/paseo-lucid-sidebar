import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import {
  useHosts,
  useProjects,
  useWorkspaces,
  type PluginSidebarViewProps,
  type ProjectRef,
  type WorkspaceRef,
} from "@getpaseo/plugin/client";
import { ScrollView } from "@getpaseo/plugin/client/ui";
import type { WorkspaceIndicator } from "@getpaseo/plugin";
import { SidebarContextProvider, type SidebarContextValue } from "./context";
import { DisplayMenu, type LabelOption, type ProjectOption } from "./display-menu";
import { useLocalHostId } from "./local-host";
import {
  aggregateIndicator,
  clusterByHost,
  compareNames,
  comparePinned,
  compareStatusRows,
  compareWorkspaces,
  hasFilter,
  isVisible,
  labelKey,
  STATUS_ORDER,
  type Workspace,
} from "./model";
import { makePalette } from "./palette";
import { usePreferences } from "./preferences";
import { RuntimeProvider, useProjectDirectory } from "./runtime";
import {
  EmptyCard,
  HostHeading,
  PinnedSection,
  ProjectBlock,
  SectionHeader,
  StatusGroup,
  type ProjectBlockData,
} from "./sections";
import { IconButton } from "./workspace-row";

/** The registered sidebar view. */
export function WorkspaceSidebar(view: PluginSidebarViewProps) {
  const preferences = usePreferences();
  const { rowItems, checks } = preferences.values;
  const watchWorkspaces = rowItems.changeRequest || rowItems.services || checks !== "none";
  return (
    <RuntimeProvider watchWorkspaces={watchWorkspaces}>
      <SidebarContent view={view} preferences={preferences} />
    </RuntimeProvider>
  );
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function SidebarContent({
  view,
  preferences,
}: {
  view: PluginSidebarViewProps;
  preferences: ReturnType<typeof usePreferences>;
}) {
  const values = preferences.values;
  const hosts = useHosts();
  const directory = useProjectDirectory();
  const localHostId = useLocalHostId();
  const now = useNow();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [expanded, setExpandedSet] = useState<ReadonlySet<string>>(() => new Set());
  const setExpanded = useCallback((key: string, on: boolean) => {
    setExpandedSet((current) => {
      const next = new Set(current);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const viewKeyOf = useCallback(
    (workspace: Workspace) => directory.viewKey(workspace.hostId, workspace.projectId),
    [directory],
  );
  const visible = useCallback(
    (workspace: Workspace) => isVisible(workspace, values, viewKeyOf(workspace)),
    [values, viewKeyOf],
  );
  const listed = useCallback(
    (workspace: Workspace) => !workspace.pinnedAt && visible(workspace),
    [visible],
  );

  // Rows.
  const pinned = useWorkspaces({
    where: (workspace) => !!workspace.pinnedAt && visible(workspace),
    orderBy: comparePinned,
  });
  const doneRefs = useWorkspaces({
    where: (workspace) => listed(workspace) && workspace.indicator === "done",
  });
  const doneKeys = useMemo(() => new Set(doneRefs.map((reference) => reference.key)), [doneRefs]);
  const hostLabel = useCallback(
    (hostId: string) => hosts.find((host) => host.serverId === hostId)?.label ?? hostId,
    [hosts],
  );
  const hostGroups = useWorkspaces({ where: visible, groupBy: (workspace) => workspace.hostId });
  const multiHost = hostGroups.length >= 2;

  // Keeping hosts together gives each host its own block of a project; otherwise a project's
  // blocks merge across hosts, like the built-in list.
  const cluster = values.clusterByHost;
  const blockKeyOf = useCallback(
    (hostId: string, viewKey: string) => (cluster ? JSON.stringify([hostId, viewKey]) : viewKey),
    [cluster],
  );
  const blockOf = useCallback(
    (workspace: Workspace) => blockKeyOf(workspace.hostId, viewKeyOf(workspace)),
    [blockKeyOf, viewKeyOf],
  );
  const byProject = useWorkspaces({
    where: listed,
    orderBy: compareWorkspaces(values.sort),
    groupBy: blockOf,
  });
  const projectStatus = useWorkspaces({
    where: listed,
    groupBy: (workspace) => JSON.stringify([blockOf(workspace), workspace.indicator]),
  });
  // Projects that ever had workspaces, and those with a workspace the background filter keeps.
  const anyWorkspace = useWorkspaces({ groupBy: blockOf });
  const keptWorkspace = useWorkspaces({
    where: (workspace) => values.showBackground || !workspace.background,
    groupBy: blockOf,
  });
  const projects = useProjects({
    where: (project) =>
      values.hostFilter.length === 0 || values.hostFilter.includes(project.hostId),
    orderBy: (a, b) =>
      compareNames(a.displayName, b.displayName) ||
      directory.viewKey(a.hostId, a.ref.id).localeCompare(directory.viewKey(b.hostId, b.ref.id)),
  });

  const projectOptions = useMemo<ProjectOption[]>(() => {
    const seen = new Map<string, ProjectRef>();
    for (const reference of projects) {
      const viewKey = directory.viewKey(reference.hostId, reference.id);
      if (!seen.has(viewKey)) seen.set(viewKey, reference);
    }
    return [...seen].map(([viewKey, reference]) => ({ viewKey, reference }));
  }, [projects, directory]);

  const blocks = useMemo<ProjectBlockData[]>(() => {
    const rows = new Map(byProject.map((group) => [group.key, group.items]));
    const ever = new Set(anyWorkspace.map((group) => group.key));
    const kept = new Set(keptWorkspace.map((group) => group.key));
    const statuses = new Map<string, WorkspaceIndicator[]>();
    for (const group of projectStatus) {
      const [key, indicator] = JSON.parse(group.key) as [string, WorkspaceIndicator];
      statuses.set(key, [...(statuses.get(key) ?? []), indicator]);
    }
    const refsByKey = new Map<string, { viewKey: string; refs: ProjectRef[] }>();
    for (const reference of projects) {
      const viewKey = directory.viewKey(reference.hostId, reference.id);
      const key = blockKeyOf(reference.hostId, viewKey);
      const entry = refsByKey.get(key) ?? { viewKey, refs: [] };
      entry.refs.push(reference);
      refsByKey.set(key, entry);
    }
    const result: ProjectBlockData[] = [];
    for (const [key, { viewKey, refs }] of refsByKey) {
      if (values.projectFilter.length > 0 && !values.projectFilter.includes(viewKey)) continue;
      const items: readonly WorkspaceRef[] = rows.get(key) ?? [];
      const empty = !ever.has(key);
      // Every workspace hidden by the background filter: the project goes too.
      if (!empty && !kept.has(key)) continue;
      // With a label filter, only projects with matching workspaces stay.
      if (values.labelFilter.length > 0 && items.length === 0) continue;
      result.push({
        key,
        viewKey,
        hostId: refs[0].hostId,
        projects: refs,
        items,
        empty,
        aggregate: aggregateIndicator(statuses.get(key) ?? []),
      });
    }
    // Projects arrive sorted by name; keep that order inside each host.
    return cluster ? clusterByHost(result, localHostId, hostLabel) : result;
  }, [
    byProject,
    anyWorkspace,
    keptWorkspace,
    projectStatus,
    projects,
    directory,
    values,
    blockKeyOf,
    cluster,
    localHostId,
    hostLabel,
  ]);
  const blockHosts = new Set(blocks.map((block) => block.hostId)).size;
  const headBlocks = cluster && blockHosts > 1;

  const statusGroups = useWorkspaces({
    where: listed,
    orderBy: compareStatusRows(
      (workspace) =>
        directory.info(workspace.hostId, workspace.projectId)?.customName ??
        workspace.projectDisplayName,
    ),
    groupBy: (workspace) => ({
      key: workspace.indicator,
      title: workspace.indicatorLabel ?? undefined,
    }),
  });
  const orderedStatusGroups = useMemo(
    () =>
      [...statusGroups].sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.key as WorkspaceIndicator) -
          STATUS_ORDER.indexOf(b.key as WorkspaceIndicator),
      ),
    [statusGroups],
  );

  const labelGroups = useWorkspaces({
    groupBy: (workspace) =>
      workspace.labels.map((label) => ({ key: labelKey(label), title: label })),
  });
  const labels = useMemo<LabelOption[]>(
    () =>
      labelGroups
        .map((group) => ({ key: group.key, title: group.title ?? group.key }))
        .sort((a, b) => compareNames(a.title, b.title)),
    [labelGroups],
  );

  const palette = useMemo(() => makePalette(view.theme), [view.theme]);
  const pointer = view.layout.platform === "web" && !view.layout.compact;
  const context = useMemo<SidebarContextValue>(
    () => ({
      view,
      theme: view.theme,
      palette,
      touch: !pointer,
      pointer,
      preferences,
      directory,
      hosts,
      multiHost,
      localHostId,
      now,
      openMenu,
      setOpenMenu,
      renaming,
      setRenaming,
    }),
    [
      view,
      palette,
      pointer,
      preferences,
      directory,
      hosts,
      multiHost,
      localHostId,
      now,
      openMenu,
      renaming,
    ],
  );

  const filtered = hasFilter(values);
  const clearFilters = () =>
    preferences.update({ hostFilter: [], projectFilter: [], labelFilter: [] });
  const projectMode = values.grouping === "project";
  const listEmpty = projectMode ? blocks.length === 0 : orderedStatusGroups.length === 0;
  const showHeader = !projectMode || blocks.length > 0 || filtered;
  const displayOpen = openMenu === "display";

  return (
    <SidebarContextProvider value={context}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 2, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PinnedSection items={pinned} expanded={expanded} setExpanded={setExpanded} />
        {showHeader ? (
          <SectionHeader
            title="Workspaces"
            actions={
              <IconButton
                icon="Settings2"
                label="Display preferences"
                onPress={() => setOpenMenu(displayOpen ? null : "display")}
                size={28}
                iconSize={14}
                hoverFill={palette.hover}
              />
            }
          />
        ) : null}
        {displayOpen ? <DisplayMenu projects={projectOptions} labels={labels} /> : null}
        {projectMode
          ? blocks.map((block, index) => (
              <Fragment key={block.key}>
                {headBlocks && block.hostId !== blocks[index - 1]?.hostId ? (
                  <HostHeading
                    hostId={block.hostId}
                    label={hostLabel(block.hostId)}
                    indent={8}
                    section
                    collapseKey={`host:${block.hostId}`}
                    count={blocks.filter((entry) => entry.hostId === block.hostId).length}
                  />
                ) : null}
                {headBlocks && values.collapsed.includes(`host:${block.hostId}`) ? null : (
                  <ProjectBlock
                    hideHost={headBlocks}
                    block={block}
                    doneKeys={doneKeys}
                    expanded={expanded}
                    setExpanded={setExpanded}
                  />
                )}
              </Fragment>
            ))
          : orderedStatusGroups.map((group) => (
              <StatusGroup
                key={group.key}
                indicator={group.key as WorkspaceIndicator}
                title={group.title}
                items={group.items}
                doneKeys={doneKeys}
                expanded={expanded}
                setExpanded={setExpanded}
              />
            ))}
        {listEmpty && filtered ? (
          <EmptyCard
            title="No workspaces match"
            description="Change or clear the sidebar filters to see workspaces."
            action={{ label: "Clear filters", onPress: clearFilters }}
          />
        ) : null}
        {listEmpty && !filtered && projectMode && projects.length === 0 ? (
          <EmptyCard title="No projects yet" description="Add a project to get started" />
        ) : null}
        <View style={{ height: 1 }} />
      </ScrollView>
    </SidebarContextProvider>
  );
}
