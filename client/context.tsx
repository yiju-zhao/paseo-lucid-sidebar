import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { PluginHostSummary, PluginSidebarViewProps } from "@getpaseo/plugin/client";
import type { CompareHosts } from "./layout";
import { compareNames } from "./model";
import type { Colors } from "./colors";
import type { Metrics } from "./density";
import type { HostIcon, SidebarPreferences } from "../shared/preferences";
import type { IdentityColor, SidebarPalette } from "./palette";
import type { Preferences } from "./preferences";
import type { ProjectDirectory } from "./runtime";

/** Everything known about connected hosts, in one place. */
export interface HostDirectory {
  list: readonly PluginHostSummary[];
  label(hostId: string): string;
  /** The daemon on this device. */
  isLocal(hostId: string): boolean;
  color(hostId: string): IdentityColor;
  /** Lucide icon name: the chosen icon, else a monitor for this device and a server elsewhere. */
  icon(hostId: string): string;
  /** Local host first, then by label. */
  compare: CompareHosts;
}

const HOST_ICON: Record<Exclude<HostIcon, "auto">, string> = {
  laptop: "Laptop",
  desktop: "Monitor",
  server: "Server",
  gpu: "Cpu",
  cloud: "Cloud",
};

export function makeHostDirectory(
  list: readonly PluginHostSummary[],
  localHostId: string | null,
  overrides: SidebarPreferences["hostOverrides"],
  colors: Colors,
): HostDirectory {
  const label = (hostId: string) => list.find((host) => host.serverId === hostId)?.label ?? hostId;
  const rank = (hostId: string) => (hostId === localHostId ? 0 : 1);
  return {
    list,
    label,
    isLocal: (hostId) => hostId === localHostId,
    color: (hostId) => colors.host(hostId),
    icon: (hostId) => {
      const icon = overrides[hostId]?.icon ?? "auto";
      if (icon !== "auto") return HOST_ICON[icon];
      return hostId === localHostId ? "Monitor" : "Server";
    },
    compare: (a, b) => rank(a) - rank(b) || compareNames(label(a), label(b)) || a.localeCompare(b),
  };
}

export interface SidebarContextValue {
  view: PluginSidebarViewProps;
  theme: PluginSidebarViewProps["theme"];
  palette: SidebarPalette;
  /** Touch sizing: compact layouts and native platforms. */
  touch: boolean;
  /** Pointer devices get hover affordances; always `!touch`. */
  pointer: boolean;
  preferences: Preferences;
  directory: ProjectDirectory;
  hosts: HostDirectory;
  /** Resolved colors for hosts, projects and labels. */
  colors: Colors;
  /** Row and spacing sizes for the chosen density on this layout. */
  metrics: Metrics;
  /** Opens the plugin's settings page; absent on apps without it. */
  openSettings?: () => void;
  /** A preview: rows do not open, and no menus or action buttons show. Folding still works. */
  readOnly: boolean;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export const SidebarContextProvider = SidebarContext.Provider;

export function useSidebar(): SidebarContextValue {
  const value = useContext(SidebarContext);
  if (!value) throw new Error("Sidebar context is missing");
  return value;
}

/**
 * Hover state. Spread `onHoverIn`/`onHoverOut` on a leaf `Pressable`. For anything that contains
 * other pressables, put `onPointerEnter`/`onPointerLeave` on a wrapping `View` instead:
 * react-native-web's `Pressable` ends its own hover when the pointer enters a nested
 * `Pressable`, which would hide the very buttons the pointer is moving to.
 */
export function useHover() {
  const [hovered, setHovered] = useState(false);
  const onHoverIn = useCallback(() => setHovered(true), []);
  const onHoverOut = useCallback(() => setHovered(false), []);
  return useMemo(
    () => ({
      hovered,
      onHoverIn,
      onHoverOut,
      onPointerEnter: onHoverIn,
      onPointerLeave: onHoverOut,
    }),
    [hovered, onHoverIn, onHoverOut],
  );
}

/** The fill of a pressable sidebar row: pressed wins over hovered. */
export function fill(palette: SidebarPalette, pressed: boolean, hovered: boolean): string {
  if (pressed) return palette.pressed;
  return hovered ? palette.hover : "transparent";
}

/** Accessibility label for a disclosure control. */
export const disclosureLabel = (collapsed: boolean, name: string) =>
  `${collapsed ? "Expand" : "Collapse"} ${name}`;
