import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/ui";
import type { Grouping } from "../../shared/preferences";
import { makePalette } from "../palette";
import { usePreferences } from "../preferences";
import { RuntimeProvider } from "../runtime";
import { WorkspaceSidebar } from "../sidebar";
import { AppearanceSection } from "./appearance";
import { HostsSection } from "./hosts";
import { ProjectsSection } from "./projects";

/** Settings beside the preview from this width; below it the preview sits on top. */
const SIDE_BY_SIDE = 640;
const PREVIEW_WIDTH = 300;

const noop = () => undefined;
const PREVIEW_NAVIGATION = {
  openWorkspace: noop,
  openAgent: noop,
  openTerminal: noop,
  openProject: noop,
};
const NO_ACTIVE = { workspace: null, agent: null };

/**
 * The Sidebar presentation tab: appearance, host and project colors on the left, and the user's
 * own sidebar on the right, read-only, restyled live as the options change.
 */
export function PresentationSettings({ theme, layout }: PluginSurfaceProps) {
  const preferences = usePreferences();
  const [width, setWidth] = useState(0);
  if (preferences.loading) return null;
  const side = !layout.compact && width >= SIDE_BY_SIDE;
  const preview = (
    <Preview
      theme={theme}
      layout={layout}
      height={side ? 760 : 560}
      width={side ? PREVIEW_WIDTH : undefined}
      initialGrouping={preferences.values.grouping}
    />
  );
  const settings = (
    <View style={{ flex: side ? 1 : undefined, minWidth: 0, gap: 16 }}>
      <AppearanceSection preferences={preferences} />
      <HostsSection preferences={preferences} />
      <RuntimeProvider watchWorkspaces={false}>
        <ProjectsSection preferences={preferences} />
      </RuntimeProvider>
    </View>
  );
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ flexDirection: side ? "row" : "column", alignItems: "flex-start", gap: 20 }}
    >
      {side ? settings : preview}
      {side ? preview : settings}
    </View>
  );
}

const MODES: { value: Grouping; label: string; icon: string }[] = [
  { value: "project", label: "Project", icon: "Folder" },
  { value: "status", label: "Status", icon: "CircleDashed" },
];

/** The user's sidebar, read-only, with a Project / Status switch that only affects the preview. */
function Preview({
  theme,
  layout,
  height,
  width,
  initialGrouping,
}: Pick<PluginSurfaceProps, "theme" | "layout"> & {
  height: number;
  width?: number;
  initialGrouping: Grouping;
}) {
  const palette = makePalette(theme);
  const [grouping, setGrouping] = useState<Grouping>(initialGrouping);
  return (
    <View style={{ width: width ?? "100%", gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>
          Preview of your sidebar
        </Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Preview grouping"
          style={{
            flexDirection: "row",
            padding: 2,
            gap: 2,
            borderRadius: 8,
            backgroundColor: theme.colors.surface2,
          }}
        >
          {MODES.map((mode) => {
            const selected = grouping === mode.value;
            const color = selected ? theme.colors.foreground : theme.colors.foregroundMuted;
            return (
              <Pressable
                key={mode.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Preview ${mode.label.toLowerCase()} grouping`}
                onPress={() => setGrouping(mode.value)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: layout.compact ? 6 : 3,
                  borderRadius: 6,
                  backgroundColor: selected ? theme.colors.surface0 : "transparent",
                }}
              >
                <Icon name={mode.icon} size={12} color={color} />
                <Text style={{ color, fontSize: 12 }}>{mode.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View
        style={{
          height,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: palette.backdrop,
          overflow: "hidden",
        }}
      >
        <WorkspaceSidebar
          theme={theme}
          layout={layout}
          active={NO_ACTIVE}
          navigation={PREVIEW_NAVIGATION}
          dismiss={noop}
          readOnly
          grouping={grouping}
        />
      </View>
    </View>
  );
}
