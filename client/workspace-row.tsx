import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import {
  openExternalUrl,
  usePaseo,
  useProject,
  useWorkspace,
  useWorkspaces,
  type WorkspaceRef,
} from "@getpaseo/plugin/client";
import { copyText, Icon, TextInput, useToast } from "@getpaseo/plugin/client/ui";
import { useHover, useSidebar } from "./context";
import { ChecksGlyph, ProjectStatusVisual, StatusIndicator } from "./indicators";
import { MenuBack, MenuCard, MenuItem, MenuNote, MenuSeparator } from "./menu";
import {
  compactNumber,
  compareNames,
  displayTitle,
  formatAge,
  labelKey,
  normalizeBranch,
  type Workspace,
} from "./model";
import { identityColor } from "./palette";
import { useWorkspaceRuntime, type WorkspaceRuntime } from "./runtime";

/**
 * `project`: nested under a project header, with a status indicator.
 * `pinned`: in the Pinned section, with the project tile and a status badge.
 * `status`: inside a status group, indented, with the project tile.
 */
export type RowVariant = "project" | "pinned" | "status";

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function WorkspaceRow({
  reference,
  variant,
  hideHost,
}: {
  reference: WorkspaceRef;
  variant: RowVariant;
  /** Set under a host heading, which already names the host. */
  hideHost?: boolean;
}) {
  const workspace = useWorkspace(reference);
  if (!workspace) return null;
  return <Row workspace={workspace} reference={reference} variant={variant} hideHost={hideHost} />;
}

function Row({
  workspace,
  reference,
  variant,
  hideHost,
}: {
  workspace: Workspace;
  reference: WorkspaceRef;
  variant: RowVariant;
  hideHost?: boolean;
}) {
  const sidebar = useSidebar();
  const { view, theme, palette, touch, pointer, preferences, directory, openMenu, setOpenMenu } =
    sidebar;
  const values = preferences.values;
  const hover = useHover();
  const [pressed, setPressed] = useState(false);
  const runtime = useWorkspaceRuntime(workspace.hostId, workspace.id);
  const projectName =
    useProject(workspace.project, (project) => project.displayName) ?? workspace.projectDisplayName;
  const viewKey = directory.viewKey(workspace.hostId, workspace.projectId);
  const menuKey = `workspace:${reference.key}`;
  const confirmKey = `archive:${reference.key}`;
  const menuOpen = openMenu === menuKey;
  const confirming = openMenu === confirmKey;
  const renaming = sidebar.renaming === reference.key;
  const selected = view.active.workspace?.key === reference.key;
  const archiving = !!workspace.archivingAt;
  const hovered = pointer && hover.hovered && !renaming && !menuOpen;

  const backdropBase =
    palette.background === "transparent" ? theme.colors.surface0 : palette.background;
  const backdrop = pressed
    ? palette.pressed
    : selected
      ? palette.selected
      : hovered
        ? palette.hover
        : backdropBase;

  const open = useCallback(() => {
    setOpenMenu(null);
    view.navigation.openWorkspace(reference);
  }, [view.navigation, reference, setOpenMenu]);
  const toggleMenu = useCallback(
    () => setOpenMenu(menuOpen ? null : menuKey),
    [setOpenMenu, menuOpen, menuKey],
  );

  const paseo = usePaseo();
  const toast = useToast();
  const archive = useCallback(() => {
    setOpenMenu(null);
    paseo.workspaces
      .ref(reference)
      .archive()
      .then((result) => {
        if (result.error) toast.error(result.error);
        return undefined;
      })
      .catch((error: unknown) => toast.error(message(error)));
  }, [paseo, reference, setOpenMenu, toast]);
  // Paseo checks a worktree for uncommitted or unpushed work before archiving it; plugins
  // cannot read that, so always confirm worktrees.
  const requestArchive = useCallback(() => {
    if (workspace.kind === "worktree") setOpenMenu(confirmKey);
    else archive();
  }, [workspace.kind, setOpenMenu, confirmKey, archive]);

  const indent = variant === "status" ? 16 : 8;
  const title = displayTitle(workspace, values.titleSource);
  const leading =
    variant === "project" ? (
      <StatusIndicator
        indicator={workspace.indicator}
        kind={workspace.kind}
        loading={archiving}
        touch={touch}
        palette={palette}
        theme={theme}
      />
    ) : (
      <ProjectStatusVisual
        viewKey={viewKey}
        name={projectName}
        indicator={workspace.indicator === "done" ? null : workspace.indicator}
        loading={archiving}
        backdrop={backdrop}
        touch={touch}
        palette={palette}
        theme={theme}
      />
    );

  return (
    <View>
      {/* Hover is tracked here, not on the Pressable: see useHover. */}
      <View onPointerEnter={hover.onPointerEnter} onPointerLeave={hover.onPointerLeave}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${workspace.name}, ${workspace.indicatorLabel ?? ""}`}
          accessibilityState={{ selected, disabled: archiving }}
          disabled={archiving}
          onPress={open}
          onLongPress={toggleMenu}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          unstable_pressDelay={touch ? 130 : undefined}
          style={{
            minHeight: touch ? 44 : 36,
            marginBottom: 2,
            paddingVertical: 8,
            paddingLeft: indent,
            paddingRight: 12,
            borderRadius: 8,
            gap: 4,
            justifyContent: variant === "status" ? "flex-start" : "center",
            backgroundColor: pressed || selected || hovered ? backdrop : "transparent",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            {leading}
            {renaming ? (
              <RenameInput reference={reference} initial={workspace.title ?? workspace.name} />
            ) : (
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  minWidth: 0,
                  color: theme.colors.foreground,
                  fontSize: 14,
                  lineHeight: 20,
                  opacity: hovered ? 1 : 0.76,
                }}
              >
                {title}
              </Text>
            )}
            <Trailing
              workspace={workspace}
              hovered={hovered}
              backdrop={backdrop}
              onArchive={requestArchive}
              onMenu={toggleMenu}
              archiving={archiving}
            />
          </View>
          <MetaRow
            workspace={workspace}
            runtime={runtime}
            projectName={projectName}
            viewKey={viewKey}
            showProject={variant !== "project"}
            showHost={!hideHost}
          />
        </Pressable>
      </View>
      {menuOpen ? (
        <WorkspaceMenu workspace={workspace} reference={reference} onArchive={requestArchive} />
      ) : null}
      {confirming ? <ArchiveConfirm name={workspace.name} onConfirm={archive} /> : null}
    </View>
  );
}

function Trailing({
  workspace,
  hovered,
  backdrop,
  onArchive,
  onMenu,
  archiving,
}: {
  workspace: Workspace;
  hovered: boolean;
  backdrop: string;
  onArchive: () => void;
  onMenu: () => void;
  archiving: boolean;
}) {
  const { theme, palette, touch, preferences, now } = useSidebar();
  const trailing = preferences.values.trailing;

  if (touch)
    return (
      <View style={{ minHeight: 20, minWidth: 18, alignItems: "flex-end" }}>
        <IconButton
          icon="MoreVertical"
          label={`More actions for ${workspace.name}`}
          onPress={onMenu}
          size={32}
          iconSize={18}
          style={{ marginTop: -6, marginRight: -14 }}
        />
      </View>
    );

  let content: ReactNode = null;
  if (trailing === "timestamp") {
    const age = formatAge(workspace.statusEnteredAt, now);
    if (age)
      content = (
        <Text style={{ color: palette.extraMuted, fontSize: 12, lineHeight: 20, height: 20 }}>
          {age}
        </Text>
      );
  } else if (trailing === "diff" && workspace.diffStat) {
    content = (
      <View style={{ flexDirection: "row", gap: 4, height: 20, alignItems: "center" }}>
        <Text style={{ color: theme.colors.statusSuccess, fontSize: 12, lineHeight: 20 }}>
          {`+${compactNumber(workspace.diffStat.additions)}`}
        </Text>
        <Text style={{ color: theme.colors.statusDanger, fontSize: 12, lineHeight: 20 }}>
          {`-${compactNumber(workspace.diffStat.deletions)}`}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        position: "relative",
        minHeight: 20,
        alignItems: "flex-end",
        minWidth: content ? 18 : 0,
        flexShrink: 0,
      }}
    >
      {content}
      {hovered && !archiving ? (
        <View style={{ position: "absolute", top: 0, right: 0, height: 20, flexDirection: "row" }}>
          <Scrim color={backdrop} />
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: backdrop }}>
            <IconButton
              icon="Archive"
              label={`Archive ${workspace.name}`}
              onPress={onArchive}
              size={18}
              iconSize={14}
              style={{ marginRight: 8 }}
            />
            <IconButton
              icon="MoreVertical"
              label={`More actions for ${workspace.name}`}
              onPress={onMenu}
              size={18}
              iconSize={14}
              style={{ marginRight: -7 }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** A left-to-right fade into the row backdrop, so hover buttons cover the title end cleanly. */
function Scrim({ color }: { color: string }) {
  const steps = [0.15, 0.35, 0.55, 0.75, 0.9, 1];
  return (
    <View style={{ flexDirection: "row", width: 26, height: 20 }} pointerEvents="none">
      {steps.map((opacity) => (
        <View key={opacity} style={{ flex: 1, backgroundColor: color, opacity }} />
      ))}
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  size,
  iconSize,
  style,
  hoverFill,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  size: number;
  iconSize: number;
  style?: object;
  hoverFill?: string;
}) {
  const { theme } = useSidebar();
  const hover = useHover();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onHoverIn={hover.onHoverIn}
      onHoverOut={hover.onHoverOut}
      hitSlop={4}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size >= 24 ? 6 : 4,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            hover.hovered || pressed ? (hoverFill ?? theme.colors.surface2) : "transparent",
        },
        style,
      ]}
    >
      <Icon
        name={icon}
        size={iconSize}
        color={hover.hovered ? theme.colors.foreground : theme.colors.foregroundMuted}
      />
    </Pressable>
  );
}

function RenameInput({ reference, initial }: { reference: WorkspaceRef; initial: string }) {
  const { theme, setRenaming } = useSidebar();
  const paseo = usePaseo();
  const toast = useToast();
  const [draft, setDraft] = useState(initial);
  const [done, setDone] = useState(false);
  const commit = useCallback(() => {
    if (done) return;
    setDone(true);
    setRenaming(null);
    const next = draft.trim();
    if (next === initial) return;
    paseo.workspaces
      .ref(reference)
      .setTitle(next.length > 0 ? next : null)
      .catch((error: unknown) => toast.error(message(error)));
  }, [done, draft, initial, paseo, reference, setRenaming, toast]);
  const cancel = useCallback(() => {
    setDone(true);
    setRenaming(null);
  }, [setRenaming]);
  return (
    <TextInput
      accessibilityLabel="Workspace title"
      value={draft}
      onChangeText={setDraft}
      onSubmitEditing={commit}
      onBlur={commit}
      onKeyPress={(event) => {
        if (event.nativeEvent.key === "Escape") cancel();
      }}
      autoFocus
      selectTextOnFocus
      style={{
        flex: 1,
        minWidth: 0,
        height: 20,
        padding: 0,
        color: theme.colors.foreground,
        fontSize: 14,
        lineHeight: 20,
      }}
    />
  );
}

function Separator() {
  const { palette } = useSidebar();
  return <Text style={{ color: palette.extraMuted, fontSize: 12, lineHeight: 16 }}>·</Text>;
}

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

/** The second line: branch, project, host, pull request, checks, service and labels. */
function MetaRow({
  workspace,
  runtime,
  projectName,
  viewKey,
  showProject,
  showHost,
}: {
  workspace: Workspace;
  runtime: WorkspaceRuntime;
  projectName: string;
  /** Colors the project tag like the project's tile. */
  viewKey: string;
  /** Off under a project header, which already names the project. */
  showProject: boolean;
  showHost: boolean;
}) {
  const { theme, palette, pointer, preferences, multiHost, localHostId, hosts } = useSidebar();
  const { rowItems, checks: checksDisplay } = preferences.values;
  const muted = theme.colors.foregroundMuted;
  const items: { key: string; node: ReactNode; shrink: number }[] = [];

  // The project leads the line, as a bold chip in its tile's color.
  if (rowItems.project && showProject)
    items.push({
      key: "project",
      shrink: 1,
      node: (
        <View
          style={{
            paddingHorizontal: 6,
            borderRadius: 999,
            backgroundColor: identityColor(viewKey, palette.dark).fill,
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          <Text
            numberOfLines={1}
            style={{ color: "#ffffff", fontSize: 12, lineHeight: 16, fontWeight: "600" }}
          >
            {projectName}
          </Text>
        </View>
      ),
    });
  const branch = normalizeBranch(workspace.branch);
  if (rowItems.branch && branch)
    items.push({
      key: "branch",
      shrink: 1,
      node: (
        <>
          <Icon name="GitBranch" size={12} color={muted} />
          <MetaText color={muted}>{branch}</MetaText>
        </>
      ),
    });
  if (rowItems.host && showHost && multiHost && workspace.hostId !== localHostId) {
    const host = hosts.find((entry) => entry.serverId === workspace.hostId);
    const color = identityColor(workspace.hostId, palette.dark).text;
    items.push({
      key: "host",
      shrink: 100,
      node: (
        <>
          <Icon name="Server" size={12} color={color} />
          <MetaText color={color} bold>
            {host?.label ?? workspace.hostId}
          </MetaText>
        </>
      ),
    });
  }
  const pr = runtime.pullRequest;
  if (rowItems.changeRequest && pr)
    items.push({
      key: "pr",
      shrink: 0,
      node: <PullRequestItem url={pr.url} number={pr.number} state={pr.state} />,
    });
  const checks = runtime.checks;
  if (checksDisplay !== "none" && checks) {
    const color =
      checks.state === "passed"
        ? theme.colors.statusSuccess
        : checks.state === "failed"
          ? theme.colors.statusDanger
          : theme.colors.statusWarning;
    items.push({
      key: "checks",
      shrink: 0,
      node: (
        <>
          <ChecksGlyph summary={checks} color={color} />
          {checksDisplay === "iconAndText" ? (
            <MetaText color={color}>{checks.state}</MetaText>
          ) : null}
        </>
      ),
    });
  }
  const service = runtime.service;
  if (rowItems.services && pointer && service) {
    const color = service.healthy ? theme.colors.statusSuccess : theme.colors.statusDanger;
    items.push({
      key: "service",
      shrink: 1,
      node: (
        <>
          <Icon name="Globe" size={12} color={color} />
          <MetaText color={color}>{service.name}</MetaText>
        </>
      ),
    });
  }
  if (rowItems.labels && workspace.labels.length > 0)
    items.push({
      key: "labels",
      shrink: 1,
      node: (
        <View
          style={{ flexDirection: "row", gap: 4, minWidth: 0, flexShrink: 1, overflow: "hidden" }}
        >
          {workspace.labels.map((label) => {
            const color = identityColor(labelKey(label), palette.dark);
            return (
              <View
                key={label}
                style={{ paddingHorizontal: 6, borderRadius: 999, backgroundColor: color.tint }}
              >
                <Text numberOfLines={1} style={{ color: color.text, fontSize: 12, lineHeight: 16 }}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      ),
    });

  if (items.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 }}>
      {items.map((item, index) => (
        <View
          key={item.key}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            flexShrink: item.shrink,
          }}
        >
          {index > 0 ? <Separator /> : null}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
              minWidth: 0,
              flexShrink: 1,
            }}
          >
            {item.node}
          </View>
        </View>
      ))}
    </View>
  );
}

function PullRequestItem({
  url,
  number,
  state,
}: {
  url: string;
  number: number | null;
  state: "open" | "merged" | "closed";
}) {
  const { theme, palette } = useSidebar();
  const hover = useHover();
  const toast = useToast();
  const icon = hover.hovered
    ? "ExternalLink"
    : state === "open"
      ? "GitPullRequest"
      : state === "merged"
        ? "GitMerge"
        : "GitPullRequestClosed";
  const iconColor = hover.hovered
    ? theme.colors.foreground
    : state === "open"
      ? theme.colors.statusSuccess
      : state === "merged"
        ? palette.merged
        : theme.colors.statusDanger;
  const suffix = state === "merged" ? " Merged" : state === "closed" ? " Closed" : "";
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open pull request ${number ?? ""}`}
      hitSlop={4}
      onHoverIn={hover.onHoverIn}
      onHoverOut={hover.onHoverOut}
      onPress={() => {
        openExternalUrl(url).catch((error: unknown) => toast.error(message(error)));
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <Icon name={icon} size={12} color={iconColor} />
      <Text
        numberOfLines={1}
        style={{
          color: hover.hovered ? theme.colors.foreground : theme.colors.foregroundMuted,
          fontSize: 12,
          lineHeight: 16,
        }}
      >
        {`${number ?? ""}${suffix}`}
      </Text>
    </Pressable>
  );
}

function ArchiveConfirm({ name, onConfirm }: { name: string; onConfirm: () => void }) {
  const { theme, setOpenMenu } = useSidebar();
  return (
    <MenuCard>
      <Text
        style={{
          color: theme.colors.foregroundMuted,
          fontSize: 12,
          lineHeight: 16,
          paddingHorizontal: 12,
          paddingVertical: 4,
        }}
      >
        {`Archive "${name}"? Uncommitted changes and unpushed commits in this worktree may be lost.`}
      </Text>
      <MenuItem icon="Archive" label="Archive" destructive onPress={onConfirm} />
      <MenuItem icon="X" label="Cancel" onPress={() => setOpenMenu(null)} />
    </MenuCard>
  );
}

function WorkspaceMenu({
  workspace,
  reference,
  onArchive,
}: {
  workspace: Workspace;
  reference: WorkspaceRef;
  onArchive: () => void;
}) {
  const { setOpenMenu, setRenaming } = useSidebar();
  const paseo = usePaseo();
  const toast = useToast();
  const [page, setPage] = useState<"root" | "labels">("root");
  const [error, setError] = useState<string | null>(null);
  const close = useCallback(() => setOpenMenu(null), [setOpenMenu]);
  const branch = normalizeBranch(workspace.branch);

  const copy = useCallback(
    (text: string, what: string) => {
      close();
      copyText(text)
        .then(() => toast.show(`Copied ${what}`))
        .catch((failure: unknown) => toast.error(message(failure)));
    },
    [close, toast],
  );
  const togglePin = useCallback(() => {
    paseo.workspaces
      .ref(reference)
      .setPinned(!workspace.pinnedAt)
      .then(close)
      .catch((failure: unknown) => setError(message(failure)));
  }, [paseo, reference, workspace.pinnedAt, close]);

  if (page === "labels")
    return (
      <MenuCard>
        <MenuBack title="Labels" onPress={() => setPage("root")} />
        <MenuSeparator />
        <LabelPicker workspace={workspace} reference={reference} />
      </MenuCard>
    );

  return (
    <MenuCard>
      <MenuItem icon="Copy" label="Copy path" onPress={() => copy(workspace.directory, "path")} />
      {workspace.projectKind === "git" && branch ? (
        <MenuItem
          icon="Copy"
          label="Copy branch name"
          onPress={() => copy(branch, "branch name")}
        />
      ) : null}
      <MenuItem
        icon="Pencil"
        label="Rename workspace"
        onPress={() => {
          close();
          setRenaming(reference.key);
        }}
      />
      <MenuItem
        icon={workspace.pinnedAt ? "PinOff" : "Pin"}
        label={workspace.pinnedAt ? "Unpin" : "Pin to top"}
        onPress={togglePin}
      />
      <MenuItem icon="Tag" label="Labels" submenu onPress={() => setPage("labels")} />
      <MenuSeparator />
      <MenuItem icon="Archive" label="Archive" onPress={onArchive} />
      {error ? <MenuNote text={error} /> : null}
    </MenuCard>
  );
}

function LabelPicker({ workspace, reference }: { workspace: Workspace; reference: WorkspaceRef }) {
  const { theme, palette, touch } = useSidebar();
  const paseo = usePaseo();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const groups = useWorkspaces({
    hosts: [workspace.hostId],
    groupBy: (item) => item.labels.map((label) => ({ key: labelKey(label), title: label })),
  });
  const labels = useMemo(
    () => groups.map((group) => group.title ?? group.key).sort(compareNames),
    [groups],
  );
  const assigned = new Set(workspace.labels.map(labelKey));
  const setLabel = (name: string, on: boolean) => {
    setError(null);
    paseo.workspaces
      .ref(reference)
      .setLabel(name, { assigned: on })
      .catch((failure: unknown) => setError(message(failure)));
  };
  const create = () => {
    const name = draft.trim();
    if (!name) return;
    setDraft("");
    setLabel(name, true);
  };
  return (
    <>
      {labels.map((label) => (
        <MenuItem
          key={label}
          label={label}
          checked={assigned.has(labelKey(label))}
          leading={
            <View
              style={{
                width: 8,
                height: 8,
                marginHorizontal: 3,
                borderRadius: 4,
                backgroundColor: identityColor(labelKey(label), palette.dark).fill,
              }}
            />
          }
          onPress={() => setLabel(label, !assigned.has(labelKey(label)))}
        />
      ))}
      <View style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
        <TextInput
          accessibilityLabel="New label"
          placeholder="New label…"
          placeholderTextColor={theme.colors.foregroundMuted}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={create}
          style={{
            height: touch ? 36 : 28,
            paddingHorizontal: 8,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: theme.colors.border,
            color: theme.colors.foreground,
            fontSize: 14,
          }}
        />
      </View>
      {error ? <MenuNote text={error} /> : null}
    </>
  );
}
