import { useState } from "react";
import { View } from "react-native";
import { useProject } from "@getpaseo/plugin/client";
import {
  CHECKS_DISPLAY,
  GROUPINGS,
  SORTS,
  TITLE_SOURCES,
  type ChecksDisplay,
  type Grouping,
  type SidebarPreferences,
  type Sort,
  type TitleSource,
} from "../shared/preferences";
import { useSidebar } from "./context";
import { MenuBack, MenuCard, MenuDot, MenuItem, MenuNote, MenuSeparator } from "./controls";
import { ProjectTile } from "./indicators";
import { toggled } from "./model";
import type { SidebarData } from "./queries";
import { ROW_ITEM_TOGGLES } from "./row-items";
import { useCloseMenu } from "./ui-state";

/** The display preferences menu under the Workspaces header, mirroring the built-in one. */

type Page =
  "root" | "grouping" | "sort" | "title" | "show" | "checks" | "host" | "project" | "labels";

type FilterField = "hostFilter" | "projectFilter" | "labelFilter";

const GROUPING: Record<Grouping, { label: string; icon: string }> = {
  project: { label: "Project", icon: "Folder" },
  status: { label: "Status", icon: "CircleDashed" },
};
const SORT: Record<Sort, string> = { created: "Created", lastPrompt: "Last prompt" };
const TITLE: Record<TitleSource, { label: string; icon: string }> = {
  title: { label: "Title", icon: "Type" },
  branch: { label: "Branch name", icon: "GitBranch" },
};
const CHECKS: Record<ChecksDisplay, { label: string; icon: string }> = {
  iconAndText: { label: "Icon and text", icon: "Captions" },
  icon: { label: "Icon only", icon: "CircleCheck" },
  none: { label: "Hidden", icon: "EyeOff" },
};

/** A filter's current value: "All", the one selected name, or a count. */
function filterValue(selected: readonly string[], name?: (id: string) => string): string {
  if (selected.length === 0) return "All";
  return selected.length === 1 && name ? name(selected[0]) : `${selected.length}`;
}

export function DisplayMenu({ data }: { data: Pick<SidebarData, "labels" | "projectOptions"> }) {
  const { preferences, hosts, theme, colors } = useSidebar();
  const close = useCloseMenu();
  const values = preferences.values;
  const [page, setPage] = useState<Page>("root");
  const set = (patch: Partial<SidebarPreferences>, done = false) => {
    preferences.update(patch);
    if (done) close();
  };
  const toggleIn = (field: FilterField, id: string) =>
    preferences.update((current) => ({ [field]: toggled(current[field], id) }));
  const back = (title: string, to: Page = "root") => (
    <MenuBack title={title} onPress={() => setPage(to)} />
  );

  switch (page) {
    case "grouping":
      return (
        <MenuCard>
          {back("Grouping")}
          {GROUPINGS.map((grouping) => (
            <MenuItem
              key={grouping}
              {...GROUPING[grouping]}
              checked={values.grouping === grouping}
              onPress={() => set({ grouping }, true)}
            />
          ))}
        </MenuCard>
      );
    case "sort":
      return (
        <MenuCard>
          {back("Sort")}
          {SORTS.map((sort) => (
            <MenuItem
              key={sort}
              label={SORT[sort]}
              checked={values.sort === sort}
              onPress={() => set({ sort }, true)}
            />
          ))}
        </MenuCard>
      );
    case "title":
      return (
        <MenuCard>
          {back("Title")}
          {TITLE_SOURCES.map((titleSource) => (
            <MenuItem
              key={titleSource}
              {...TITLE[titleSource]}
              checked={values.titleSource === titleSource}
              onPress={() => set({ titleSource }, true)}
            />
          ))}
        </MenuCard>
      );
    case "checks":
      return (
        <MenuCard>
          {back("Checks", "show")}
          {CHECKS_DISPLAY.map((checks) => (
            <MenuItem
              key={checks}
              {...CHECKS[checks]}
              checked={values.checks === checks}
              onPress={() => set({ checks })}
            />
          ))}
        </MenuCard>
      );
    case "show":
      return (
        <MenuCard>
          {back("Show")}
          {ROW_ITEM_TOGGLES.map(({ key, label, icon }) => (
            <MenuItem
              key={key}
              icon={icon}
              label={label}
              checked={values.rowItems[key]}
              onPress={() =>
                preferences.update((current) => ({
                  rowItems: { ...current.rowItems, [key]: !current.rowItems[key] },
                }))
              }
            />
          ))}
          <MenuItem
            icon="CircleCheck"
            label="Checks"
            value={CHECKS[values.checks].label}
            submenu
            onPress={() => setPage("checks")}
          />
          <MenuSeparator />
          {/* A radio that can be unticked: picking the current choice clears the slot. */}
          <MenuItem
            icon="Diff"
            label="Diff stats"
            checked={values.trailing === "diff"}
            onPress={() => set({ trailing: values.trailing === "diff" ? "none" : "diff" })}
          />
          <MenuItem
            icon="Clock"
            label="Last activity"
            checked={values.trailing === "timestamp"}
            onPress={() =>
              set({ trailing: values.trailing === "timestamp" ? "none" : "timestamp" })
            }
          />
        </MenuCard>
      );
    case "host":
      return (
        <MenuCard>
          {back("Host")}
          <MenuItem
            label="All hosts"
            checked={values.hostFilter.length === 0}
            onPress={() => set({ hostFilter: [] })}
          />
          {hosts.list.map((host) => (
            <MenuItem
              key={host.serverId}
              label={hosts.label(host.serverId)}
              checked={values.hostFilter.includes(host.serverId)}
              leading={
                <MenuDot
                  color={
                    host.status === "online"
                      ? theme.colors.statusSuccess
                      : theme.colors.foregroundMuted
                  }
                />
              }
              onPress={() => toggleIn("hostFilter", host.serverId)}
            />
          ))}
        </MenuCard>
      );
    case "project":
      return (
        <MenuCard>
          {back("Project")}
          <MenuItem
            label="All projects"
            checked={values.projectFilter.length === 0}
            onPress={() => set({ projectFilter: [] })}
          />
          {data.projectOptions.map((option) => (
            <ProjectFilterItem
              key={option.viewKey}
              option={option}
              checked={values.projectFilter.includes(option.viewKey)}
              onPress={() => toggleIn("projectFilter", option.viewKey)}
            />
          ))}
        </MenuCard>
      );
    case "labels":
      return (
        <MenuCard>
          {back("Labels")}
          {data.labels.map((label) => (
            <MenuItem
              key={label.key}
              label={label.title}
              checked={values.labelFilter.includes(label.key)}
              leading={<MenuDot color={colors.label(label.key).fill} />}
              onPress={() => toggleIn("labelFilter", label.key)}
            />
          ))}
          <MenuItem
            label="Unlabelled"
            checked={values.labelFilter.includes("")}
            leading={<HollowDot />}
            onPress={() => toggleIn("labelFilter", "")}
          />
          {values.labelFilter.length > 0 ? (
            <>
              <MenuSeparator />
              <MenuItem icon="X" label="Clear filter" onPress={() => set({ labelFilter: [] })} />
            </>
          ) : null}
        </MenuCard>
      );
    default:
      break;
  }

  const multipleHosts = hosts.list.length > 1;
  const multipleProjects = data.projectOptions.length > 1;
  return (
    <MenuCard>
      <MenuItem
        icon={GROUPING[values.grouping].icon}
        label="Grouping"
        value={GROUPING[values.grouping].label}
        submenu
        onPress={() => setPage("grouping")}
      />
      {values.grouping === "project" ? (
        <MenuItem
          icon="ArrowUpDown"
          label="Sort"
          value={SORT[values.sort]}
          submenu
          onPress={() => setPage("sort")}
        />
      ) : null}
      <MenuItem
        icon="Type"
        label="Title"
        value={TITLE[values.titleSource].label}
        submenu
        onPress={() => setPage("title")}
      />
      <MenuItem icon="Eye" label="Show" submenu onPress={() => setPage("show")} />
      {multipleHosts || multipleProjects ? <MenuSeparator /> : null}
      {multipleHosts ? (
        <MenuItem
          icon="Server"
          label="Host"
          value={filterValue(values.hostFilter, hosts.label)}
          submenu
          onPress={() => setPage("host")}
        />
      ) : null}
      {multipleProjects ? (
        <MenuItem
          icon="Folder"
          label="Project"
          value={filterValue(values.projectFilter)}
          submenu
          onPress={() => setPage("project")}
        />
      ) : null}
      {data.labels.length > 0 || values.labelFilter.length > 0 ? (
        <>
          <MenuSeparator />
          <MenuItem
            icon="Tag"
            label="Labels"
            value={filterValue(values.labelFilter)}
            submenu
            onPress={() => setPage("labels")}
          />
        </>
      ) : null}
      <MenuSeparator />
      <MenuItem
        icon="EyeOff"
        label="Show background"
        checked={values.showBackground}
        onPress={() => set({ showBackground: !values.showBackground })}
      />
      {preferences.error ? <MenuNote text={preferences.error} error /> : null}
    </MenuCard>
  );
}

function ProjectFilterItem({
  option,
  checked,
  onPress,
}: {
  option: SidebarData["projectOptions"][number];
  checked: boolean;
  onPress: () => void;
}) {
  const name = useProject(option.reference, (project) => project.displayName) ?? option.viewKey;
  return (
    <MenuItem
      label={name}
      checked={checked}
      leading={<ProjectTile viewKey={option.viewKey} name={name} size={14} />}
      onPress={onPress}
    />
  );
}

/** The "Unlabelled" marker: a hollow circle. */
function HollowDot() {
  const { theme } = useSidebar();
  return (
    <View style={{ width: 14, alignItems: "center" }}>
      <View
        style={{
          width: 11,
          height: 11,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: theme.colors.foregroundMuted,
        }}
      />
    </View>
  );
}
