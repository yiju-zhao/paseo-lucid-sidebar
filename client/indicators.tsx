import { useEffect, useMemo, type ReactNode } from "react";
import { Animated, Easing, Platform, Text, View } from "react-native";
import type { WorkspaceIndicator } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/ui";
import { useSidebar } from "./context";
import { Dot } from "./controls";
import { projectInitial } from "./model";
import { identityColor } from "./palette";
import type { CheckSummary } from "./runtime";

/** Status glyphs and project tiles, drawn like the built-in sidebar. */

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
function StatusRing() {
  const { palette } = useSidebar();
  const color = palette.dot.running;
  const rotate = useSharedSpin();
  const ring = {
    position: "absolute" as const,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  };
  return (
    <View style={{ width: 12, height: 12, alignItems: "center", justifyContent: "center" }}>
      <View style={{ ...ring, borderColor: color, opacity: 0.3 }} />
      <Animated.View
        style={{
          ...ring,
          borderColor: "transparent",
          borderTopColor: color,
          opacity: 0.9,
          transform: [{ rotate }],
        }}
      />
      <Dot color={color} />
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
function NeedsInputGlyph() {
  const { palette, theme } = useSidebar();
  const icon = useMemo(
    () => ({ svg: alertSvg(palette.dot.warning, theme.colors.surface0) }),
    [palette.dot.warning, theme.colors.surface0],
  );
  return <Icon icon={icon} size={12} color={palette.dot.warning} />;
}

/** The glyph for a status: ring, alert, or a colored dot. `done` is a faint dot. */
export function IndicatorGlyph({ indicator }: { indicator: WorkspaceIndicator }) {
  const { palette } = useSidebar();
  switch (indicator) {
    case "running":
      return <StatusRing />;
    case "needs_input":
      return <NeedsInputGlyph />;
    case "attention":
      return <Dot color={palette.dot.success} />;
    case "failed":
      return <Dot color={palette.dot.danger} />;
    default:
      return <Dot color={palette.extraMuted} opacity={0.3} />;
  }
}

/** The leading 16px (20px on touch) slot every row and header shares. */
export function LeadingSlot({ children }: { children?: ReactNode }) {
  const { touch } = useSidebar();
  return (
    <View
      style={{ width: touch ? 20 : 16, height: 20, alignItems: "center", justifyContent: "center" }}
    >
      {children}
    </View>
  );
}

const KIND_ICON: Record<string, string> = {
  local_checkout: "Monitor",
  worktree: "FolderGit2",
  checkout: "Folder",
  directory: "Folder",
};

/** The status slot of a row under a project header. A failed row shows its kind and a red dot. */
export function StatusIndicator({
  indicator,
  kind,
  loading,
}: {
  indicator: WorkspaceIndicator;
  kind: string;
  /** Archiving: shows the running ring. */
  loading: boolean;
}) {
  const { theme, palette, touch } = useSidebar();
  if (loading)
    return (
      <LeadingSlot>
        <StatusRing />
      </LeadingSlot>
    );
  if (indicator !== "failed")
    return (
      <LeadingSlot>
        <IndicatorGlyph indicator={indicator} />
      </LeadingSlot>
    );
  return (
    <LeadingSlot>
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
    </LeadingSlot>
  );
}

/** The project tile: a rounded square in the project's identity color with its initial. */
export function ProjectTile({
  viewKey,
  name,
  size,
}: {
  viewKey: string;
  name: string;
  size: number;
}) {
  const { palette } = useSidebar();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        backgroundColor: identityColor(viewKey, palette.dark).fill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: palette.onIdentity, fontSize: size >= 20 ? 11 : 9, fontWeight: "600" }}>
        {projectInitial(name)}
      </Text>
    </View>
  );
}

/**
 * A project tile with a status badge at its corner. The badge shell is filled with the row's
 * backdrop so it knocks out of the tile. `done` and null show no badge.
 */
export function ProjectStatusVisual({
  viewKey,
  name,
  indicator,
  backdrop,
}: {
  viewKey: string;
  name: string;
  indicator: WorkspaceIndicator | null;
  backdrop: string;
}) {
  const { touch } = useSidebar();
  const ring = indicator === "running";
  const shell = ring ? 14 : 12;
  return (
    <LeadingSlot>
      <View>
        <ProjectTile viewKey={viewKey} name={name} size={touch ? 20 : 16} />
        {indicator && indicator !== "done" ? (
          <View
            style={{
              position: "absolute",
              right: ring ? -5 : -4,
              bottom: ring ? -5 : -4,
              width: shell,
              height: shell,
              borderRadius: shell / 2,
              backgroundColor: backdrop,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IndicatorGlyph indicator={indicator} />
          </View>
        ) : null}
      </View>
    </LeadingSlot>
  );
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
