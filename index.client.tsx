import type { PluginClientContext, PluginSidebarViewProps } from "@getpaseo/plugin/client";
import { AboutSettings } from "./client/settings/about";
import { PresentationSettings } from "./client/settings/presentation";
import { WorkspaceSidebar } from "./client/sidebar";

export default function contribute(client: PluginClientContext) {
  const cleanups: (() => unknown)[] = [];
  // Apps older than the settings page API do without the page and its menu entry.
  const settings = typeof client.addSettingsScreen === "function";
  if (settings) {
    cleanups.push(
      client.addSettingsScreen({
        id: "presentation",
        title: "Sidebar presentation",
        icon: "PanelLeft",
        Component: PresentationSettings,
      }),
      client.addSettingsScreen({
        id: "about",
        title: "About",
        icon: "Info",
        Component: AboutSettings,
      }),
    );
  }
  const openSettings =
    settings && typeof client.openSettings === "function"
      ? () => client.openSettings("presentation")
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
