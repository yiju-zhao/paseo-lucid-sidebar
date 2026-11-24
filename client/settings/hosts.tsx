import { useEffect, useRef } from "react";
import { useHosts, type PluginHostSummary } from "@getpaseo/plugin/client";
import {
  SettingsCard,
  SettingsInput,
  SettingsSection,
  SettingsSelect,
} from "@getpaseo/plugin/client/ui";
import type { SidebarPreferences } from "../../shared/preferences";
import { useLocalHostId } from "../local-host";
import { compareNames } from "../model";
import { usePreferences, type Preferences } from "../preferences";
import { COLOR_OPTIONS, HOST_ICON_OPTIONS } from "./options";

type HostOverride = SidebarPreferences["hostOverrides"][string];
const NO_OVERRIDE: HostOverride = { name: "", color: "auto", icon: "auto" };

/** Settings tab: a name, color and icon per configured host, this device's host first. */
export function HostsSettings() {
  const preferences = usePreferences();
  const hosts = useHosts();
  const localHostId = useLocalHostId();
  if (preferences.loading) return null;
  const ordered = [...hosts].sort(
    (a, b) =>
      Number(b.serverId === localHostId) - Number(a.serverId === localHostId) ||
      compareNames(a.label, b.label),
  );
  return (
    <>
      {ordered.map((host) => (
        <HostCard key={host.serverId} host={host} preferences={preferences} />
      ))}
    </>
  );
}

function HostCard({ host, preferences }: { host: PluginHostSummary; preferences: Preferences }) {
  const override = preferences.values.hostOverrides[host.serverId] ?? NO_OVERRIDE;
  const set = (patch: Partial<HostOverride>) =>
    preferences.update((current) => ({
      hostOverrides: {
        ...current.hostOverrides,
        [host.serverId]: { ...(current.hostOverrides[host.serverId] ?? NO_OVERRIDE), ...patch },
      },
    }));
  return (
    <SettingsSection title={host.label}>
      <SettingsCard>
        <NameInput
          initial={override.name}
          placeholder={host.label}
          onSave={(name) => set({ name })}
        />
        <SettingsSelect
          label="Color"
          value={override.color}
          options={COLOR_OPTIONS}
          onValueChange={(color) => set({ color })}
        />
        <SettingsSelect
          label="Icon"
          value={override.icon}
          options={HOST_ICON_OPTIONS}
          onValueChange={(icon) => set({ icon })}
        />
      </SettingsCard>
    </SettingsSection>
  );
}

/**
 * The display name. The input reports only text changes, so it saves once typing pauses, and
 * at once when the page closes.
 */
function NameInput({
  initial,
  placeholder,
  onSave,
}: {
  initial: string;
  placeholder: string;
  onSave: (name: string) => void;
}) {
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useRef(onSave);
  save.current = onSave;
  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current !== null) save.current(pending.current.trim());
    pending.current = null;
  };
  useEffect(() => flush, []);
  return (
    <SettingsInput
      label="Display name"
      hint="Shown in host headings and filters. Leave empty to use the host's own name."
      initialValue={initial}
      placeholder={placeholder}
      onChangeText={(text) => {
        pending.current = text;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, 400);
      }}
    />
  );
}
