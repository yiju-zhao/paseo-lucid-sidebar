import { useCallback, type ReactNode } from "react";
import type { Guides } from "../shared/preferences";
import { Pressable, Text, View } from "react-native";
import { useProject, type ProjectRef, type WorkspaceRef } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/ui";
import { disclosureLabel, fill, useHover, useSidebar } from "./context";
import { IconButton } from "./controls";
import { IndicatorGlyph, LeadingSlot, ProjectStatusVisual } from "./indicators";
import { keys } from "./keys";
import { type HostBlocks, type ProjectBlock, type RowList, type StatusSection } from "./layout";
import { STATUS_LABEL, toggled } from "./model";
import { withAlpha } from "./palette";
import { useToggleExpanded } from "./ui-state";
import { WorkspaceRow, type RowVariant } from "./workspace-row";

/** Renderers for the list model in client/layout.ts. They draw; they do not decide. */

/** Flips a stored collapse key. */
function useCollapseToggle(key: string): () => void {
  const { preferences } = useSidebar();
  return useCallback(
    () => preferences.update((values) => ({ collapsed: toggled(values.collapsed, key) })),
    [preferences, key],
  );
}

/** "Pinned" and "Workspaces": a muted 12px title, optionally collapsible, with trailing actions. */
export function SectionHeader({
  title,
  collapseKey,
  collapsed = false,
  actions,
}: {
  title: string;
  /** Set for a header that folds its section. */
  collapseKey?: string;
  collapsed?: boolean;
  actions?: ReactNode;
}) {
  const { theme, touch, pointer, metrics } = useSidebar();
  const hover = useHover();
  const toggle = useCollapseToggle(collapseKey ?? "");
  const label = <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>{title}</Text>;
  return (
    <View
      style={{
        minHeight: metrics.headerMinHeight,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 8,
        paddingRight: 4,
        gap: 8,
      }}
    >
      {collapseKey ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={disclosureLabel(collapsed, title)}
          accessibilityState={{ expanded: !collapsed }}
          onPress={toggle}
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
          {hover.hovered || !pointer ? (
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

/**
 * A full-width disclosure row: project headers and status group headers. On hover the leading
 * visual turns into a chevron, and `actions` show (always on touch).
 */
function DisclosureRow({
  label,
  bold,
  leading,
  collapseKey,
  collapsed,
  actions,
  compact,
}: {
  label: string;
  bold?: boolean;
  /** Project headers: a shorter row with less space below, on pointer layouts. */
  compact?: boolean;
  leading: ReactNode;
  collapseKey: string;
  collapsed: boolean;
  actions?: ReactNode;
}) {
  const { theme, palette, pointer, metrics } = useSidebar();
  const hover = useHover();
  const toggle = useCollapseToggle(collapseKey);
  const showActions = hover.hovered || !pointer;
  // Hover is tracked on a wrapping View so the actions do not end it: see useHover.
  return (
    <View onPointerEnter={hover.onPointerEnter} onPointerLeave={hover.onPointerLeave}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={disclosureLabel(collapsed, label)}
        accessibilityState={{ expanded: !collapsed }}
        onPress={toggle}
        style={({ pressed }) => ({
          minHeight: compact ? metrics.projectHeaderMinHeight : metrics.headerMinHeight,
          paddingVertical: compact ? metrics.projectHeaderPaddingY : metrics.headerPaddingY,
          paddingHorizontal: 8,
          borderRadius: 8,
          marginBottom: compact ? metrics.headerMargin : 4,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          backgroundColor: fill(palette, pressed, hover.hovered),
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          {hover.hovered ? (
            <LeadingSlot>
              <Icon
                name={collapsed ? "ChevronRight" : "ChevronDown"}
                size={14}
                color={palette.chevron}
              />
            </LeadingSlot>
          ) : (
            leading
          )}
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 2,
              marginRight: -6,
              opacity: showActions ? 1 : 0,
            }}
            pointerEvents={showActions ? "auto" : "none"}
          >
            {actions}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const GUIDE_WIDTH: Record<Guides, number> = { off: 0, thin: 1, thick: 2 };

/** Host heading metrics, shared by the heading and the guide line below its icon. */
const HOST_HEADING = {
  section: { size: 13, lineHeight: 18, marginTop: 6, marginBottom: 2, paddingVertical: 4 },
  inline: { size: 13, lineHeight: 18, marginTop: 2, marginBottom: 0, paddingVertical: 2 },
};

/**
 * A host heading and what belongs to it. Pressing the heading folds the host. A thin line in
 * the host's color drops from the host icon down the left of its contents, which are indented
 * to clear it. `section` is the larger heading above a host's projects.
 */
function HostGroup({
  hostId,
  guideX,
  section = false,
  collapseKey,
  collapsed,
  count,
  guideBottom = 2,
  children,
}: {
  hostId: string;
  /** Horizontal centre of the host icon, where the guide line runs. */
  guideX: number;
  section?: boolean;
  collapseKey: string;
  collapsed: boolean;
  /** Shown while folded, so a folded host still says how much it holds. */
  count: number;
  guideBottom?: number;
  children: ReactNode;
}) {
  const { theme, palette, pointer, hosts, preferences } = useSidebar();
  const guideWidth = GUIDE_WIDTH[preferences.values.appearance.guides];
  const hover = useHover();
  const toggle = useCollapseToggle(collapseKey);
  const metrics = section ? HOST_HEADING.section : HOST_HEADING.inline;
  const color = hosts.color(hostId).text;
  const label = hosts.label(hostId);
  const paddingHorizontal = 4;
  const iconCentre = metrics.marginTop + metrics.paddingVertical + metrics.lineHeight / 2;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={disclosureLabel(collapsed, label)}
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
          marginLeft: guideX - paddingHorizontal - metrics.size / 2,
          marginTop: metrics.marginTop,
          marginBottom: metrics.marginBottom,
          paddingHorizontal,
          paddingVertical: metrics.paddingVertical,
          borderRadius: 6,
          opacity: pressed ? 0.7 : 1,
          backgroundColor: hover.hovered ? palette.hover : "transparent",
        })}
      >
        <Icon name={hosts.icon(hostId)} size={metrics.size} color={color} />
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            color,
            fontSize: metrics.size,
            lineHeight: metrics.lineHeight,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
        {collapsed ? (
          <Text
            style={{
              color: theme.colors.foregroundMuted,
              fontSize: metrics.size,
              lineHeight: metrics.lineHeight,
            }}
          >
            {count}
          </Text>
        ) : null}
        {collapsed || hover.hovered || !pointer ? (
          <Icon
            name={collapsed ? "ChevronRight" : "ChevronDown"}
            size={metrics.size}
            color={color}
          />
        ) : null}
      </Pressable>
      {collapsed ? null : (
        <>
          <View style={{ paddingLeft: guideX + 5 }}>{children}</View>
          {guideWidth > 0 ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: guideX - guideWidth / 2,
                width: guideWidth,
                top: iconCentre + metrics.size / 2 + 3,
                bottom: guideBottom,
                borderRadius: guideWidth / 2,
                backgroundColor: withAlpha(color, 0.45),
              }}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

function ShowMoreRow({
  listKey,
  hidden,
  expanded,
  indent,
}: {
  listKey: string;
  hidden: number;
  expanded: boolean;
  indent: number;
}) {
  const { theme, palette, touch } = useSidebar();
  const hover = useHover();
  const toggleExpanded = useToggleExpanded();
  const color = hover.hovered ? theme.colors.foreground : theme.colors.foregroundMuted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={expanded ? "Show less" : `Show ${hidden} more`}
      onPress={() => toggleExpanded(listKey)}
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
        backgroundColor: fill(palette, pressed, hover.hovered),
      })}
    >
      <LeadingSlot>
        <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={12} color={color} />
      </LeadingSlot>
      <Text style={{ color, fontSize: 12, lineHeight: 16 }}>
        {expanded ? "Show less" : `Show more (${hidden})`}
      </Text>
    </Pressable>
  );
}

/** A section's rows: flat, or under host headings; then "Show more" when it hides rows. */
function RowListView({
  list,
  variant,
  underHost = false,
}: {
  list: RowList<WorkspaceRef>;
  variant: RowVariant;
  /** The whole list already sits under a host heading. */
  underHost?: boolean;
}) {
  const row = (reference: WorkspaceRef, underHost: boolean) => (
    <WorkspaceRow
      key={reference.key}
      reference={reference}
      variant={variant}
      underHost={underHost}
    />
  );
  return (
    <>
      {list.hosts
        ? list.hosts.map((host) => (
            <HostGroup
              key={host.hostId}
              hostId={host.hostId}
              // Under the status icon in status groups, under the section's left edge otherwise.
              guideX={variant === "status" ? 15 : 7}
              collapseKey={host.collapseKey}
              collapsed={host.collapsed}
              count={host.total}
            >
              {host.rows.map((reference) => row(reference, true))}
            </HostGroup>
          ))
        : list.rows.map((reference) => row(reference, underHost))}
      {list.more ? (
        <ShowMoreRow
          listKey={list.key}
          hidden={list.more.hidden}
          expanded={list.more.expanded}
          indent={variant === "status" ? 16 : 8}
        />
      ) : null}
    </>
  );
}

export function PinnedSection({ list }: { list: RowList<WorkspaceRef> }) {
  const { preferences } = useSidebar();
  if (list.rows.length === 0 && !list.hosts?.length) return null;
  const collapsed = preferences.values.collapsed.includes(keys.pinned);
  return (
    <View style={{ marginBottom: 4 }}>
      <SectionHeader title="Pinned" collapseKey={keys.pinned} collapsed={collapsed} />
      {collapsed ? null : <RowListView list={list} variant="pinned" />}
    </View>
  );
}

function ProjectBlockView({
  block,
  underHost,
}: {
  block: ProjectBlock<ProjectRef, WorkspaceRef>;
  underHost: boolean;
}) {
  const { view, palette, readOnly } = useSidebar();
  const name = useProject(block.projects[0], (project) => project.displayName) ?? "";
  // New workspaces start on the active workspace's host when the project lives there.
  const activeHost = view.active.workspace?.hostId;
  const target =
    block.projects.find((project) => project.hostId === activeHost) ?? block.projects[0];
  const newWorkspace = useCallback(
    () => view.navigation.openProject(target),
    [view.navigation, target],
  );
  return (
    <View style={{ paddingBottom: block.spacing }}>
      <DisclosureRow
        label={name}
        bold
        compact
        collapseKey={block.collapseKey}
        collapsed={block.collapsed}
        leading={
          <ProjectStatusVisual
            viewKey={block.viewKey}
            name={name}
            indicator={block.collapsed ? block.aggregate : null}
            backdrop={palette.backdrop}
          />
        }
        actions={
          readOnly ? undefined : (
            <IconButton
              icon="Plus"
              label={`New workspace in ${name}`}
              onPress={newWorkspace}
              size={24}
              iconSize={15}
              hoverFill={palette.hover}
            />
          )
        }
      />
      {block.collapsed ? null : (
        <RowListView list={block.rows} variant="project" underHost={underHost} />
      )}
    </View>
  );
}

export function ProjectBlocks({
  blocks,
  underHost = false,
}: {
  blocks: ProjectBlock<ProjectRef, WorkspaceRef>[];
  /** The blocks sit under a host heading, so rows need not name their host. */
  underHost?: boolean;
}) {
  return (
    <>
      {blocks.map((block) => (
        <ProjectBlockView key={block.key} block={block} underHost={underHost} />
      ))}
    </>
  );
}

/** Project blocks under one host heading. */
export function HostBlocksView({ host }: { host: HostBlocks<ProjectRef, WorkspaceRef> }) {
  return (
    <HostGroup
      hostId={host.hostId}
      guideX={7}
      section
      collapseKey={host.collapseKey}
      collapsed={host.collapsed}
      count={host.count}
      guideBottom={host.guideBottom}
    >
      <ProjectBlocks blocks={host.blocks} underHost />
    </HostGroup>
  );
}

export function StatusGroupView({ section }: { section: StatusSection<WorkspaceRef> }) {
  const { metrics } = useSidebar();
  return (
    <View style={{ paddingBottom: section.collapsed ? 0 : metrics.statusSpacing }}>
      <DisclosureRow
        label={section.title ?? STATUS_LABEL[section.indicator] ?? section.indicator}
        collapseKey={section.collapseKey}
        collapsed={section.collapsed}
        leading={
          <LeadingSlot>
            <IndicatorGlyph indicator={section.indicator} />
          </LeadingSlot>
        }
      />
      {section.collapsed ? null : <RowListView list={section.rows} variant="status" />}
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
