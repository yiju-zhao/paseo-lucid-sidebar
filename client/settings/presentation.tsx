import { useState } from "react";
import { Text, View } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
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
      height={side ? 560 : 420}
      width={side ? PREVIEW_WIDTH : undefined}
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

function Preview({
  theme,
  layout,
  height,
  width,
}: Pick<PluginSurfaceProps, "theme" | "layout"> & { height: number; width?: number }) {
  const palette = makePalette(theme);
  return (
    <View style={{ width: width ?? "100%", gap: 6 }}>
      <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>
        Preview of your sidebar
      </Text>
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
        />
      </View>
    </View>
  );
}
