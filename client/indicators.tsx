import { useEffect, useMemo } from "react";
import { Animated, Easing, Platform, Text, View } from "react-native";
import type { PluginTheme, WorkspaceIndicator } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/ui";
import { identityColor, type SidebarPalette } from "./palette";
import { projectInitial } from "./model";
import type { CheckSummary } from "./runtime";

/**
 * Every running ring shares one rotation, like the built-in sidebar, so rings stay in phase.
 * The loop runs while at least one ring is mounted.
 */
const rotation = new Animated.Value(0);
let ringCount = 0;
let loop: Animated.CompositeAnimation | null = null;
const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

function useSharedSpin() {
  useEffect(() => {
    ringCount += 1;
    if (!loop) {
      rotation.setValue(0);
      loop = Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
      );
      loop.start();
    }
    return () => {
      ringCount -= 1;
      if (ringCount === 0 && loop) {
        loop.stop();
        loop = null;
      }
    };
  }, []);
  return spin;
}

/** 12px ring: track at 30%, a spinning quarter arc, and a solid 6px centre dot. */
export function StatusRing({ color }: { color: string }) {
  const rotate = useSharedSpin();
  return (
    <View style={{ width: 12, height: 12, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          width: 12,
          height: 12,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: color,
          opacity: 0.3,
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          width: 12,
          height: 12,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: "transparent",
          borderTopColor: color,
          opacity: 0.9,
          transform: [{ rotate }],
        }}
      />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

function alertSvg(fill: string, stroke: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-linecap="round">` +
    `<circle cx="12" cy="12" r="10" fill="${fill}" stroke="${stroke}" stroke-width="2"/>` +
    `<line x1="12" y1="8" x2="12" y2="12" stroke="${stroke}" stroke-width="2"/>` +
    `<line x1="12" y1="16" x2="12.01" y2="16" stroke="${stroke}" stroke-width="2"/>` +
    `</svg>`
  );
}

/** Lucide's CircleAlert filled with the warning dot color: an amber disc with a cut-out "!". */
export function NeedsInputGlyph({
  palette,
  theme,
}: {
  palette: SidebarPalette;
  theme: PluginTheme;
}) {
  const icon = useMemo(
    () => ({ svg: alertSvg(palette.dot.warning, theme.colors.surface0) }),
    [palette.dot.warning, theme.colors.surface0],
  );
  return <Icon icon={icon} size={12} color={palette.dot.warning} />;
}

function Dot({ color, size = 6, opacity = 1 }: { color: string; size?: number; opacity?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity }}
    />
  );
}

const KIND_ICON: Record<string, string> = {
  local_checkout: "Monitor",
  worktree: "FolderGit2",
  checkout: "Folder",
  directory: "Folder",
};

export interface IndicatorProps {
  indicator: WorkspaceIndicator;
  /** Workspace kind; drawn for failed workspaces. */
  kind: string;
  /** Archiving: shows the running ring. */
  loading: boolean;
  touch: boolean;
  palette: SidebarPalette;
  theme: PluginTheme;
}

/** The leading status slot of a workspace row nested under a project. */
export function StatusIndicator({
  indicator,
  kind,
  loading,
  touch,
  palette,
  theme,
}: IndicatorProps) {
  const slot = touch ? 20 : 16;
  let content;
  if (loading || indicator === "running") content = <StatusRing color={palette.dot.running} />;
  else if (indicator === "needs_input")
    content = <NeedsInputGlyph palette={palette} theme={theme} />;
  else if (indicator === "attention") content = <Dot color={palette.dot.success} />;
  else if (indicator === "done") content = <Dot color={palette.extraMuted} opacity={0.3} />;
  else
    content = (
      <View>
        <Icon
          name={KIND_ICON[kind] ?? "Folder"}
          size={touch ? 18 : 14}
          color={theme.colors.foregroundMuted}
        />
        <View
          style={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: palette.dot.danger,
            borderWidth: 1,
            borderColor: theme.colors.surface0,
          }}
        />
      </View>
    );
  return (
    <View style={{ width: slot, height: 20, alignItems: "center", justifyContent: "center" }}>
      {content}
    </View>
  );
}

/** The project tile: a rounded square in the project's identity color with its initial. */
export function ProjectTile({
  viewKey,
  name,
  size,
  palette,
}: {
  viewKey: string;
  name: string;
  size: number;
  palette: SidebarPalette;
}) {
  const color = identityColor(viewKey, palette.dark);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        backgroundColor: color.fill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#ffffff", fontSize: size >= 20 ? 11 : 9, fontWeight: "600" }}>
        {projectInitial(name)}
      </Text>
    </View>
  );
}

/**
 * A project tile with a status badge at its corner. The badge shell is filled with the row's
 * backdrop so it knocks out of the tile.
 */
export function ProjectStatusVisual({
  viewKey,
  name,
  indicator,
  loading,
  backdrop,
  touch,
  palette,
  theme,
}: {
  viewKey: string;
  name: string;
  /** Null hides the badge. */
  indicator: WorkspaceIndicator | null;
  loading: boolean;
  backdrop: string;
  touch: boolean;
  palette: SidebarPalette;
  theme: PluginTheme;
}) {
  const size = touch ? 20 : 16;
  const state = loading ? "running" : indicator;
  let badge = null;
  if (state === "running")
    badge = (
      <View style={[badgeShell(backdrop, 14), { right: -5, bottom: -5 }]}>
        <StatusRing color={palette.dot.running} />
      </View>
    );
  else if (state === "needs_input")
    badge = (
      <View style={[badgeShell(backdrop, 12), { right: -4, bottom: -4 }]}>
        <NeedsInputGlyph palette={palette} theme={theme} />
      </View>
    );
  else if (state === "failed" || state === "attention")
    badge = (
      <View style={[badgeShell(backdrop, 12), { right: -4, bottom: -4 }]}>
        <Dot color={state === "failed" ? palette.dot.danger : palette.dot.success} />
      </View>
    );
  return (
    <View style={{ width: size, height: 20, alignItems: "center", justifyContent: "center" }}>
      <View>
        <ProjectTile viewKey={viewKey} name={name} size={size} palette={palette} />
        {badge}
      </View>
    </View>
  );
}

function badgeShell(backdrop: string, size: number) {
  return {
    position: "absolute" as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: backdrop,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
}

function checksSvg(summary: CheckSummary, color: string): string {
  let inner = "";
  if (summary.state === "passed")
    inner = `<path d="m8.5 12 2.5 2.5 4.5-5" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  else if (summary.state === "failed")
    inner = `<path d="m9 9 6 6M15 9l-6 6" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  else {
    const filled =
      summary.total === 0 ? 0 : Math.floor((summary.completed / summary.total) * 4) / 4;
    if (filled >= 1) inner = `<circle cx="12" cy="12" r="6" fill="${color}"/>`;
    else if (filled > 0) {
      const angle = filled * 2 * Math.PI;
      const x = (12 + 6 * Math.sin(angle)).toFixed(3);
      const y = (12 - 6 * Math.cos(angle)).toFixed(3);
      const large = filled > 0.5 ? 1 : 0;
      inner = `<path d="M12 12V6A6 6 0 ${large} 1 ${x} ${y}Z" fill="${color}"/>`;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">` +
    `<circle cx="12" cy="12" r="10" stroke="${color}" stroke-width="2" fill="none"/>${inner}</svg>`
  );
}

export function ChecksGlyph({ summary, color }: { summary: CheckSummary; color: string }) {
  const icon = useMemo(() => ({ svg: checksSvg(summary, color) }), [summary, color]);
  return <Icon icon={icon} size={12} color={color} />;
}
