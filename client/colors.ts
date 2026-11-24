import {
  COLOR_NAMES,
  type ColorName,
  type Preset,
  type SidebarPreferences,
} from "../shared/preferences";
import type { IdentityColor } from "./palette";

/**
 * Named colors and presets. Every color has a solid fill that takes white text, plus text
 * variants readable on the dark and light sidebar backgrounds, so any choice stays legible.
 */
interface Entry {
  base: string;
  darkText: string;
  lightText: string;
}

const entry = (base: string, darkText: string, lightText: string): Entry => ({
  base,
  darkText,
  lightText,
});

export const PALETTES: Record<Preset, Record<ColorName, Entry>> = {
  // The built-in identity palette, unchanged from 0.3.1.
  default: {
    violet: entry("#7a6aa8", "#a392d5", "#6d49b5"),
    sky: entry("#3d7ea6", "#6aa6ce", "#3d6985"),
    emerald: entry("#388068", "#6cae96", "#3e6e5d"),
    orange: entry("#a4673a", "#cc8f64", "#845838"),
    pink: entry("#b05c80", "#d87da3", "#974168"),
    indigo: entry("#6a70b8", "#9299d5", "#5251c2"),
    teal: entry("#368080", "#6cacab", "#3e6d6c"),
    red: entry("#b06260", "#d88381", "#9c4243"),
    amber: entry("#8f7838", "#b29d64", "#716239"),
    blue: entry("#5179b0", "#7ba1d5", "#39649e"),
  },
  soft: {
    violet: entry("#8a82a6", "#b7aed6", "#64598f"),
    sky: entry("#6b8fa6", "#a3c3d8", "#4d6f85"),
    emerald: entry("#6a9184", "#a3c9bb", "#4c6e62"),
    orange: entry("#a98a6f", "#d6b79b", "#7d624b"),
    pink: entry("#a87f91", "#d6adbf", "#80596a"),
    indigo: entry("#8186b0", "#b3b7db", "#5c618f"),
    teal: entry("#6a9292", "#a3caca", "#4b6d6d"),
    red: entry("#a88584", "#d6b0ae", "#7f5a59"),
    amber: entry("#9d9070", "#cfc39f", "#6f6447"),
    blue: entry("#7a8fae", "#adc0dc", "#566a8a"),
  },
  vivid: {
    violet: entry("#7c4dff", "#b39dff", "#5b2fd6"),
    sky: entry("#0a84d6", "#5cb8f5", "#0565a6"),
    emerald: entry("#12a36b", "#4cd69c", "#0a7a4f"),
    orange: entry("#e0701a", "#ffa45c", "#b05410"),
    pink: entry("#e0457f", "#ff85b0", "#b02a5e"),
    indigo: entry("#4c5fe0", "#8d9bff", "#3343b8"),
    teal: entry("#0f9e9e", "#4fd4d4", "#087676"),
    red: entry("#e0443c", "#ff8078", "#b32a24"),
    amber: entry("#c99a06", "#f2c94c", "#8f6d00"),
    blue: entry("#2f6fe0", "#73a3ff", "#1f52b3"),
  },
  // Grays only, a step apart, so hosts and projects stay distinguishable without hue.
  mono: {
    violet: entry("#4f5358", "#b0b4b8", "#3f4348"),
    sky: entry("#53575c", "#b4b8bc", "#43474c"),
    emerald: entry("#575b60", "#b8bcc0", "#474b50"),
    orange: entry("#5b5f64", "#bcc0c4", "#4b4f54"),
    pink: entry("#5f6368", "#c0c4c8", "#4f5358"),
    indigo: entry("#63676c", "#c4c8cc", "#53575c"),
    teal: entry("#676b70", "#c8ccd0", "#575b60"),
    red: entry("#6b6f74", "#ccd0d4", "#5b5f64"),
    amber: entry("#6f7378", "#d0d4d8", "#5f6368"),
    blue: entry("#73777c", "#d4d8dc", "#63676c"),
  },
};

/** The color a key gets when nobody chose one: the built-in sidebar's hash. */
export function autoColorName(key: string): ColorName {
  let hash = 0;
  for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return COLOR_NAMES[hash % COLOR_NAMES.length];
}

export function colorFor(name: ColorName, preset: Preset, dark: boolean): IdentityColor {
  const color = PALETTES[preset][name];
  return {
    fill: color.base,
    text: dark ? color.darkText : color.lightText,
    tint: `${color.base}1a`,
  };
}

export interface Colors {
  host(hostId: string): IdentityColor;
  project(viewKey: string): IdentityColor;
  label(labelKey: string): IdentityColor;
  named(name: ColorName): IdentityColor;
}

/** Colors for the current preferences: a chosen host or project color wins over the preset's. */
export function makeColors(
  values: Pick<SidebarPreferences, "appearance" | "hostOverrides" | "projectColors">,
  dark: boolean,
): Colors {
  const preset = values.appearance.preset;
  const named = (name: ColorName) => colorFor(name, preset, dark);
  return {
    named,
    host: (hostId) => {
      const chosen = values.hostOverrides[hostId]?.color;
      return named(chosen && chosen !== "auto" ? chosen : autoColorName(hostId));
    },
    project: (viewKey) => named(values.projectColors[viewKey] ?? autoColorName(viewKey)),
    label: (labelKey) => named(autoColorName(labelKey)),
  };
}
