import { useMemo } from "react";
import { View } from "react-native";
import { useHosts, type PluginSidebarViewProps } from "@getpaseo/plugin/client";
import { ScrollView } from "@getpaseo/plugin/client/ui";
import { makeHostDirectory, SidebarContextProvider, type SidebarContextValue } from "./context";
import { IconButton } from "./controls";
import { DisplayMenu } from "./display-menu";
import { buildPinned, buildProjects, buildStatusGroups, type ListState } from "./layout";
import { useLocalHostId } from "./local-host";
import { hasFilter } from "./model";
import { makePalette } from "./palette";
import { usePreferences, type Preferences } from "./preferences";
import { useSidebarData } from "./queries";
import { needsWorkspaceRuntime } from "./row-items";
import { RuntimeProvider, useProjectDirectory } from "./runtime";
import {
  EmptyCard,
  HostBlocksView,
  PinnedSection,
  ProjectBlocks,
  SectionHeader,
  StatusGroupView,
} from "./sections";
import { UiStateProvider, useExpanded, useMenu } from "./ui-state";

/**
 * The registered sidebar view: queries → list model → renderers. Nothing renders until the
 * stored preferences are read, so nothing can save over them.
 */
export function WorkspaceSidebar(view: PluginSidebarViewProps) {
  const preferences = usePreferences();
  if (preferences.loading) return null;
  return (
    <RuntimeProvider watchWorkspaces={needsWorkspaceRuntime(preferences.values)}>
      <UiStateProvider>
        <SidebarContent view={view} preferences={preferences} />
      </UiStateProvider>
    </RuntimeProvider>
  );
}

function SidebarContent({
  view,
  preferences,
}: {
  view: PluginSidebarViewProps;
  preferences: Preferences;
}) {
  const values = preferences.values;
  const directory = useProjectDirectory();
  const localHostId = useLocalHostId();
  const hostList = useHosts();
  const data = useSidebarData(values, directory);
  const expanded = useExpanded();
  const display = useMenu("display");

  const palette = useMemo(() => makePalette(view.theme), [view.theme]);
  const hosts = useMemo(
    () => makeHostDirectory(hostList, localHostId, palette.dark, data.multiHost),
    [hostList, localHostId, palette.dark, data.multiHost],
  );
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
    }),
    [view, palette, pointer, preferences, directory, hosts],
  );

  const activeKey = view.active.workspace?.key ?? null;
  const state = useMemo<ListState>(
    () => ({
      groupHosts: values.clusterByHost,
      compareHosts: hosts.compare,
      collapsed: new Set(values.collapsed),
      expanded,
      activeKey,
    }),
    [values.clusterByHost, values.collapsed, hosts, expanded, activeKey],
  );
  const projectMode = values.grouping === "project";
  const pinned = useMemo(() => buildPinned(data.pinned, state), [data.pinned, state]);
  const projects = useMemo(
    () =>
      buildProjects(data.projects, data.facts, state, {
        projects: values.projectFilter,
        labels: values.labelFilter.length > 0,
      }),
    [data.projects, data.facts, state, values.projectFilter, values.labelFilter],
  );
  const statuses = useMemo(
    () => buildStatusGroups(data.statusGroups, state),
    [data.statusGroups, state],
  );

  const filtered = hasFilter(values);
  const listEmpty = projectMode
    ? projects.blocks.length === 0 && !projects.hosts?.length
    : statuses.length === 0;
  const clearFilters = () =>
    preferences.update({ hostFilter: [], projectFilter: [], labelFilter: [] });

  return (
    <SidebarContextProvider value={context}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 2, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PinnedSection list={pinned} />
        {!projectMode || !listEmpty || filtered ? (
          <SectionHeader
            title="Workspaces"
            actions={
              <IconButton
                icon="Settings2"
                label="Display preferences"
                onPress={display.toggle}
                active={display.open}
                size={28}
                iconSize={14}
                hoverFill={palette.hover}
              />
            }
          />
        ) : null}
        {display.open ? <DisplayMenu data={data} /> : null}
        {projectMode ? (
          projects.hosts ? (
            projects.hosts.map((host) => <HostBlocksView key={host.hostId} host={host} />)
          ) : (
            <ProjectBlocks blocks={projects.blocks} />
          )
        ) : (
          statuses.map((section) => <StatusGroupView key={section.indicator} section={section} />)
        )}
        {listEmpty && filtered ? (
          <EmptyCard
            title="No workspaces match"
            description="Change or clear the sidebar filters to see workspaces."
            action={{ label: "Clear filters", onPress: clearFilters }}
          />
        ) : null}
        {listEmpty && !filtered && projectMode && data.projects.length === 0 ? (
          <EmptyCard title="No projects yet" description="Add a project to get started" />
        ) : null}
        <View style={{ height: 1 }} />
      </ScrollView>
    </SidebarContextProvider>
  );
}
