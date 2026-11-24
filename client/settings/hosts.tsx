import { useHosts, type PluginHostSummary } from "@getpaseo/plugin/client";
import { SettingsCard, SettingsSection, SettingsSelect } from "@getpaseo/plugin/client/ui";
import type { SidebarPreferences } from "../../shared/preferences";
import { useLocalHostId } from "../local-host";
import { compareNames } from "../model";
import type { Preferences } from "../preferences";
import { COLOR_OPTIONS, HOST_ICON_OPTIONS } from "./options";

type HostOverride = SidebarPreferences["hostOverrides"][string];
const NO_OVERRIDE: HostOverride = { color: "auto", icon: "auto" };

/** A color and icon per configured host, this device's host first. */
export function HostsSection({ preferences }: { preferences: Preferences }) {
  const hosts = useHosts();
  const localHostId = useLocalHostId();
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
