import { useState } from "react";
import { View } from "react-native";
import { useProject, type ProjectRef } from "@getpaseo/plugin/client";
import type { ChecksDisplay, RowItem, SidebarPreferences } from "../shared/preferences";
import { useSidebar } from "./context";
import { ProjectTile } from "./indicators";
import { MenuBack, MenuCard, MenuItem, MenuNote, MenuSeparator } from "./menu";
import { toggled } from "./model";
import { identityColor } from "./palette";

type Page =
  "root" | "grouping" | "sort" | "title" | "show" | "checks" | "host" | "project" | "labels";

export interface ProjectOption {
  viewKey: string;
  reference: ProjectRef;
}

export interface LabelOption {
  key: string;
  title: string;
}

const SORT_LABEL = { created: "Created", lastPrompt: "Last prompt" } as const;
const CHECKS_LABEL: Record<ChecksDisplay, string> = {
  iconAndText: "Icon and text",
  icon: "Icon only",
  none: "Hidden",
};
const ROW_ITEMS: { item: RowItem; label: string; icon: string }[] = [
  { item: "branch", label: "Branch", icon: "GitBranch" },
  { item: "project", label: "Project", icon: "Folder" },
  { item: "host", label: "Host", icon: "Server" },
  { item: "changeRequest", label: "Pull request", icon: "GitPullRequest" },
  { item: "services", label: "Services", icon: "Globe" },
  { item: "labels", label: "Labels", icon: "Tag" },
];

export function DisplayMenu({
  projects,
  labels,
}: {
  projects: readonly ProjectOption[];
  labels: readonly LabelOption[];
}) {
  const { preferences, hosts, setOpenMenu, theme } = useSidebar();
  const values = preferences.values;
  const [page, setPage] = useState<Page>("root");
  const set = (patch: Partial<SidebarPreferences>, close = false) => {
    preferences.update(patch);
    if (close) setOpenMenu(null);
  };
  const back = (title: string, to: Page = "root") => (
    <>
      <MenuBack title={title} onPress={() => setPage(to)} />
      <MenuSeparator />
    </>
  );

  if (page === "grouping")
    return (
      <MenuCard>
        {back("Grouping")}
        <MenuItem
          icon="Folder"
          label="Project"
          checked={values.grouping === "project"}
          onPress={() => set({ grouping: "project" }, true)}
        />
        <MenuItem
          icon="CircleDashed"
          label="Status"
          checked={values.grouping === "status"}
          onPress={() => set({ grouping: "status" }, true)}
        />
      </MenuCard>
    );

  if (page === "sort")
    return (
      <MenuCard>
        {back("Sort")}
        {(["created", "lastPrompt"] as const).map((sort) => (
          <MenuItem
            key={sort}
            label={SORT_LABEL[sort]}
            checked={values.sort === sort}
            onPress={() => set({ sort }, true)}
          />
        ))}
      </MenuCard>
    );

  if (page === "title")
    return (
      <MenuCard>
        {back("Title")}
        <MenuItem
          icon="Type"
          label="Title"
          checked={values.titleSource === "title"}
          onPress={() => set({ titleSource: "title" }, true)}
        />
        <MenuItem
          icon="GitBranch"
          label="Branch name"
          checked={values.titleSource === "branch"}
          onPress={() => set({ titleSource: "branch" }, true)}
        />
      </MenuCard>
    );

  if (page === "checks")
    return (
      <MenuCard>
        {back("Checks", "show")}
        {(
          [
            ["iconAndText", "Captions"],
            ["icon", "CircleCheck"],
            ["none", "EyeOff"],
          ] as const
        ).map(([checks, icon]) => (
          <MenuItem
            key={checks}
            icon={icon}
            label={CHECKS_LABEL[checks]}
            checked={values.checks === checks}
            onPress={() => set({ checks })}
          />
        ))}
      </MenuCard>
    );

  if (page === "show")
    return (
      <MenuCard>
        {back("Show")}
        {ROW_ITEMS.map(({ item, label, icon }) => (
          <MenuItem
            key={item}
            icon={icon}
            label={label}
            checked={values.rowItems[item]}
            onPress={() =>
              preferences.update((current) => ({
                rowItems: { ...current.rowItems, [item]: !current.rowItems[item] },
              }))
            }
          />
        ))}
        <MenuItem
          icon="CircleCheck"
          label="Checks"
          value={CHECKS_LABEL[values.checks]}
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
          onPress={() => set({ trailing: values.trailing === "timestamp" ? "none" : "timestamp" })}
        />
      </MenuCard>
    );

  if (page === "host")
    return (
      <MenuCard>
        {back("Host")}
        <MenuItem
          label="All hosts"
          checked={values.hostFilter.length === 0}
          onPress={() => set({ hostFilter: [] })}
        />
        {hosts.map((host) => (
          <MenuItem
            key={host.serverId}
            label={host.label}
            checked={values.hostFilter.includes(host.serverId)}
            leading={
              <View
                style={{
                  width: 8,
                  height: 8,
                  marginHorizontal: 3,
                  borderRadius: 4,
                  backgroundColor:
                    host.status === "online"
                      ? theme.colors.statusSuccess
                      : theme.colors.foregroundMuted,
                }}
              />
            }
            onPress={() =>
              preferences.update((current) => ({
                hostFilter: toggled(current.hostFilter, host.serverId),
              }))
            }
          />
        ))}
      </MenuCard>
    );

  if (page === "project")
    return (
      <MenuCard>
        {back("Project")}
        <MenuItem
          label="All projects"
          checked={values.projectFilter.length === 0}
          onPress={() => set({ projectFilter: [] })}
        />
        {projects.map((project) => (
          <ProjectFilterItem
            key={project.viewKey}
            option={project}
            checked={values.projectFilter.includes(project.viewKey)}
            onPress={() =>
              preferences.update((current) => ({
                projectFilter: toggled(current.projectFilter, project.viewKey),
              }))
            }
          />
        ))}
      </MenuCard>
    );

  if (page === "labels")
    return (
      <MenuCard>
        {back("Labels")}
        {[...labels, { key: "", title: "Unlabelled" }].map((label) => (
          <LabelFilterItem
            key={label.key || "unlabelled"}
            option={label}
            checked={values.labelFilter.includes(label.key)}
            onPress={() =>
              preferences.update((current) => ({
                labelFilter: toggled(current.labelFilter, label.key),
              }))
            }
          />
        ))}
        {values.labelFilter.length > 0 ? (
          <>
            <MenuSeparator />
            <MenuItem icon="X" label="Clear filter" onPress={() => set({ labelFilter: [] })} />
          </>
        ) : null}
      </MenuCard>
    );

  const hostValue =
    values.hostFilter.length === 0
      ? "All"
      : values.hostFilter.length === 1
        ? (hosts.find((host) => host.serverId === values.hostFilter[0])?.label ?? "1")
        : `${values.hostFilter.length}`;
  return (
    <MenuCard>
      <MenuItem
        icon={values.grouping === "project" ? "Folder" : "CircleDashed"}
        label="Grouping"
        value={values.grouping === "project" ? "Project" : "Status"}
        submenu
        onPress={() => setPage("grouping")}
      />
      {values.grouping === "project" ? (
        <MenuItem
          icon="ArrowUpDown"
          label="Sort"
          value={SORT_LABEL[values.sort]}
          submenu
          onPress={() => setPage("sort")}
        />
      ) : null}
      <MenuItem
        icon="Type"
        label="Title"
        value={values.titleSource === "title" ? "Title" : "Branch name"}
        submenu
        onPress={() => setPage("title")}
      />
      <MenuItem icon="Eye" label="Show" submenu onPress={() => setPage("show")} />
      {hosts.length > 1 || projects.length > 1 ? <MenuSeparator /> : null}
      {hosts.length > 1 ? (
        <MenuItem
          icon="Server"
          label="Host"
          value={hostValue}
          submenu
          onPress={() => setPage("host")}
        />
      ) : null}
      {projects.length > 1 ? (
        <MenuItem
          icon="Folder"
          label="Project"
          value={values.projectFilter.length === 0 ? "All" : `${values.projectFilter.length}`}
          submenu
          onPress={() => setPage("project")}
        />
      ) : null}
      {labels.length > 0 || values.labelFilter.length > 0 ? (
        <>
          <MenuSeparator />
          <MenuItem
            icon="Tag"
            label="Labels"
            value={values.labelFilter.length === 0 ? "All" : `${values.labelFilter.length}`}
            submenu
            onPress={() => setPage("labels")}
          />
        </>
      ) : null}
      <MenuSeparator />
      {hosts.length > 1 ? (
        <MenuItem
          icon="Server"
          label="Keep hosts together"
          checked={values.clusterByHost}
          onPress={() => set({ clusterByHost: !values.clusterByHost })}
        />
      ) : null}
      <MenuItem
        icon="EyeOff"
        label="Show background"
        checked={values.showBackground}
        onPress={() => set({ showBackground: !values.showBackground })}
      />
      {preferences.error ? <MenuNote text={preferences.error} /> : null}
    </MenuCard>
  );
}

function ProjectFilterItem({
  option,
  checked,
  onPress,
}: {
  option: ProjectOption;
  checked: boolean;
  onPress: () => void;
}) {
  const { palette } = useSidebar();
  const name = useProject(option.reference, (project) => project.displayName) ?? option.viewKey;
  return (
    <MenuItem
      label={name}
      checked={checked}
      leading={<ProjectTile viewKey={option.viewKey} name={name} size={14} palette={palette} />}
      onPress={onPress}
    />
  );
}

function LabelFilterItem({
  option,
  checked,
  onPress,
}: {
  option: LabelOption;
  checked: boolean;
  onPress: () => void;
}) {
  const { palette, theme } = useSidebar();
  const dot =
    option.key === "" ? (
      <View
        style={{
          width: 11,
          height: 11,
          marginHorizontal: 1.5,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: theme.colors.foregroundMuted,
        }}
      />
    ) : (
      <View
        style={{
          width: 8,
          height: 8,
          marginHorizontal: 3,
          borderRadius: 4,
          backgroundColor: identityColor(option.key, palette.dark).fill,
        }}
      />
    );
  return <MenuItem label={option.title} checked={checked} leading={dot} onPress={onPress} />;
}
