import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { WorkspaceIndicator } from "@getpaseo/plugin";
import { useProject, type ProjectRef, type WorkspaceRef } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/ui";
import { useHover, useSidebar } from "./context";
import { NeedsInputGlyph, ProjectStatusVisual, StatusRing } from "./indicators";
import { clusterByHost, splitVisible, STATUS_LABEL, WORKSPACE_LIMIT, PINNED_LIMIT } from "./model";
import { identityColor, withAlpha } from "./palette";
import { IconButton, WorkspaceRow, type RowVariant } from "./workspace-row";

/** "Pinned" and "Workspaces": a muted 12px title, optionally collapsible, with trailing actions. */
export function SectionHeader({
  title,
  collapsed,
  onToggle,
  actions,
}: {
  title: string;
  /** Undefined for a header that does not collapse. */
  collapsed?: boolean;
  onToggle?: () => void;
  actions?: ReactNode;
}) {
  const { theme, touch, pointer } = useSidebar();
  const hover = useHover();
  const showChevron = onToggle && (hover.hovered || !pointer);
  const label = <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>{title}</Text>;
  return (
    <View
      style={{
        minHeight: touch ? 44 : 36,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 8,
        paddingRight: 4,
        gap: 8,
      }}
    >
      {onToggle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} ${title}`}
          accessibilityState={{ expanded: !collapsed }}
          onPress={onToggle}
          onHoverIn={hover.onHoverIn}
          onHoverOut={hover.onHoverOut}
          style={{
            alignSelf: "stretch",
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginLeft: -8,
            paddingHorizontal: 8,
          }}
        >
          {label}
          {showChevron ? (
            <Icon
              name={collapsed ? "ChevronRight" : "ChevronDown"}
              size={touch ? 14 : 12}
              color={theme.colors.foregroundMuted}
            />
          ) : null}
        </Pressable>
      ) : (
        label
      )}
      {actions ? <View style={{ flexDirection: "row", gap: 4 }}>{actions}</View> : null}
    </View>
  );
}

/** A full-width row shared by project headers and status group headers. */
function GroupHeaderRow({
  label,
  leading,
  collapsed,
  onToggle,
  actions,
  hover,
  bold,
}: {
  label: string;
  /** Project headers set this; status group headers keep the regular weight. */
  bold?: boolean;
  leading: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  hover: ReturnType<typeof useHover>;
}) {
  const { theme, palette, touch } = useSidebar();
  // Hover is tracked on a wrapping View so the + button does not end it: see useHover.
  return (
    <View onPointerEnter={hover.onPointerEnter} onPointerLeave={hover.onPointerLeave}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} ${label}`}
        accessibilityState={{ expanded: !collapsed }}
        onPress={onToggle}
        style={({ pressed }) => ({
          minHeight: touch ? 44 : 36,
          paddingVertical: 8,
          paddingHorizontal: 8,
          borderRadius: 8,
          marginBottom: 4,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          backgroundColor: pressed
            ? palette.pressed
            : hover.hovered
              ? palette.hover
              : "transparent",
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          {leading}
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: theme.colors.foregroundMuted,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: bold ? "600" : "400",
            }}
          >
            {label}
          </Text>
        </View>
        {actions ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginRight: -6 }}>
            {actions}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

function Chevron({ collapsed }: { collapsed: boolean }) {
  const { touch } = useSidebar();
  return (
    <View
      style={{ width: touch ? 20 : 16, height: 20, alignItems: "center", justifyContent: "center" }}
    >
      <Icon name={collapsed ? "ChevronRight" : "ChevronDown"} size={14} color="#9ca3af" />
    </View>
  );
}

export function ShowMoreRow({
  hiddenCount,
  expanded,
  onToggle,
  indent,
}: {
  hiddenCount: number;
  expanded: boolean;
  onToggle: () => void;
  indent: number;
}) {
  const { theme, palette, touch } = useSidebar();
  const hover = useHover();
  const color = hover.hovered ? theme.colors.foreground : theme.colors.foregroundMuted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={expanded ? "Show less" : `Show ${hiddenCount} more`}
      onPress={onToggle}
      onHoverIn={hover.onHoverIn}
      onHoverOut={hover.onHoverOut}
      style={({ pressed }) => ({
        minHeight: touch ? 36 : 28,
        marginBottom: 2,
        paddingVertical: 4,
        paddingLeft: indent,
        paddingRight: 12,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: pressed ? palette.pressed : hover.hovered ? palette.hover : "transparent",
      })}
    >
      <View style={{ width: touch ? 20 : 16, alignItems: "center" }}>
        <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={12} color={color} />
      </View>
      <Text style={{ color, fontSize: 12, lineHeight: 16 }}>
        {expanded ? "Show less" : `Show more (${hiddenCount})`}
      </Text>
    </Pressable>
  );
}

/** Rows of one group with the "Show more" rule applied. */
export function GroupRows({
  items,
  variant,
  limit,
  doneKeys,
  expandKey,
  expanded,
  setExpanded,
  hideHost,
}: {
  items: readonly WorkspaceRef[];
  variant: RowVariant;
  hideHost?: boolean;
  limit: number;
  /** Keys of done workspaces; only those hide past the limit. Undefined hides every row. */
  doneKeys?: ReadonlySet<string>;
  expandKey: string;
  expanded: ReadonlySet<string>;
  setExpanded: (key: string, on: boolean) => void;
}) {
  const { view, preferences, localHostId, hosts } = useSidebar();
  const isExpanded = expanded.has(expandKey);
  const cluster = preferences.values.clusterByHost;
  const hostLabel = useCallback(
    (hostId: string) => hosts.find((host) => host.serverId === hostId)?.label ?? hostId,
    [hosts],
  );
  const ordered = useMemo(
    () => (cluster ? clusterByHost(items, localHostId, hostLabel) : items),
    [cluster, items, localHostId, hostLabel],
  );
  // Host headings only help when the section mixes hosts.
  const labelled = cluster && new Set(items.map((item) => item.hostId)).size > 1;
  const hostKey = (hostId: string) => `${expandKey}|host:${hostId}`;
  const collapsedKeys = preferences.values.collapsed;
  const open = labelled
    ? ordered.filter((item) => !collapsedKeys.includes(hostKey(item.hostId)))
    : ordered;
  const { hoisted, shown, hiddenCount } = splitVisible(open, {
    limit,
    expanded: isExpanded,
    isDone: doneKeys ? (item) => doneKeys.has(item.key) : undefined,
    activeKey: view.active.workspace?.key,
  });
  const toggle = useCallback(
    () => setExpanded(expandKey, !isExpanded),
    [setExpanded, expandKey, isExpanded],
  );
  const indent = variant === "status" ? 16 : 8;
  const row = (reference: WorkspaceRef) => (
    <WorkspaceRow
      key={reference.key}
      reference={reference}
      variant={variant}
      hideHost={labelled || hideHost}
      // A host group already indents status rows.
      indent={labelled && variant === "status" ? 8 : undefined}
    />
  );
  // Every host keeps its heading, collapsed or not, in the clustered order.
  const hostOrder = labelled ? [...new Set(ordered.map((item) => item.hostId))] : [];
  return (
    <>
      {hoisted ? <WorkspaceRow reference={hoisted} variant={variant} /> : null}
      {labelled
        ? hostOrder.map((hostId) => (
            <HostGroup
              key={hostId}
              hostId={hostId}
              label={hostLabel(hostId)}
              // Under the status icon in status groups, under the section's left edge otherwise.
              guideX={variant === "status" ? 15 : 7}
              collapseKey={hostKey(hostId)}
              count={ordered.filter((item) => item.hostId === hostId).length}
            >
              {shown.filter((item) => item.hostId === hostId).map(row)}
            </HostGroup>
          ))
        : shown.map(row)}
      {hiddenCount > 0 || isExpanded ? (
        isExpanded && open.length <= limit ? null : (
          <ShowMoreRow
            hiddenCount={hiddenCount}
            expanded={isExpanded}
            onToggle={toggle}
            indent={indent}
          />
        )
      ) : null}
    </>
  );
}

/** Whether a collapse key is set, and a toggle that flips it in the stored preferences. */
export function useCollapsed(key: string) {
  const { preferences } = useSidebar();
  const collapsed = preferences.values.collapsed.includes(key);
  const toggle = useCallback(
    () =>
      preferences.update((values) => ({
        collapsed: values.collapsed.includes(key)
          ? values.collapsed.filter((entry) => entry !== key)
          : [...values.collapsed, key],
      })),
    [preferences, key],
  );
  return { collapsed, toggle };
}

/**
 * A heading naming the host of what follows, in the host's identity color. Pressing it folds
 * what follows. `section` is the larger heading above a host's projects.
 */
export function HostHeading({
  hostId,
  label,
  guideX,
  section,
  collapseKey,
  count,
}: {
  hostId: string;
  label: string;
  /** Horizontal centre of the host icon, where the guide line below it runs. */
  guideX: number;
  section?: boolean;
  collapseKey: string;
  /** Shown while collapsed, so a folded host still says how much it holds. */
  count: number;
}) {
  const { palette, localHostId, pointer, theme } = useSidebar();
  const hover = useHover();
  const { collapsed, toggle } = useCollapsed(collapseKey);
  const color = identityColor(hostId, palette.dark).text;
  const size = section ? 12 : 11;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} ${label}`}
      accessibilityState={{ expanded: !collapsed }}
      onPress={toggle}
      onHoverIn={hover.onHoverIn}
      onHoverOut={hover.onHoverOut}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
        maxWidth: "100%",
        marginLeft: guideX - 4 - size / 2,
        marginTop: section ? 6 : 2,
        marginBottom: section ? 2 : 0,
        paddingHorizontal: 4,
        paddingVertical: section ? 4 : 2,
        borderRadius: 6,
        opacity: pressed ? 0.7 : 1,
        backgroundColor: hover.hovered ? palette.hover : "transparent",
      })}
    >
      <Icon name={hostId === localHostId ? "Monitor" : "Server"} size={size} color={color} />
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          color,
          fontSize: size,
          lineHeight: section ? 16 : 14,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
      {collapsed ? (
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: size, lineHeight: 14 }}>
          {count}
        </Text>
      ) : null}
      {collapsed || hover.hovered || !pointer ? (
        <Icon name={collapsed ? "ChevronRight" : "ChevronDown"} size={size} color={color} />
      ) : null}
    </Pressable>
  );
}

/** Heading metrics: guide lines start just below the host icon. */
function guideTop(section: boolean): number {
  const marginTop = section ? 6 : 2;
  const paddingVertical = section ? 4 : 2;
  const lineHeight = section ? 16 : 14;
  const size = section ? 12 : 11;
  return marginTop + paddingVertical + lineHeight / 2 + size / 2 + 3;
}

/**
 * A host heading and what belongs to it. A thin line in the host's color drops from the host
 * icon down the left of its projects or workspaces, which are indented to clear it.
 */
export function HostGroup({
  hostId,
  label,
  guideX,
  section,
  collapseKey,
  count,
  bottomGap = 2,
  children,
}: {
  hostId: string;
  label: string;
  guideX: number;
  section?: boolean;
  collapseKey: string;
  count: number;
  /** Space below the last child the line should not reach into. */
  bottomGap?: number;
  children: ReactNode;
}) {
  const { palette } = useSidebar();
  const { collapsed } = useCollapsed(collapseKey);
  const color = identityColor(hostId, palette.dark).text;
  return (
    <View>
      <HostHeading
        hostId={hostId}
        label={label}
        guideX={guideX}
        section={section}
        collapseKey={collapseKey}
        count={count}
      />
      {collapsed ? null : (
        <>
          <View style={{ paddingLeft: guideX + 5 }}>{children}</View>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: guideX - 0.5,
              width: 1,
              top: guideTop(!!section),
              bottom: bottomGap,
              borderRadius: 0.5,
              backgroundColor: withAlpha(color, 0.45),
            }}
          />
        </>
      )}
    </View>
  );
}

export interface ProjectBlockData {
  /** Identity of the block: the view key, or host and view key when hosts are kept apart. */
  key: string;
  /** Host of the first project ref; the only host when hosts are kept apart. */
  hostId: string;
  viewKey: string;
  /** One ref per host the project lives on; the first names the project. */
  projects: readonly ProjectRef[];
  items: readonly WorkspaceRef[];
  /** The project has no workspaces at all: show the "New workspace" row. */
  empty: boolean;
  /** Status of the project's workspaces, for the collapsed badge. */
  aggregate: WorkspaceIndicator;
}

export function ProjectBlock({
  block,
  doneKeys,
  expanded,
  setExpanded,
  hideHost,
}: {
  block: ProjectBlockData;
  /** Set under a host heading, which already names the host. */
  hideHost?: boolean;
  doneKeys: ReadonlySet<string>;
  expanded: ReadonlySet<string>;
  setExpanded: (key: string, on: boolean) => void;
}) {
  const { view, theme, palette, touch, pointer, preferences } = useSidebar();
  const hover = useHover();
  const name = useProject(block.projects[0], (project) => project.displayName) ?? "";
  const collapseKey = `project:${block.key}`;
  const collapsed = preferences.values.collapsed.includes(collapseKey);
  const toggle = useCallback(
    () =>
      preferences.update((values) => ({
        collapsed: values.collapsed.includes(collapseKey)
          ? values.collapsed.filter((key) => key !== collapseKey)
          : [...values.collapsed, collapseKey],
      })),
    [preferences, collapseKey],
  );
  // New workspaces start on the active workspace's host when the project lives there.
  const activeHost = view.active.workspace?.hostId;
  const target =
    block.projects.find((project) => project.hostId === activeHost) ?? block.projects[0];
  const newWorkspace = useCallback(
    () => view.navigation.openProject(target),
    [view.navigation, target],
  );
  const showActions = hover.hovered || !pointer;

  const leading = hover.hovered ? (
    <Chevron collapsed={collapsed} />
  ) : (
    <ProjectStatusVisual
      viewKey={block.viewKey}
      name={name}
      indicator={collapsed && block.aggregate !== "done" ? block.aggregate : null}
      loading={false}
      backdrop={palette.background === "transparent" ? theme.colors.surface0 : palette.background}
      touch={touch}
      palette={palette}
      theme={theme}
    />
  );

  return (
    <View style={{ paddingBottom: !collapsed && (block.items.length > 0 || block.empty) ? 12 : 0 }}>
      <GroupHeaderRow
        label={name}
        bold
        leading={leading}
        collapsed={collapsed}
        onToggle={toggle}
        hover={hover}
        actions={
          <View
            style={{ opacity: showActions ? 1 : 0 }}
            pointerEvents={showActions ? "auto" : "none"}
          >
            <IconButton
              icon="Plus"
              label={`New workspace in ${name}`}
              onPress={newWorkspace}
              size={24}
              iconSize={15}
              hoverFill={palette.hover}
            />
          </View>
        }
      />
      {collapsed ? null : block.empty ? (
        <GhostNewWorkspace onPress={newWorkspace} />
      ) : (
        <GroupRows
          items={block.items}
          hideHost={hideHost}
          variant="project"
          limit={WORKSPACE_LIMIT}
          doneKeys={doneKeys}
          expandKey={collapseKey}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      )}
    </View>
  );
}

function GhostNewWorkspace({ onPress }: { onPress: () => void }) {
  const { theme, palette, touch } = useSidebar();
  const hover = useHover();
  const [pressed, setPressed] = useState(false);
  const color = hover.hovered || pressed ? theme.colors.foreground : theme.colors.foregroundMuted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="New workspace"
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onHoverIn={hover.onHoverIn}
      onHoverOut={hover.onHoverOut}
      style={{
        minHeight: touch ? 44 : 36,
        marginBottom: 2,
        paddingVertical: 8,
        paddingLeft: 16,
        paddingRight: 12,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: pressed ? palette.pressed : hover.hovered ? palette.hover : "transparent",
      }}
    >
      <View style={{ width: touch ? 20 : 16, alignItems: "center" }}>
        <Icon name="Plus" size={touch ? 18 : 14} color={color} />
      </View>
      <Text style={{ color, fontSize: 14 }}>New workspace</Text>
    </Pressable>
  );
}

function StatusGlyph({ indicator }: { indicator: WorkspaceIndicator }) {
  const { palette, theme, touch } = useSidebar();
  let content;
  if (indicator === "running") content = <StatusRing color={palette.dot.running} />;
  else if (indicator === "needs_input")
    content = <NeedsInputGlyph palette={palette} theme={theme} />;
  else {
    const color =
      indicator === "failed"
        ? palette.dot.danger
        : indicator === "attention"
          ? palette.dot.success
          : palette.extraMuted;
    content = (
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: color,
          opacity: indicator === "done" ? 0.5 : 1,
        }}
      />
    );
  }
  return (
    <View
      style={{ width: touch ? 20 : 16, height: 20, alignItems: "center", justifyContent: "center" }}
    >
      {content}
    </View>
  );
}

export function StatusGroup({
  indicator,
  title,
  items,
  doneKeys,
  expanded,
  setExpanded,
}: {
  indicator: WorkspaceIndicator;
  title: string | null;
  items: readonly WorkspaceRef[];
  doneKeys: ReadonlySet<string>;
  expanded: ReadonlySet<string>;
  setExpanded: (key: string, on: boolean) => void;
}) {
  const { palette, preferences } = useSidebar();
  const hover = useHover();
  const key = `status:${indicator}`;
  const collapsed = preferences.values.collapsed.includes(key);
  const toggle = useCallback(
    () =>
      preferences.update((values) => ({
        collapsed: values.collapsed.includes(key)
          ? values.collapsed.filter((entry) => entry !== key)
          : [...values.collapsed, key],
      })),
    [preferences, key],
  );
  const label = title ?? STATUS_LABEL[indicator];
  return (
    <View style={{ paddingBottom: collapsed ? 0 : 12 }}>
      <GroupHeaderRow
        label={label}
        leading={
          hover.hovered ? <Chevron collapsed={collapsed} /> : <StatusGlyph indicator={indicator} />
        }
        collapsed={collapsed}
        onToggle={toggle}
        hover={hover}
      />
      {collapsed ? null : (
        <GroupRows
          items={items}
          variant="status"
          limit={WORKSPACE_LIMIT}
          doneKeys={doneKeys}
          expandKey={key}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      )}
    </View>
  );
}

export function PinnedSection({
  items,
  expanded,
  setExpanded,
}: {
  items: readonly WorkspaceRef[];
  expanded: ReadonlySet<string>;
  setExpanded: (key: string, on: boolean) => void;
}) {
  const { preferences } = useSidebar();
  const collapsed = preferences.values.collapsed.includes("pinned");
  const toggle = useCallback(
    () =>
      preferences.update((values) => ({
        collapsed: values.collapsed.includes("pinned")
          ? values.collapsed.filter((key) => key !== "pinned")
          : [...values.collapsed, "pinned"],
      })),
    [preferences],
  );
  if (items.length === 0) return null;
  return (
    <View style={{ marginBottom: 4 }}>
      <SectionHeader title="Pinned" collapsed={collapsed} onToggle={toggle} />
      {collapsed ? null : (
        <GroupRows
          items={items}
          variant="pinned"
          limit={PINNED_LIMIT}
          expandKey="pinned"
          expanded={expanded}
          setExpanded={setExpanded}
        />
      )}
    </View>
  );
}

export function EmptyCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; onPress: () => void };
}) {
  const { theme } = useSidebar();
  return (
    <View
      style={{
        marginTop: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        gap: 4,
      }}
    >
      <Text style={{ color: theme.colors.foreground, fontSize: 12 }}>{title}</Text>
      <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>{description}</Text>
      {action ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
            style={({ pressed }) => ({
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: pressed ? theme.colors.border : theme.colors.surface2,
            })}
          >
            <Text style={{ color: theme.colors.foreground, fontSize: 12 }}>{action.label}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
