import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  usePaseo,
  useWorkspace,
  type PluginSidebarViewProps,
  type WorkspaceRef,
  type ProjectRef,
} from "@getpaseo/plugin/client";
import type { HostSidebarPreferences } from "../shared/preferences";
import type { Preferences } from "./preferences";
import { displayTitle, relativeTime, toggled } from "./model";
import { indicatorColor, initial, projectAvatarStyle, type Styles } from "./styles";
import { Chip } from "./toolbar";

export interface RowContext {
  view: PluginSidebarViewProps;
  styles: Styles;
  values: HostSidebarPreferences;
  preferences: Preferences;
  now: number;
  /** Key of the row whose actions are open; one at a time. */
  expanded: string | null;
  setExpanded: (key: string | null) => void;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function Actions({
  reference,
  pinned,
  title,
  project,
  context,
}: {
  reference: WorkspaceRef;
  pinned: boolean;
  title: string;
  project: ProjectRef;
  context: RowContext;
}) {
  const { view, styles, values, preferences, setExpanded } = context;
  const paseo = usePaseo();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (action: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      action()
        .then(() => setExpanded(null))
        .catch((failure: unknown) => setError(message(failure)))
        .finally(() => setBusy(false));
    },
    [setExpanded],
  );
  const togglePin = useCallback(
    () => run(() => paseo.workspaces.ref(reference).setPinned(!pinned)),
    [run, paseo, reference, pinned],
  );
  const archive = useCallback(
    () => run(() => paseo.workspaces.ref(reference).archive()),
    [run, paseo, reference],
  );
  const saveTitle = useCallback(() => {
    const next = draft.trim();
    run(() => paseo.workspaces.ref(reference).setTitle(next.length > 0 ? next : null));
  }, [run, paseo, reference, draft]);
  const startRename = useCallback(() => setRenaming(true), []);
  const close = useCallback(() => setExpanded(null), [setExpanded]);
  const createWorkspace = useCallback(
    () => run(async () => view.navigation.openProject(project)),
    [run, view.navigation, project],
  );
  const toggleProjectPin = useCallback(() => {
    preferences.update({ pinnedProjects: toggled(values.pinnedProjects, project.key) });
    setExpanded(null);
  }, [preferences, values.pinnedProjects, project.key, setExpanded]);

  return (
    <View>
      <View style={styles.actions}>
        {renaming ? (
          <>
            <TextInput
              accessibilityLabel="工作区标题"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={saveTitle}
              editable={!busy}
              autoFocus
              style={styles.input}
            />
            <Chip label="保存" onPress={saveTitle} styles={styles} />
          </>
        ) : (
          <>
            <Chip label={pinned ? "取消置顶" : "置顶"} onPress={togglePin} styles={styles} />
            <Chip label="重命名" onPress={startRename} styles={styles} />
            <Chip label="新建同项目工作区" onPress={createWorkspace} styles={styles} />
            <Chip
              label={values.pinnedProjects.includes(project.key) ? "取消项目置顶" : "置顶项目"}
              onPress={toggleProjectPin}
              styles={styles}
            />
            <Chip label="归档" onPress={archive} styles={styles} />
          </>
        )}
        <Chip label="取消" onPress={close} styles={styles} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function WorkspaceRow({
  reference,
  context,
  hideProject,
}: {
  reference: WorkspaceRef;
  context: RowContext;
  /** Set inside a pinned project's group, where the group header already names the project. */
  hideProject?: boolean;
}) {
  const { view, styles, values, now, expanded, setExpanded } = context;
  const workspace = useWorkspace(reference);
  const open = useCallback(
    () => view.navigation.openWorkspace(reference),
    [view.navigation, reference],
  );
  const isExpanded = expanded === reference.key;
  const toggleActions = useCallback(
    () => setExpanded(isExpanded ? null : reference.key),
    [setExpanded, isExpanded, reference.key],
  );
  if (!workspace) return null;

  const title = displayTitle(workspace, values.titleSource);
  const fullTitle = workspace.title ?? workspace.name;
  const secondary = values.titleSource === "branch" ? fullTitle : workspace.branch;
  const detail = [
    secondary && secondary !== title ? secondary : null,
    workspace.indicator === "done" ? null : workspace.indicatorLabel,
  ]
    .filter(Boolean)
    .join(" · ");
  const diff = workspace.diffStat;
  const showDiff = values.trailing === "diff" && diff && (diff.additions > 0 || diff.deletions > 0);
  const active = view.active.workspace?.key === reference.key;

  return (
    <View>
      <View
        style={[
          styles.rowShell,
          isExpanded ? styles.rowExpanded : null,
          active ? styles.rowActive : null,
        ]}
      >
        {active ? (
          <>
            <View pointerEvents="none" style={styles.rowActiveTint} />
            <View pointerEvents="none" style={styles.rowActiveBar} />
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`打开 ${fullTitle}，项目 ${workspace.projectDisplayName}`}
          accessibilityHint="长按显示更多操作"
          accessibilityState={{ selected: active }}
          onPress={open}
          onLongPress={toggleActions}
          style={styles.row}
        >
          <View style={styles.dotLead}>
            <View
              style={[styles.dot, { backgroundColor: indicatorColor(view.theme, workspace.indicator) }]}
            />
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowLine}>
              <Text numberOfLines={1} style={[styles.rowTitle, active ? styles.rowTitleActive : null]}>
                {title}
              </Text>
              {showDiff ? (
                <Text>
                  <Text style={styles.added}>{`+${diff.additions}`}</Text>
                  <Text style={styles.removed}>{` -${diff.deletions}`}</Text>
                </Text>
              ) : null}
              {values.trailing === "time" ? (
                <Text style={styles.meta}>{relativeTime(workspace, now)}</Text>
              ) : null}
            </View>
            {hideProject ? (
              detail ? (
                <Text numberOfLines={1} style={[styles.rowDetail, styles.rowDetailOnly]}>
                  {detail}
                </Text>
              ) : null
            ) : (
              <View style={styles.rowFooter}>
                <View style={styles.projectTag}>
                  <View style={[styles.tagAvatar, projectAvatarStyle(workspace.project.key)]}>
                    <Text style={styles.tagAvatarText}>
                      {initial(workspace.projectDisplayName)}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={styles.projectTagText}>
                    {workspace.projectDisplayName}
                  </Text>
                </View>
                <Text numberOfLines={1} style={[styles.rowDetail, styles.detailFill]}>
                  {detail}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${fullTitle} 的更多操作`}
          onPress={toggleActions}
          hitSlop={6}
          style={styles.more}
        >
          <Text style={[styles.add, active ? styles.moreActive : null]}>⋯</Text>
        </Pressable>
      </View>
      {isExpanded ? (
        <Actions
          reference={reference}
          pinned={!!workspace.pinnedAt}
          title={fullTitle}
          project={workspace.project}
          context={context}
        />
      ) : null}
    </View>
  );
}
