import type { PluginClientContext } from "@getpaseo/plugin/client";
import { WorkspaceSidebar } from "./client/sidebar";

export default function contribute(client: PluginClientContext) {
  const remove = client.addSidebarView({
    id: "hosts",
    title: "Workspace sidebar",
    description: "The default workspace list, rebuilt as a plugin view",
    Component: WorkspaceSidebar,
  });
  return () => {
    void remove();
  };
}
