import { useMemo, useState } from "react";
import { View } from "react-native";
import { usePaseo, useWorkspaces, type WorkspaceRef } from "@getpaseo/plugin/client";
import { copyText, TextInput, useToast } from "@getpaseo/plugin/client/ui";
import { useSidebar } from "./context";
import { MenuBack, MenuCard, MenuDot, MenuItem, MenuNote, MenuSeparator } from "./controls";
import { compareNames, labelKey, normalizeBranch, type Workspace } from "./model";
import { identityColor } from "./palette";

/** The inline menus a workspace row opens: its actions, and the worktree archive check. */

export const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function WorkspaceMenu({
  workspace,
  reference,
  onArchive,
  onRename,
  close,
}: {
  workspace: Workspace;
  reference: WorkspaceRef;
  onArchive: () => void;
  onRename: () => void;
  close: () => void;
}) {
  const paseo = usePaseo();
  const toast = useToast();
  const [page, setPage] = useState<"root" | "labels">("root");
  const [error, setError] = useState<string | null>(null);
  const branch = normalizeBranch(workspace.branch);

  const copy = (text: string, what: string) => {
    close();
    copyText(text)
      .then(() => toast.show(`Copied ${what}`))
      .catch((failure: unknown) => toast.error(errorText(failure)));
  };
  const togglePin = () => {
    paseo.workspaces
      .ref(reference)
      .setPinned(!workspace.pinnedAt)
      .then(close)
      .catch((failure: unknown) => setError(errorText(failure)));
  };

  if (page === "labels")
    return (
      <MenuCard>
        <MenuBack title="Labels" onPress={() => setPage("root")} />
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
          onRename();
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
      {error ? <MenuNote text={error} error /> : null}
    </MenuCard>
  );
}

/** Labels on this host with a check for the workspace's own, and a field to create one. */
function LabelPicker({ workspace, reference }: { workspace: Workspace; reference: WorkspaceRef }) {
  const { theme, palette, touch } = useSidebar();
  const paseo = usePaseo();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const groups = useWorkspaces(
    useMemo(
      () => ({
        hosts: [workspace.hostId],
        groupBy: (item: Workspace) =>
          item.labels.map((label) => ({ key: labelKey(label), title: label })),
      }),
      [workspace.hostId],
    ),
  );
  const labels = useMemo(
    () =>
      groups
        .map((group) => ({ key: group.key, title: group.title ?? group.key }))
        .sort((a, b) => compareNames(a.title, b.title)),
    [groups],
  );
  // The workspace's own spelling of each label, for unassigning exactly what it carries.
  const own = new Map(workspace.labels.map((label) => [labelKey(label), label]));

  const setLabel = (name: string, assigned: boolean) => {
    setError(null);
    paseo.workspaces
      .ref(reference)
      .setLabel(name, { assigned })
      .catch((failure: unknown) => setError(errorText(failure)));
  };
  const create = () => {
    const name = draft.trim();
    if (!name) return;
    setDraft("");
    setLabel(name, true);
  };

  return (
    <>
      {labels.map((label) => {
        const current = own.get(label.key);
        return (
          <MenuItem
            key={label.key}
            label={label.title}
            checked={current !== undefined}
            leading={<MenuDot color={identityColor(label.key, palette.dark).fill} />}
            onPress={() =>
              current !== undefined ? setLabel(current, false) : setLabel(label.title, true)
            }
          />
        );
      })}
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
      {error ? <MenuNote text={error} error /> : null}
    </>
  );
}

/** Paseo checks a worktree for unsaved work before archiving; plugins cannot, so they ask. */
export function ArchiveConfirm({
  name,
  onConfirm,
  close,
}: {
  name: string;
  onConfirm: () => void;
  close: () => void;
}) {
  return (
    <MenuCard>
      <MenuNote
        text={`Archive "${name}"? Uncommitted changes and unpushed commits in this worktree may be lost.`}
      />
      <MenuItem icon="Archive" label="Archive" destructive onPress={onConfirm} />
      <MenuItem icon="X" label="Cancel" onPress={close} />
    </MenuCard>
  );
}
