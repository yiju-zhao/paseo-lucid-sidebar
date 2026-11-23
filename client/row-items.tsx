import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { openExternalUrl } from "@getpaseo/plugin/client";
import { Icon, useToast } from "@getpaseo/plugin/client/ui";
import type { RowItem, SidebarPreferences } from "../shared/preferences";
import { useHover, useSidebar, type SidebarContextValue } from "./context";
import { ChecksGlyph } from "./indicators";
import { labelKey, normalizeBranch, type Workspace } from "./model";
import { identityColor } from "./palette";
import type { PullRequestState, WorkspaceRuntime } from "./runtime";

/**
 * The items of a row's second line, in display order. Each item owns its switch in the Show
 * menu, whether it needs a workspace subscription, and how it draws; MetaRow, the Show menu and
 * the runtime watcher all read this list.
 */
export interface ItemContext {
  workspace: Workspace;
  runtime: WorkspaceRuntime;
  projectName: string;
  viewKey: string;
  /** Under a project header, which already names the project. */
  underProject: boolean;
  /** Under a host heading, which already names the host. */
  underHost: boolean;
  sidebar: SidebarContextValue;
}

interface RowItemDefinition {
  id: string;
  /** The item's switch in the Show menu, at `order`. */
  toggle?: { key: RowItem; label: string; icon: string; order: number };
  /** Reads pull request, checks or service data, which needs a workspace subscription. */
  runtime?: boolean;
  /** How readily the item gives up width; the host shrinks first. */
  shrink: number;
  enabled(values: SidebarPreferences): boolean;
  render(context: ItemContext): ReactNode;
}

const rowItem = (key: RowItem) => (values: SidebarPreferences) => values.rowItems[key];

function MetaText({
  children,
  color,
  bold,
}: {
  children: ReactNode;
  color: string;
  bold?: boolean;
}) {
  return (
    <Text
      numberOfLines={1}
      style={{
        color,
        fontSize: 12,
        lineHeight: 16,
        flexShrink: 1,
        fontWeight: bold ? "600" : "400",
      }}
    >
      {children}
    </Text>
  );
}

function Chip({
  label,
  background,
  color,
  bold,
}: {
  label: string;
  background: string;
  color: string;
  bold?: boolean;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 6,
        borderRadius: 999,
        backgroundColor: background,
        flexShrink: 1,
        minWidth: 0,
      }}
    >
      <Text
        numberOfLines={1}
        style={{ color, fontSize: 12, lineHeight: 16, fontWeight: bold ? "600" : "400" }}
      >
        {label}
      </Text>
    </View>
  );
}

const ROW_ITEMS: readonly RowItemDefinition[] = [
  {
    id: "project",
    toggle: { key: "project", label: "Project", icon: "Folder", order: 1 },
    shrink: 1,
    enabled: rowItem("project"),
    // A chip in the project tile's color leads the line; bold in project grouping only.
    render: ({ underProject, projectName, viewKey, sidebar }) =>
      underProject ? null : (
        <Chip
          label={projectName}
          background={identityColor(viewKey, sidebar.palette.dark).fill}
          color={sidebar.palette.onIdentity}
          bold={sidebar.preferences.values.grouping === "project"}
        />
      ),
  },
  {
    id: "branch",
    toggle: { key: "branch", label: "Branch", icon: "GitBranch", order: 0 },
    shrink: 1,
    enabled: rowItem("branch"),
    render: ({ workspace, sidebar }) => {
      const branch = normalizeBranch(workspace.branch);
      const muted = sidebar.theme.colors.foregroundMuted;
      return branch ? (
        <>
          <Icon name="GitBranch" size={12} color={muted} />
          <MetaText color={muted}>{branch}</MetaText>
        </>
      ) : null;
    },
  },
  {
    id: "host",
    toggle: { key: "host", label: "Host", icon: "Server", order: 2 },
    shrink: 100,
    enabled: rowItem("host"),
    // Only when rows span hosts, and never for this device's host.
    render: ({ workspace, underHost, sidebar: { hosts } }) => {
      if (underHost || !hosts.multiple || hosts.isLocal(workspace.hostId)) return null;
      const color = hosts.color(workspace.hostId).text;
      return (
        <>
          <Icon name="Server" size={12} color={color} />
          <MetaText color={color} bold>
            {hosts.label(workspace.hostId)}
          </MetaText>
        </>
      );
    },
  },
  {
    id: "changeRequest",
    toggle: { key: "changeRequest", label: "Pull request", icon: "GitPullRequest", order: 3 },
    runtime: true,
    shrink: 0,
    enabled: rowItem("changeRequest"),
    render: ({ runtime }) =>
      runtime.pullRequest ? <PullRequestItem {...runtime.pullRequest} /> : null,
  },
  {
    id: "checks",
    runtime: true,
    shrink: 0,
    enabled: (values) => values.checks !== "none",
    render: ({ runtime, sidebar }) => {
      const checks = runtime.checks;
      if (!checks) return null;
      const { colors } = sidebar.theme;
      const color =
        checks.state === "passed"
          ? colors.statusSuccess
          : checks.state === "failed"
            ? colors.statusDanger
            : colors.statusWarning;
      return (
        <>
          <ChecksGlyph summary={checks} color={color} />
          {sidebar.preferences.values.checks === "iconAndText" ? (
            <MetaText color={color}>{checks.state}</MetaText>
          ) : null}
        </>
      );
    },
  },
  {
    id: "services",
    toggle: { key: "services", label: "Services", icon: "Globe", order: 4 },
    runtime: true,
    shrink: 1,
    enabled: rowItem("services"),
    // Desktop only, like the built-in sidebar.
    render: ({ runtime, sidebar }) => {
      const service = runtime.service;
      if (!service || !sidebar.pointer) return null;
      const { colors } = sidebar.theme;
      const color = service.healthy ? colors.statusSuccess : colors.statusDanger;
      return (
        <>
          <Icon name="Globe" size={12} color={color} />
          <MetaText color={color}>{service.name}</MetaText>
        </>
      );
    },
  },
  {
    id: "labels",
    toggle: { key: "labels", label: "Labels", icon: "Tag", order: 5 },
    shrink: 1,
    enabled: rowItem("labels"),
    render: ({ workspace, sidebar }) =>
      workspace.labels.length === 0 ? null : (
        <View
          style={{ flexDirection: "row", gap: 4, minWidth: 0, flexShrink: 1, overflow: "hidden" }}
        >
          {workspace.labels.map((label) => {
            const color = identityColor(labelKey(label), sidebar.palette.dark);
            return <Chip key={label} label={label} background={color.tint} color={color.text} />;
          })}
        </View>
      ),
  },
];

/** Show menu switches, in the built-in menu's order. */
export const ROW_ITEM_TOGGLES = ROW_ITEMS.flatMap((item) =>
  item.toggle ? [item.toggle] : [],
).sort((a, b) => a.order - b.order);

/** Whether any shown item reads pull request, checks or service data. */
export function needsWorkspaceRuntime(values: SidebarPreferences): boolean {
  return ROW_ITEMS.some((item) => item.runtime && item.enabled(values));
}

/** The second line; nothing when no item has something to say. */
export function MetaRow(context: Omit<ItemContext, "sidebar">) {
  const sidebar = useSidebar();
  const full = { ...context, sidebar };
  const parts = ROW_ITEMS.flatMap((item) => {
    if (!item.enabled(sidebar.preferences.values)) return [];
    const node = item.render(full);
    return node ? [{ id: item.id, shrink: item.shrink, node }] : [];
  });
  if (parts.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 }}>
      {parts.map((part, index) => (
        <View
          key={part.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            flexShrink: part.shrink,
          }}
        >
          {index > 0 ? (
            <Text style={{ color: sidebar.palette.extraMuted, fontSize: 12, lineHeight: 16 }}>
              ·
            </Text>
          ) : null}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
              minWidth: 0,
              flexShrink: 1,
            }}
          >
            {part.node}
          </View>
        </View>
      ))}
    </View>
  );
}

const PR_ICON: Record<PullRequestState, string> = {
  open: "GitPullRequest",
  merged: "GitMerge",
  closed: "GitPullRequestClosed",
};

function PullRequestItem({
  url,
  number,
  state,
}: {
  url: string;
  number: number | null;
  state: PullRequestState;
}) {
  const { theme, palette } = useSidebar();
  const hover = useHover();
  const toast = useToast();
  const stateColor: Record<PullRequestState, string> = {
    open: theme.colors.statusSuccess,
    merged: palette.merged,
    closed: theme.colors.statusDanger,
  };
  const suffix = state === "merged" ? " Merged" : state === "closed" ? " Closed" : "";
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open pull request ${number ?? ""}`}
      hitSlop={4}
      onHoverIn={hover.onHoverIn}
      onHoverOut={hover.onHoverOut}
      onPress={() => {
        openExternalUrl(url).catch((error: unknown) =>
          toast.error(error instanceof Error ? error.message : String(error)),
        );
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <Icon
        name={hover.hovered ? "ExternalLink" : PR_ICON[state]}
        size={12}
        color={hover.hovered ? theme.colors.foreground : stateColor[state]}
      />
      <MetaText color={hover.hovered ? theme.colors.foreground : theme.colors.foregroundMuted}>
        {`${number ?? ""}${suffix}`}
      </MetaText>
    </Pressable>
  );
}
