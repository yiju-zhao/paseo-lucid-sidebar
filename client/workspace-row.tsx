import { useCallback, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { usePaseo, useProject, useWorkspace, type WorkspaceRef } from "@getpaseo/plugin/client";
import { TextInput, useToast } from "@getpaseo/plugin/client/ui";
import { useNow } from "./clock";
import { useHover, useSidebar } from "./context";
import { IconButton } from "./controls";
import { ProjectStatusVisual, StatusIndicator } from "./indicators";
import { compactNumber, displayTitle, formatAge, type Workspace } from "./model";
import { MetaRow } from "./row-items";
import { ArchiveConfirm, errorText, WorkspaceMenu } from "./row-menu";
import { useWorkspaceRuntime } from "./runtime";
import { useMenu, useRenaming } from "./ui-state";

/**
 * `project`: under a project header, with a status indicator.
 * `pinned`: in the Pinned section, with the project tile and a status badge.
 * `status`: inside a status group, with the project tile.
 */
export type RowVariant = "project" | "pinned" | "status";

export function WorkspaceRow({
  reference,
  variant,
  underHost = false,
}: {
  reference: WorkspaceRef;
  variant: RowVariant;
  /** Under a host heading, which names the host and indents the row. */
  underHost?: boolean;
}) {
  const workspace = useWorkspace(reference);
  if (!workspace) return null;
  return (
    <Row workspace={workspace} reference={reference} variant={variant} underHost={underHost} />
  );
}

function Row({
  workspace,
  reference,
  variant,
  underHost,
}: {
  workspace: Workspace;
  reference: WorkspaceRef;
  variant: RowVariant;
  underHost: boolean;
}) {
  const { view, theme, palette, touch, pointer, preferences, directory } = useSidebar();
  const paseo = usePaseo();
  const toast = useToast();
  const hover = useHover();
  const [pressed, setPressed] = useState(false);
  const runtime = useWorkspaceRuntime(workspace.hostId, workspace.id);
  const projectName =
    useProject(workspace.project, (project) => project.displayName) ?? workspace.projectDisplayName;
  const viewKey = directory.viewKey(workspace.hostId, workspace.projectId);
  const menu = useMenu(`workspace:${reference.key}`);
  const confirm = useMenu(`archive:${reference.key}`);
  const rename = useRenaming(reference.key);
  const selected = view.active.workspace?.key === reference.key;
  const archiving = !!workspace.archivingAt;
  // An open menu keeps the row highlighted and its buttons shown, so ⋯ can close it again.
  const hovered = pointer && !rename.renaming && (hover.hovered || menu.open);
  const backdrop = pressed
    ? palette.pressed
    : selected
      ? palette.selected
      : hovered
        ? palette.hover
        : palette.backdrop;

  const open = useCallback(() => {
    menu.close();
    view.navigation.openWorkspace(reference);
  }, [menu, view.navigation, reference]);
  const archive = useCallback(() => {
    menu.close();
    paseo.workspaces
      .ref(reference)
      .archive()
      .then((result) => {
        if (result.error) toast.error(result.error);
        return undefined;
      })
      .catch((error: unknown) => toast.error(errorText(error)));
  }, [menu, paseo, reference, toast]);
  // Paseo checks a worktree for unsaved work before archiving; plugins cannot, so ask.
  const requestArchive = workspace.kind === "worktree" ? confirm.show : archive;

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
          // The built-in sidebar has no long press on desktop; on touch it opens the menu.
          onLongPress={touch ? menu.toggle : undefined}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          unstable_pressDelay={touch ? 130 : undefined}
          style={{
            minHeight: touch ? 44 : 36,
            marginBottom: 2,
            paddingVertical: 8,
            paddingLeft: variant === "status" && !underHost ? 16 : 8,
            paddingRight: 12,
            borderRadius: 8,
            gap: 4,
            justifyContent: variant === "status" ? "flex-start" : "center",
            backgroundColor: pressed || selected || hovered ? backdrop : "transparent",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            {variant === "project" ? (
              <StatusIndicator
                indicator={workspace.indicator}
                kind={workspace.kind}
                loading={archiving}
              />
            ) : (
              <ProjectStatusVisual
                viewKey={viewKey}
                name={projectName}
                indicator={archiving ? "running" : workspace.indicator}
                backdrop={backdrop}
              />
            )}
            {rename.renaming ? (
              <RenameInput
                reference={reference}
                initial={workspace.title ?? workspace.name}
                done={rename.stop}
              />
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
                {displayTitle(workspace, preferences.values.titleSource)}
              </Text>
            )}
            <Trailing
              workspace={workspace}
              showActions={hovered && !archiving}
              menuOpen={menu.open}
              backdrop={backdrop}
              onArchive={requestArchive}
              onMenu={menu.toggle}
            />
          </View>
          <MetaRow
            workspace={workspace}
            runtime={runtime}
            projectName={projectName}
            viewKey={viewKey}
            underProject={variant === "project"}
            underHost={underHost}
          />
        </Pressable>
      </View>
      {menu.open ? (
        <WorkspaceMenu
          workspace={workspace}
          reference={reference}
          onArchive={requestArchive}
          onRename={rename.start}
          close={menu.close}
        />
      ) : null}
      {confirm.open ? (
        <ArchiveConfirm name={workspace.name} onConfirm={archive} close={confirm.close} />
      ) : null}
    </View>
  );
}

/** The right of line 1: the time or diff, under hover buttons on desktop; ⋯ on touch. */
function Trailing({
  workspace,
  showActions,
  menuOpen,
  backdrop,
  onArchive,
  onMenu,
}: {
  workspace: Workspace;
  showActions: boolean;
  /** Draws ⋯ pressed in while its menu is open. */
  menuOpen: boolean;
  backdrop: string;
  onArchive: () => void;
  onMenu: () => void;
}) {
  const { touch } = useSidebar();
  const more = `More actions for ${workspace.name}`;

  if (touch)
    return (
      <View style={{ minHeight: 20, minWidth: 18, alignItems: "flex-end" }}>
        <IconButton
          icon="MoreVertical"
          label={more}
          onPress={onMenu}
          active={menuOpen}
          size={32}
          iconSize={18}
          style={{ marginTop: -6, marginRight: -14 }}
        />
      </View>
    );

  return (
    <View style={{ position: "relative", minHeight: 20, alignItems: "flex-end", flexShrink: 0 }}>
      <TrailingValue workspace={workspace} />
      {showActions ? (
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
              label={more}
              onPress={onMenu}
              active={menuOpen}
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

/** The time since the last status change, or the diff stats. Reads the shared clock. */
function TrailingValue({ workspace }: { workspace: Workspace }) {
  const { theme, palette, preferences } = useSidebar();
  const now = useNow();
  const trailing = preferences.values.trailing;
  const text = { fontSize: 12, lineHeight: 20, height: 20 };
  if (trailing === "timestamp") {
    const age = formatAge(workspace.statusEnteredAt, now);
    return age ? (
      <Text style={{ ...text, color: palette.extraMuted, minWidth: 18 }}>{age}</Text>
    ) : null;
  }
  if (trailing === "diff" && workspace.diffStat)
    return (
      <View
        style={{ flexDirection: "row", gap: 4, height: 20, alignItems: "center", minWidth: 18 }}
      >
        <Text style={{ ...text, color: theme.colors.statusSuccess }}>
          {`+${compactNumber(workspace.diffStat.additions)}`}
        </Text>
        <Text style={{ ...text, color: theme.colors.statusDanger }}>
          {`-${compactNumber(workspace.diffStat.deletions)}`}
        </Text>
      </View>
    );
  return null;
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

function RenameInput({
  reference,
  initial,
  done,
}: {
  reference: WorkspaceRef;
  initial: string;
  done: () => void;
}) {
  const { theme } = useSidebar();
  const paseo = usePaseo();
  const toast = useToast();
  const [draft, setDraft] = useState(initial);
  // A ref, not state: Escape is followed at once by a blur, which must not save.
  const finished = useRef(false);
  const finish = (save: boolean) => {
    if (finished.current) return;
    finished.current = true;
    done();
    const next = draft.trim();
    if (!save || next === initial) return;
    paseo.workspaces
      .ref(reference)
      .setTitle(next.length > 0 ? next : null)
      .catch((error: unknown) => toast.error(errorText(error)));
  };
  return (
    <TextInput
      accessibilityLabel="Workspace title"
      value={draft}
      onChangeText={setDraft}
      onSubmitEditing={() => finish(true)}
      onBlur={() => finish(true)}
      onKeyPress={(event) => {
        if (event.nativeEvent.key === "Escape") finish(false);
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
