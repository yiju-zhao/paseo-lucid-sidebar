import { Pressable, Text, View } from "react-native";
import { openExternalUrl, type PluginSurfaceProps } from "@getpaseo/plugin/client";
import {
  Icon,
  Markdown,
  SettingsCard,
  SettingsRow,
  SettingsSection,
} from "@getpaseo/plugin/client/ui";
import { LINKS, OVERVIEW, VERSION } from "../../shared/about";

const DETAILS: [string, string][] = [
  ["Version", VERSION],
  ["Plugin ID", "paseo-lucid-sidebar"],
  ["Author", "yiju-zhao"],
  ["License", "MIT"],
];

const LINK_ROWS: { label: string; url: string; icon: string }[] = [
  { label: "Source code", url: LINKS.github, icon: "Github" },
  { label: "Plugin page", url: LINKS.registry, icon: "Blocks" },
  { label: "npm package", url: LINKS.npm, icon: "Package" },
];

/** The About tab: the listing overview, then version, license and links. */
export function AboutSettings({ theme }: PluginSurfaceProps) {
  const muted = { color: theme.colors.foregroundMuted, fontSize: 13 };
  return (
    <View style={{ gap: 16 }}>
      <Markdown>{OVERVIEW}</Markdown>
      <SettingsSection title="Details">
        <SettingsCard>
          {DETAILS.map(([label, value]) => (
            <SettingsRow key={label} label={label}>
              <Text selectable style={muted}>
                {value}
              </Text>
            </SettingsRow>
          ))}
        </SettingsCard>
      </SettingsSection>
      <SettingsSection title="Links">
        <SettingsCard>
          {LINK_ROWS.map((link) => (
            <SettingsRow key={link.url} label={link.label}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Open ${link.label}`}
                onPress={() => void openExternalUrl(link.url)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Icon name={link.icon} size={14} color={theme.colors.accent} />
                <Text style={{ color: theme.colors.accent, fontSize: 13 }}>
                  {link.url.replace(/^https:\/\//, "")}
                </Text>
              </Pressable>
            </SettingsRow>
          ))}
        </SettingsCard>
      </SettingsSection>
    </View>
  );
}
