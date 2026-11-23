import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useWorkspaces, type PluginHostSummary } from "@getpaseo/plugin/client";
import { SORTS, type HostSidebarPreferences } from "../shared/preferences";
import { hasActiveFilter, toggled, type Workspace } from "./model";
import type { Preferences } from "./preferences";
import { Icon } from "@getpaseo/plugin/client/ui";
import type { Styles } from "./styles";

const SORT_LABEL: Record<HostSidebarPreferences["sort"], string> = {
  created: "创建时间",
  activity: "最近活动",
  name: "名称",
  priority: "优先级",
};

const STATUS_LABEL: Record<HostSidebarPreferences["status"], string> = {
  all: "全部",
  active: "进行中",
  attention: "待处理",
};

const NO_LABEL = "\u0000none";
const groupByLabel = (workspace: Workspace) =>
  workspace.labels.length > 0 ? [...workspace.labels] : [NO_LABEL];

export function Chip({
  label,
  on,
  onPress,
  styles,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={[styles.chip, on ? styles.chipOn : null]}
    >
      <Text numberOfLines={1} style={[styles.chipText, on ? styles.chipTextOn : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A quiet text button with a leading icon; it only takes color when it is on. */
function ToolButton({
  icon,
  label,
  on,
  onPress,
  styles,
  color,
}: {
  icon: string;
  label: string;
  on?: boolean;
  onPress: () => void;
  styles: Styles;
  color: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      hitSlop={6}
      style={styles.toolButton}
    >
      <Icon name={icon} size={12} color={color} />
      <Text numberOfLines={1} style={[styles.toolText, on ? styles.toolTextOn : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Toolbar({
  preferences,
  hosts,
  styles,
  muted,
  strong,
}: {
  preferences: Preferences;
  hosts: readonly PluginHostSummary[];
  styles: Styles;
  /** Theme colors for the toolbar icons. */
  muted: string;
  strong: string;
}) {
  const { values, update } = preferences;
  const [open, setOpen] = useState(false);
  const labelGroups = useWorkspaces({ groupBy: groupByLabel });
  const labels = useMemo(
    () =>
      labelGroups
        .map((group) => group.key)
        .filter((key) => key !== NO_LABEL)
        .sort((a, b) => a.localeCompare(b)),
    [labelGroups],
  );

  const cycleSort = useCallback(() => {
    const next = SORTS[(SORTS.indexOf(values.sort) + 1) % SORTS.length];
    update({ sort: next });
  }, [values.sort, update]);
  const toggleOpen = useCallback(() => setOpen((value) => !value), []);
  const clear = useCallback(
    () => update({ status: "all", labels: [], hiddenHosts: [] }),
    [update],
  );
  const filtered = hasActiveFilter(values);

  return (
    <View>
      <View style={styles.toolbar}>
        <ToolButton
          icon="ArrowDownWideNarrow"
          label={SORT_LABEL[values.sort]}
          onPress={cycleSort}
          styles={styles}
          color={muted}
        />
        <ToolButton
          icon="ListFilter"
          label={filtered ? "筛选中" : "筛选"}
          on={open || filtered}
          onPress={toggleOpen}
          styles={styles}
          color={open || filtered ? strong : muted}
        />
      </View>
      {open ? (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>状态</Text>
          <View style={styles.chips}>
            {(Object.keys(STATUS_LABEL) as HostSidebarPreferences["status"][]).map((status) => (
              <Chip
                key={status}
                label={STATUS_LABEL[status]}
                on={values.status === status}
                onPress={() => update({ status })}
                styles={styles}
              />
            ))}
          </View>
          <Text style={styles.panelLabel}>HOST</Text>
          <View style={styles.chips}>
            {hosts.map((host) => (
              <Chip
                key={host.serverId}
                label={host.label}
                on={!values.hiddenHosts.includes(host.serverId)}
                onPress={() => update({ hiddenHosts: toggled(values.hiddenHosts, host.serverId) })}
                styles={styles}
              />
            ))}
          </View>
          {labels.length > 0 ? (
            <>
              <Text style={styles.panelLabel}>标签</Text>
              <View style={styles.chips}>
                {labels.map((label) => (
                  <Chip
                    key={label}
                    label={label}
                    on={values.labels.includes(label)}
                    onPress={() => update({ labels: toggled(values.labels, label) })}
                    styles={styles}
                  />
                ))}
              </View>
            </>
          ) : null}
          <Text style={styles.panelLabel}>显示</Text>
          <View style={styles.chips}>
            <Chip
              label={values.titleSource === "title" ? "名称 · 标题" : "名称 · 分支"}
              onPress={() =>
                update({ titleSource: values.titleSource === "title" ? "branch" : "title" })
              }
              styles={styles}
            />
            <Chip
              label={values.trailing === "diff" ? "右侧 · Diff" : "右侧 · 时间"}
              onPress={() => update({ trailing: values.trailing === "diff" ? "time" : "diff" })}
              styles={styles}
            />
            {filtered ? <Chip label="清除筛选" onPress={clear} styles={styles} /> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
