import type { PluginClientContext } from "@getpaseo/plugin/client";
import { HostSidebar } from "./client/host-sidebar";

export default function contribute(client: PluginClientContext) {
  const remove = client.addSidebarView({
    id: "hosts",
    title: "按 Host 分组",
    description: "按 Host 分组的工作区列表，项目以标签显示",
    Component: HostSidebar,
  });
  return () => {
    void remove();
  };
}
