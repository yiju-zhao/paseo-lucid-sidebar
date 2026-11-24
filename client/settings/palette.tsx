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
import {
  HOST_COLOR_NAMES,
  HOST_ICONS,
  PROJECT_COLOR_NAMES,
  type HostIcon,
} from "../../shared/preferences";
import { autoColorName, autoHostColorName, chosenColor, colorFor, hostColor } from "../colors";
import { hostIconName } from "../context";
import { useLocalHostId } from "../local-host";
import { compareNames, projectInitial } from "../model";
import { makePalette, type IdentityColor } from "../palette";
import type { Preferences } from "../preferences";
import { useProjectDirectory } from "../runtime";

type Theme = PluginSurfaceProps["theme"];

interface Shared {
  /** The one dropdown open in the Palette, by key; opening one closes the other. */
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
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
  const [openKey, setOpenKey] = useState<string | null>(null);
  const shared: Shared = {
    openKey,
    setOpenKey,
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

/** A filled color dot; "A" marks the automatic color. */
function Dot({
  fill,
  size,
  mark,
  onFill,
}: {
  fill: string;
  size: number;
  mark?: boolean;
  onFill: string;
}) {
  return (
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
        <Text style={{ color: onFill, fontSize: size * 0.55, fontWeight: "700" }}>A</Text>
      ) : null}
    </View>
  );
}

/** A compact dropdown trigger: the current value, then a chevron. */
function Trigger({
  label,
  open,
  shared,
  onPress,
  children,
}: {
  label: string;
  open: boolean;
  shared: Shared;
  onPress: () => void;
  children: ReactNode;
}) {
  const { theme, touch } = shared;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 6,
        height: touch ? 34 : 26,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: open ? theme.colors.foregroundMuted : theme.colors.border,
        backgroundColor: open ? theme.colors.surface2 : "transparent",
      }}
    >
      {children}
      <Icon
        name={open ? "ChevronUp" : "ChevronDown"}
        size={12}
        color={theme.colors.foregroundMuted}
      />
    </Pressable>
  );
}

/** The dropdown's choices, shown under the line: colors only, the current one ringed. */
function ColorPanel<Value extends string>({
  value,
  choices,
  colorOf,
  auto,
  shared,
  label,
  onChange,
}: {
  value: Value | "auto";
  choices: readonly Value[];
  /** The fill shown for a choice. */
  colorOf: (choice: Value) => IdentityColor;
  auto: IdentityColor;
  shared: Shared;
  label: string;
  onChange: (choice: Value | "auto") => void;
}) {
  const { theme, touch, onFill } = shared;
  const size = touch ? 24 : 18;
  const option = (choice: Value | "auto") => {
    const selected = value === choice;
    const fill = choice === "auto" ? auto.fill : colorOf(choice).fill;
    return (
      <Pressable
        key={choice}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label}: ${choice === "auto" ? "automatic color" : choice}`}
        onPress={() => onChange(choice)}
        style={{
          width: size + 8,
          height: size + 8,
          borderRadius: (size + 8) / 2,
          borderWidth: 2,
          borderColor: selected ? theme.colors.foreground : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Dot fill={fill} size={size} mark={choice === "auto"} onFill={onFill} />
      </Pressable>
    );
  };
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 2,
        paddingLeft: 32,
        paddingRight: 12,
        paddingBottom: 6,
      }}
    >
      {option("auto")}
      {choices.map(option)}
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
  const { preferences, dark, openKey, setOpenKey, touch, onFill } = shared;
  const override = preferences.values.hostOverrides[host.serverId] ?? {
    color: "auto" as const,
    icon: "auto" as const,
  };
  const auto = hostColor(autoHostColorName(host.serverId), dark);
  const shown = override.color === "auto" ? auto : hostColor(override.color, dark);
  const colorKey = `host:${host.serverId}:color`;
  const iconKey = `host:${host.serverId}:icon`;
  const toggle = (key: string) => setOpenKey(openKey === key ? null : key);
  const set = (patch: Partial<typeof override>) => {
    setOpenKey(null);
    preferences.update((current) => ({
      hostOverrides: {
        ...current.hostOverrides,
        [host.serverId]: { ...(current.hostOverrides[host.serverId] ?? override), ...patch },
      },
    }));
  };
  return (
    <View>
      <Line
        shared={shared}
        name={
          <>
            <Icon name={hostIconName(override.icon, local)} size={14} color={shown.text} />
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, color: shown.text, fontSize: 13, fontWeight: "700" }}
            >
              {host.label}
            </Text>
          </>
        }
      >
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Trigger
            label={`Icon of ${host.label}`}
            open={openKey === iconKey}
            shared={shared}
            onPress={() => toggle(iconKey)}
          >
            <Icon name={hostIconName(override.icon, local)} size={14} color={shown.text} />
          </Trigger>
          <Trigger
            label={`Color of ${host.label}`}
            open={openKey === colorKey}
            shared={shared}
            onPress={() => toggle(colorKey)}
          >
            <Dot
              fill={shown.fill}
              size={touch ? 18 : 14}
              mark={override.color === "auto"}
              onFill={onFill}
            />
          </Trigger>
        </View>
      </Line>
      {openKey === colorKey ? (
        <ColorPanel
          value={override.color}
          choices={HOST_COLOR_NAMES}
          colorOf={(name) => hostColor(name, dark)}
          auto={auto}
          shared={shared}
          label={`${host.label} color`}
          onChange={(color) => set({ color })}
        />
      ) : null}
      {openKey === iconKey ? (
        <IconPicker
          value={override.icon}
          local={local}
          color={shown.text}
          shared={shared}
          onChange={(icon) => set({ icon })}
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
  const { preferences, dark, onFill, openKey, setOpenKey, touch } = shared;
  const name = useProject(reference, (project) => project.displayName) ?? viewKey;
  const chosen = preferences.values.projectColors[viewKey];
  const auto = colorFor(autoColorName(viewKey), preferences.values.appearance.preset, dark);
  const shown = chosen ? chosenColor(chosen, dark) : auto;
  const key = `project:${viewKey}`;
  return (
    <View>
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
                {projectInitial(name)}
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
        <Trigger
          label={`Color of ${name}`}
          open={openKey === key}
          shared={shared}
          onPress={() => setOpenKey(openKey === key ? null : key)}
        >
          <Dot fill={shown.fill} size={touch ? 18 : 14} mark={!chosen} onFill={onFill} />
        </Trigger>
      </Line>
      {openKey === key ? (
        <ColorPanel
          value={chosen ?? "auto"}
          choices={PROJECT_COLOR_NAMES}
          colorOf={(name) => chosenColor(name, dark)}
          auto={auto}
          shared={shared}
          label={`${name} color`}
          onChange={(color) => {
            setOpenKey(null);
            preferences.update((current) => {
              const next = { ...current.projectColors };
              if (color === "auto") delete next[viewKey];
              else next[viewKey] = color;
              return { projectColors: next };
            });
          }}
        />
      ) : null}
    </View>
  );
}
