import type { PluginClientContext, PluginSidebarViewProps } from "@getpaseo/plugin/client";
import { AppearanceSettings } from "./client/settings/appearance";
import { HostsSettings } from "./client/settings/hosts";
import { ProjectsSettings } from "./client/settings/projects";
import { WorkspaceSidebar } from "./client/sidebar";

export default function contribute(client: PluginClientContext) {
  const cleanups: (() => unknown)[] = [];
  // Apps older than the settings page API do without the page and its menu entry.
  const settings = typeof client.addSettingsScreen === "function";
  if (settings) {
    cleanups.push(
      client.addSettingsScreen({
        id: "appearance",
        title: "Appearance",
        icon: "Palette",
        Component: AppearanceSettings,
      }),
      client.addSettingsScreen({
        id: "hosts",
        title: "Hosts",
        icon: "Server",
        Component: HostsSettings,
      }),
      client.addSettingsScreen({
        id: "projects",
        title: "Projects",
        icon: "Folder",
        Component: ProjectsSettings,
      }),
    );
  }
  const openSettings =
    settings && typeof client.openSettings === "function"
      ? () => client.openSettings("appearance")
      : undefined;
  function Sidebar(props: PluginSidebarViewProps) {
    return <WorkspaceSidebar {...props} openSettings={openSettings} />;
  }
  cleanups.push(
    client.addSidebarView({
      id: "hosts",
      title: "Lucid sidebar",
      description: "The default workspace list, rebuilt as a plugin view",
      Component: Sidebar,
    }),
  );
  return () => {
    for (const cleanup of cleanups) void cleanup();
  };
}
