import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { PluginHostSummary, PluginSidebarViewProps } from "@getpaseo/plugin/client";
import type { SidebarPalette } from "./palette";
import type { Preferences } from "./preferences";
import type { ProjectDirectory } from "./runtime";

export interface SidebarContextValue {
  view: PluginSidebarViewProps;
  theme: PluginSidebarViewProps["theme"];
  palette: SidebarPalette;
  /** Touch sizing: compact layouts and native platforms. */
  touch: boolean;
  /** Pointer devices get hover affordances. */
  pointer: boolean;
  preferences: Preferences;
  directory: ProjectDirectory;
  hosts: readonly PluginHostSummary[];
  /** Whether rows show the host item: true when the visible list spans two or more hosts. */
  multiHost: boolean;
  localHostId: string | null;
  now: number;
  /** Key of the one open inline menu, such as `workspace:<key>` or `display`. */
  openMenu: string | null;
  setOpenMenu: (key: string | null) => void;
  /** Key of the workspace whose title is being edited. */
  renaming: string | null;
  setRenaming: (key: string | null) => void;
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
