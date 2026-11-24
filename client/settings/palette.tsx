import { useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import {
  useHosts,
  useProject,
  useProjects,
  type PluginHostSummary,
  type PluginSurfaceProps,
  type ProjectRef,
} from "@getpaseo/plugin/client";
import { Icon, SettingsCard, SettingsSection } from "@getpaseo/plugin/client/ui";
import { COLOR_NAMES, HOST_ICONS, type ColorName, type HostIcon } from "../../shared/preferences";
import { autoColorName, colorFor } from "../colors";
import { hostIconName } from "../context";
import { useLocalHostId } from "../local-host";
import { compareNames } from "../model";
import { makePalette, type IdentityColor } from "../palette";
import type { Preferences } from "../preferences";
import { useProjectDirectory } from "../runtime";

type Theme = PluginSurfaceProps["theme"];
type Choice = ColorName | "auto";

interface Shared {
  preferences: Preferences;
  theme: Theme;
  dark: boolean;
  /** Text on a solid identity fill. */
  onFill: string;
  touch: boolean;
}

/**
 * The Palette: one line per host and project, its name drawn in its current color beside a row
 * of swatches. Needs a RuntimeProvider above it for project view keys.
 */
export function PaletteSection({
  preferences,
  theme,
  touch,
}: {
  preferences: Preferences;
  theme: Theme;
  touch: boolean;
}) {
  const palette = makePalette(theme);
  const shared: Shared = {
    preferences,
    theme,
    dark: palette.dark,
    onFill: palette.onIdentity,
    touch,
  };
  return (
    <SettingsSection title="Palette">
      <SettingsCard>
        <HostGroup shared={shared} />
        <ProjectGroup shared={shared} />
      </SettingsCard>
    </SettingsSection>
  );
}

/** A foldable group inside the Palette card. */
function Group({
  title,
  count,
  initiallyOpen,
  shared,
  children,
  trailing,
}: {
  title: string;
  count: number;
  initiallyOpen: boolean;
  shared: Shared;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const { theme, touch } = shared;
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${open ? "Collapse" : "Expand"} ${title}`}
          onPress={() => setOpen(!open)}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            minHeight: touch ? 44 : 36,
          }}
        >
          <Icon
            name={open ? "ChevronDown" : "ChevronRight"}
            size={14}
            color={theme.colors.foregroundMuted}
          />
          <Text style={{ color: theme.colors.foreground, fontSize: 14, fontWeight: "600" }}>
            {title}
          </Text>
          <Text style={{ color: theme.colors.foregroundMuted, fontSize: 13 }}>{count}</Text>
        </Pressable>
        {open ? trailing : null}
      </View>
      {open ? <View style={{ paddingBottom: 6 }}>{children}</View> : null}
    </View>
  );
}

/** One line: the item drawn in its color on the left, swatches on the right. */
function Line({
  shared,
  name,
  children,
}: {
  shared: Shared;
  name: ReactNode;
  children: ReactNode;
}) {
  return (
    // Wraps the swatches under the name when the card is too narrow, as on phones.
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: 10,
        paddingLeft: 32,
        paddingRight: 12,
        minHeight: shared.touch ? 40 : 30,
      }}
    >
      <View style={{ flex: 1, minWidth: 96, flexDirection: "row", alignItems: "center", gap: 6 }}>
        {name}
      </View>
      {children}
    </View>
  );
}

/**
 * Auto, then the ten colors, as filled dots; the chosen one is ringed. Auto shows the color the
 * item gets automatically, marked "A". Names stay for screen readers only.
 */
function Swatches({
  value,
  auto,
  shared,
  label,
  onChange,
}: {
  value: Choice;
  auto: IdentityColor;
  shared: Shared;
  label: string;
  onChange: (choice: Choice) => void;
}) {
  const { theme, dark, touch, onFill } = shared;
  const size = touch ? 22 : 16;
  const dot = (choice: Choice, fill: string, mark?: string) => {
    const selected = value === choice;
    return (
      <Pressable
        key={choice}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label}: ${choice === "auto" ? "automatic color" : choice}`}
        onPress={() => onChange(choice)}
        hitSlop={3}
        style={{
          width: size + 6,
          height: size + 6,
          borderRadius: (size + 6) / 2,
          borderWidth: 2,
          borderColor: selected ? theme.colors.foreground : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fill,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {mark ? (
            <Text style={{ color: onFill, fontSize: size * 0.55, fontWeight: "700" }}>{mark}</Text>
          ) : null}
        </View>
      </Pressable>
    );
  };
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ flexDirection: "row" }}
    >
      {dot("auto", auto.fill, "A")}
      {COLOR_NAMES.map((name) => dot(name, colorFor(name, "default", dark).fill))}
    </View>
  );
}

function HostGroup({ shared }: { shared: Shared }) {
  const hosts = useHosts();
  const localHostId = useLocalHostId();
  const ordered = [...hosts].sort(
    (a, b) =>
      Number(b.serverId === localHostId) - Number(a.serverId === localHostId) ||
      compareNames(a.label, b.label),
  );
  return (
    <Group title="Hosts" count={ordered.length} initiallyOpen shared={shared}>
      {ordered.map((host) => (
        <HostLine
          key={host.serverId}
          host={host}
          local={host.serverId === localHostId}
          shared={shared}
        />
      ))}
    </Group>
  );
}

function HostLine({
  host,
  local,
  shared,
}: {
  host: PluginHostSummary;
  local: boolean;
  shared: Shared;
}) {
  const { preferences, dark, theme } = shared;
  const [picking, setPicking] = useState(false);
  const override = preferences.values.hostOverrides[host.serverId] ?? {
    color: "auto" as const,
    icon: "auto" as const,
  };
  const auto = colorFor(autoColorName(host.serverId), preferences.values.appearance.preset, dark);
  const shown = override.color === "auto" ? auto : colorFor(override.color, "default", dark);
  const set = (patch: Partial<typeof override>) =>
    preferences.update((current) => ({
      hostOverrides: {
        ...current.hostOverrides,
        [host.serverId]: { ...(current.hostOverrides[host.serverId] ?? override), ...patch },
      },
    }));
  return (
    <View>
      <Line
        shared={shared}
        name={
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Change the icon of ${host.label}`}
              onPress={() => setPicking(!picking)}
              hitSlop={4}
              style={{
                padding: 2,
                borderRadius: 4,
                backgroundColor: picking ? theme.colors.surface2 : "transparent",
              }}
            >
              <Icon name={hostIconName(override.icon, local)} size={14} color={shown.text} />
            </Pressable>
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, color: shown.text, fontSize: 13, fontWeight: "700" }}
            >
              {host.label}
            </Text>
          </>
        }
      >
        <Swatches
          value={override.color}
          auto={auto}
          shared={shared}
          label={`${host.label} color`}
          onChange={(color) => set({ color })}
        />
      </Line>
      {picking ? (
        <IconPicker
          value={override.icon}
          local={local}
          color={shown.text}
          shared={shared}
          onChange={(icon) => {
            set({ icon });
            setPicking(false);
          }}
        />
      ) : null}
    </View>
  );
}

function IconPicker({
  value,
  local,
  color,
  shared,
  onChange,
}: {
  value: HostIcon;
  local: boolean;
  color: string;
  shared: Shared;
  onChange: (icon: HostIcon) => void;
}) {
  const { theme, touch } = shared;
  const size = touch ? 36 : 28;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Host icon"
      style={{ flexDirection: "row", gap: 4, paddingLeft: 52, paddingBottom: 6 }}
    >
      {HOST_ICONS.map((icon) => {
        const selected = value === icon;
        return (
          <Pressable
            key={icon}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={icon === "auto" ? "Automatic icon" : `${icon} icon`}
            onPress={() => onChange(icon)}
            style={{
              width: size,
              height: size,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: selected ? theme.colors.foreground : theme.colors.border,
            }}
          >
            <Icon
              name={hostIconName(icon, local)}
              size={14}
              color={selected ? color : theme.colors.foregroundMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function ProjectGroup({ shared }: { shared: Shared }) {
  const { preferences, theme } = shared;
  const directory = useProjectDirectory();
  const refs = useProjects(
    useMemo(
      () => ({
        orderBy: (a: { displayName: string }, b: { displayName: string }) =>
          compareNames(a.displayName, b.displayName),
      }),
      [],
    ),
  );
  const projects = useMemo(() => {
    const seen = new Map<string, ProjectRef>();
    for (const ref of refs) {
      const viewKey = directory.viewKey(ref.hostId, ref.id);
      if (!seen.has(viewKey)) seen.set(viewKey, ref);
    }
    return [...seen];
  }, [refs, directory]);
  const anyChosen = projects.some(([viewKey]) => preferences.values.projectColors[viewKey]);
  return (
    <Group
      title="Projects"
      count={projects.length}
      initiallyOpen={false}
      shared={shared}
      trailing={
        anyChosen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset all project colors"
            onPress={() => preferences.update({ projectColors: {} })}
            hitSlop={6}
          >
            <Text style={{ color: theme.colors.accent, fontSize: 13 }}>Reset all</Text>
          </Pressable>
        ) : null
      }
    >
      {projects.map(([viewKey, ref]) => (
        <ProjectLine key={viewKey} viewKey={viewKey} reference={ref} shared={shared} />
      ))}
    </Group>
  );
}

function ProjectLine({
  viewKey,
  reference,
  shared,
}: {
  viewKey: string;
  reference: ProjectRef;
  shared: Shared;
}) {
  const { preferences, dark, onFill } = shared;
  const name = useProject(reference, (project) => project.displayName) ?? viewKey;
  const chosen = preferences.values.projectColors[viewKey];
  const auto = colorFor(autoColorName(viewKey), preferences.values.appearance.preset, dark);
  const shown = chosen ? colorFor(chosen, "default", dark) : auto;
  return (
    <Line
      shared={shared}
      name={
        <>
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              backgroundColor: shown.fill,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: onFill, fontSize: 8, fontWeight: "700" }}>
              {(name.split("/").pop() ?? name).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={{ flexShrink: 1, color: shown.text, fontSize: 13, fontWeight: "600" }}
          >
            {name}
          </Text>
        </>
      }
    >
      <Swatches
        value={chosen ?? "auto"}
        auto={auto}
        shared={shared}
        label={`${name} color`}
        onChange={(color) =>
          preferences.update((current) => {
            const next = { ...current.projectColors };
            if (color === "auto") delete next[viewKey];
            else next[viewKey] = color;
            return { projectColors: next };
          })
        }
      />
    </Line>
  );
}
