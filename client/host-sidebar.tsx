import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  useHosts,
  useWorkspace,
  useWorkspaces,
  type PluginHostSummary,
  type PluginSidebarViewProps,
  type WorkspaceRef,
} from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/ui";
import { compareWorkspaces, matchesFilters, toggled, type Workspace } from "./model";
import { useLocalHostId } from "./local-host";
import { usePreferences } from "./preferences";
import { HOST_COLORS, initial, makeStyles, projectAvatarStyle } from "./styles";
import { Toolbar } from "./toolbar";
import { WorkspaceRow, type RowContext } from "./workspace-row";

/**
 * The pinned area and the main list render workspaces grouped by host; `pinned`
 * selects which workspaces each one shows. Collapse keys are kept apart so folding a host in one
 * does not fold it in the other.
 *
 * A pinned project takes all of its workspaces out of both: they are listed once, together, in
 * the project's own group at the top of the pinned area.
 */
type Mode = "pinned" | "main";
const prefix = (mode: Mode) => (mode === "pinned" ? "pinned/" : "");
const hostKey = (mode: Mode, hostId: string) => `${prefix(mode)}host:${hostId}`;
const projectKey = (key: string) => `pinned/project:${key}`;
const inPinnedProject = (workspace: Workspace, pinnedProjects: readonly string[]) =>
  pinnedProjects.includes(workspace.project.key);
const inMode = (mode: Mode, workspace: Workspace) =>
  mode === "pinned" ? !!workspace.pinnedAt : !workspace.pinnedAt;
const groupByProject = (workspace: Workspace) => workspace.project.key;

interface Shared extends RowContext {
  compare: (a: Workspace, b: Workspace) => number;
  toggleCollapsed: (key: string) => void;
  /** Server id of the daemon on this device, or null when there is none. */
  localHostId: string | null;
  /** Accent color per host, as #RRGGBB. */
  hostColors: ReadonlyMap<string, string>;
}

function HostSection({
  host,
  mode,
  shared,
}: {
  host: PluginHostSummary;
  mode: Mode;
  shared: Shared;
}) {
  const { view, styles, values, toggleCollapsed, compare } = shared;
  const hostIds = useMemo(() => [host.serverId], [host.serverId]);
  const where = useCallback(
    (workspace: Workspace) =>
      inMode(mode, workspace) &&
      !inPinnedProject(workspace, values.pinnedProjects) &&
      matchesFilters(workspace, values),
    [mode, values],
  );
  const visible = useWorkspaces({ hosts: hostIds, where, orderBy: compare });
  const key = hostKey(mode, host.serverId);
  const collapsed = values.collapsed.includes(key);
  const toggle = useCallback(() => toggleCollapsed(key), [toggleCollapsed, key]);
  const online = host.status === "online";
  // A host with nothing to show (offline, empty, or filtered out) is left out entirely.
  if (visible.length === 0) return null;
  const accent = shared.hostColors.get(host.serverId) ?? view.theme.colors.border;

  return (
    <View
      style={[
        styles.hostSection,
        // Only the pinned area gets the host tint.
        mode === "pinned" ? { backgroundColor: `${accent}24` } : null,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${collapsed ? "展开" : "折叠"} ${host.label}`}
        accessibilityState={{ expanded: !collapsed }}
        onPress={toggle}
        style={styles.header}
      >
        <View style={[styles.lead, collapsed ? { opacity: 0.5 } : null]}>
          <Icon
            name={shared.localHostId === host.serverId ? "Monitor" : "Server"}
            size={13}
            color={view.theme.colors.foregroundMuted}
          />
        </View>
        <View style={[styles.hostPill, { backgroundColor: `${accent}26` }]}>
          <Text numberOfLines={1} style={[styles.hostPillText, { color: accent }]}>
            {host.label}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
        <Text style={styles.meta}>{online ? visible.length : host.status}</Text>
      </Pressable>
      {collapsed ? null : (
        <View>
          {visible.map((workspace) => (
            <WorkspaceRow key={workspace.key} reference={workspace} context={shared} />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * One pinned project: a card with a spine in the project's color, a header naming the project
 * once, and its workspaces listed below without their project tags.
 */
function ProjectGroup({
  items,
  hosts,
  shared,
}: {
  items: readonly WorkspaceRef[];
  hosts: readonly PluginHostSummary[];
  shared: Shared;
}) {
  const { view, styles, values, preferences, toggleCollapsed } = shared;
  // Every item shares the project, so the first one supplies its name and ref.
  const first = useWorkspace(items[0]);
  const project = first?.project;
  const key = project ? projectKey(project.key) : "";
  const toggle = useCallback(() => toggleCollapsed(key), [toggleCollapsed, key]);
  const unpin = useCallback(() => {
    if (!project) return;
    preferences.update({
      pinnedProjects: values.pinnedProjects.filter((entry) => entry !== project.key),
    });
  }, [preferences, values.pinnedProjects, project]);
  if (!first || !project) return null;

  const collapsed = values.collapsed.includes(key);
  const name = first.projectDisplayName;
  const { backgroundColor: color } = projectAvatarStyle(project.key);
  const host = hosts.find((entry) => entry.serverId === first.hostId);
  const hostColor = shared.hostColors.get(first.hostId) ?? view.theme.colors.border;
  const muted = view.theme.colors.foregroundMuted;

  return (
    <View
      style={[styles.projectGroup, { backgroundColor: `${color}14`, borderColor: `${color}3d` }]}
    >
      <View pointerEvents="none" style={[styles.projectSpine, { backgroundColor: color }]} />
      <View style={styles.projectHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${collapsed ? "展开" : "折叠"}项目 ${name}`}
          accessibilityState={{ expanded: !collapsed }}
          onPress={toggle}
          style={styles.projectHeaderMain}
        >
          <View style={styles.lead}>
            <View style={[styles.projectAvatar, { backgroundColor: color }]}>
              <Text style={styles.projectAvatarText}>{initial(name)}</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={styles.projectName}>
            {name}
          </Text>
          {hosts.length > 1 && host ? (
            <View style={[styles.hostPill, styles.hostPillSmall, { backgroundColor: `${hostColor}26` }]}>
              <Text numberOfLines={1} style={[styles.hostPillTextSmall, { color: hostColor }]}>
                {host.label}
              </Text>
            </View>
          ) : null}
          <View style={styles.headerSpacer} />
          <Text style={styles.meta}>{items.length}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`取消置顶项目 ${name}`}
          onPress={unpin}
          hitSlop={6}
          style={styles.projectAction}
        >
          <Icon name="PinOff" size={12} color={muted} />
        </Pressable>
      </View>
      {collapsed ? null : (
        <View style={styles.projectRows}>
          {items.map((workspace) => (
            <WorkspaceRow key={workspace.key} reference={workspace} context={shared} hideProject />
          ))}
        </View>
      )}
    </View>
  );
}

function PinnedSection({
  hosts,
  shared,
}: {
  hosts: readonly PluginHostSummary[];
  shared: Shared;
}) {
  const { styles, values, compare } = shared;
  const where = useCallback(
    (workspace: Workspace) =>
      (!!workspace.pinnedAt || inPinnedProject(workspace, values.pinnedProjects)) &&
      matchesFilters(workspace, values),
    [values],
  );
  const pinned = useWorkspaces({ where });
  const whereProject = useCallback(
    (workspace: Workspace) =>
      inPinnedProject(workspace, values.pinnedProjects) && matchesFilters(workspace, values),
    [values],
  );
  const groups = useWorkspaces({ where: whereProject, orderBy: compare, groupBy: groupByProject });
  // Projects keep the order they were pinned in, whatever the workspace sort is.
  const projects = useMemo(
    () =>
      [...groups].sort(
        (a, b) => values.pinnedProjects.indexOf(a.key) - values.pinnedProjects.indexOf(b.key),
      ),
    [groups, values.pinnedProjects],
  );
  if (pinned.length === 0) return null;

  return (
    <View>
      {projects.map((group) => (
        <ProjectGroup key={group.key} items={group.items} hosts={hosts} shared={shared} />
      ))}
      {hosts.map((host) => (
        <HostSection key={host.serverId} host={host} mode="pinned" shared={shared} />
      ))}
      <View style={styles.pinnedDivider} />
    </View>
  );
}

export function HostSidebar(view: PluginSidebarViewProps) {
  const hosts = useHosts();
  const preferences = usePreferences();
  const { values, update } = preferences;
  const localHostId = useLocalHostId();
  const styles = useMemo(
    () => makeStyles(view.theme, view.layout.compact),
    [view.theme, view.layout.compact],
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const compare = useMemo(() => compareWorkspaces(values.sort), [values.sort]);
  const toggleCollapsed = useCallback(
    (key: string) => update({ collapsed: toggled(values.collapsed, key) }),
    [update, values.collapsed],
  );
  // Sorting by server id keeps each host's color stable across restarts and host renames.
  const hostColors = useMemo(() => {
    const ids = hosts.map((host) => host.serverId).sort();
    return new Map(ids.map((id, index) => [id, HOST_COLORS[index % HOST_COLORS.length]]));
  }, [hosts]);
  const shared = useMemo<Shared>(
    () => ({
      view,
      styles,
      values,
      now,
      expanded,
      setExpanded,
      preferences,
      compare,
      toggleCollapsed,
      localHostId,
      hostColors,
    }),
    [
      view,
      styles,
      values,
      now,
      expanded,
      preferences,
      compare,
      toggleCollapsed,
      localHostId,
      hostColors,
    ],
  );
  const shownHosts = hosts.filter((host) => !values.hiddenHosts.includes(host.serverId));

  return (
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
      <Toolbar
        preferences={preferences}
        hosts={hosts}
        styles={styles}
        muted={view.theme.colors.foregroundMuted}
        strong={view.theme.colors.foreground}
      />
      {preferences.error ? <Text style={styles.error}>{preferences.error}</Text> : null}
      <PinnedSection hosts={shownHosts} shared={shared} />
      {hosts.length === 0 ? <Text style={styles.note}>还没有配置任何 host</Text> : null}
      {shownHosts.map((host) => (
        <HostSection key={host.serverId} host={host} mode="main" shared={shared} />
      ))}
    </ScrollView>
  );
}
