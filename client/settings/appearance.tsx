import { SettingsCard, SettingsSection, SettingsSelect } from "@getpaseo/plugin/client/ui";
import type { SidebarPreferences } from "../../shared/preferences";
import type { Preferences } from "../preferences";
import {
  DENSITY_OPTIONS,
  GUIDE_OPTIONS,
  PRESET_OPTIONS,
  TAG_STYLE_OPTIONS,
  TIME_FORMAT_OPTIONS,
} from "./options";

type Appearance = SidebarPreferences["appearance"];

/** How the sidebar looks. */
export function AppearanceSection({ preferences }: { preferences: Preferences }) {
  const { values, update } = preferences;
  const appearance = values.appearance;
  const set =
    <Key extends keyof Appearance>(key: Key) =>
    (value: Appearance[Key]) =>
      update((current) => ({ appearance: { ...current.appearance, [key]: value } }));
  return (
    <SettingsSection title="Appearance">
      <SettingsCard>
        <SettingsSelect
          label="Color preset"
          hint="Colors for hosts and projects that have no color of their own."
          value={appearance.preset}
          options={PRESET_OPTIONS}
          onValueChange={set("preset")}
        />
        <SettingsSelect
          label="Density"
          hint="On touch screens rows keep a comfortable tap size; density changes the spacing."
          value={appearance.density}
          options={DENSITY_OPTIONS}
          onValueChange={set("density")}
        />
        <SettingsSelect
          label="Tag style"
          hint="How the project tag on each row is drawn."
          value={appearance.tagStyle}
          options={TAG_STYLE_OPTIONS}
          onValueChange={set("tagStyle")}
        />
        <SettingsSelect
          label="Guide lines"
          hint="The line in a host's color beside its projects and workspaces."
          value={appearance.guides}
          options={GUIDE_OPTIONS}
          onValueChange={set("guides")}
        />
        <SettingsSelect
          label="Time format"
          hint="Relative shows 5m or 3h; absolute shows 14:32 today and a date before."
          value={appearance.timeFormat}
          options={TIME_FORMAT_OPTIONS}
          onValueChange={set("timeFormat")}
        />
      </SettingsCard>
    </SettingsSection>
  );
}
