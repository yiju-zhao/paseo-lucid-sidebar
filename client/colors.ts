import {
  COLOR_NAMES,
  type ColorName,
  HOST_COLOR_NAMES,
  type HostColor,
  type Preset,
  type ProjectColor,
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
    violet: entry("#797292", "#b7aed6", "#64598f"),
    sky: entry("#5b7a8d", "#a3c3d8", "#4d6f85"),
    emerald: entry("#5b7d72", "#a3c9bb", "#4c6e62"),
    orange: entry("#8b715b", "#d6b79b", "#7d624b"),
    pink: entry("#8f6c7b", "#d6adbf", "#80596a"),
    indigo: entry("#6f7397", "#b3b7db", "#5c618f"),
    teal: entry("#5a7c7c", "#a3caca", "#4b6d6d"),
    red: entry("#8b6e6e", "#d6b0ae", "#7f5a59"),
    amber: entry("#7f755b", "#cfc39f", "#6f6447"),
    blue: entry("#667892", "#adc0dc", "#566a8a"),
  },
  vivid: {
    violet: entry("#7c4dff", "#b39dff", "#5b2fd6"),
    sky: entry("#0979c5", "#5cb8f5", "#0565a6"),
    emerald: entry("#0f8759", "#4cd69c", "#0a7a4f"),
    orange: entry("#ba5d16", "#ffa45c", "#b05410"),
    pink: entry("#ce3f75", "#ff85b0", "#b02a5e"),
    indigo: entry("#4c5fe0", "#8d9bff", "#3343b8"),
    teal: entry("#0c8383", "#4fd4d4", "#087676"),
    red: entry("#d54139", "#ff8078", "#b32a24"),
    amber: entry("#937004", "#f2c94c", "#8f6d00"),
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

/**
 * Colors a user can choose for a host or project. They keep their hue under every preset; the
 * first ten are the Default palette's.
 */
export const CHOSEN: Record<ProjectColor, Entry> = {
  ...PALETTES.default,
  rose: entry("#b04a5e", "#e08799", "#933a4c"),
  cyan: entry("#1f7a8c", "#5cc1d3", "#19606e"),
  lime: entry("#5a7428", "#9cc25a", "#4a5f20"),
  fuchsia: entry("#a2479e", "#d27fce", "#84367f"),
  slate: entry("#5b6675", "#9aa6b5", "#48525f"),
  brown: entry("#8a5a3c", "#c08d6d", "#6f472f"),
};

export function chosenColor(name: ProjectColor, dark: boolean): IdentityColor {
  const color = CHOSEN[name];
  return {
    fill: color.base,
    text: dark ? color.darkText : color.lightText,
    tint: `${color.base}1a`,
  };
}

/**
 * Host colors: a light, bright style of their own for headings and guide lines, distinct from
 * the solid project colors. Presets do not change them.
 */
export const HOST_PALETTE: Record<HostColor, Entry> = {
  coral: entry("#e0675a", "#ff8a7a", "#b8372b"),
  gold: entry("#c99a1a", "#f2c94c", "#8a6500"),
  mint: entry("#2fb58a", "#5fe0b5", "#0f7454"),
  aqua: entry("#2aa7bf", "#5ad1e6", "#0d6a7c"),
  azure: entry("#4f86e6", "#8bb8ff", "#2253b8"),
  lavender: entry("#9a76e6", "#c6a6ff", "#5f37b8"),
  peach: entry("#e08a55", "#ffb385", "#9e4f19"),
  silver: entry("#8a929e", "#c9ced6", "#545c68"),
};

export function hostColor(name: HostColor, dark: boolean): IdentityColor {
  const color = HOST_PALETTE[name];
  return {
    fill: color.base,
    text: dark ? color.darkText : color.lightText,
    tint: `${color.base}1a`,
  };
}

function hash(key: string): number {
  let value = 0;
  for (const character of key) value = (value * 31 + character.charCodeAt(0)) >>> 0;
  return value;
}

/** The color a project or label gets when nobody chose one: the built-in sidebar's hash. */
export function autoColorName(key: string): ColorName {
  return COLOR_NAMES[hash(key) % COLOR_NAMES.length];
}

/** The host color a host gets when nobody chose one. */
export function autoHostColorName(hostId: string): HostColor {
  return HOST_COLOR_NAMES[hash(hostId) % HOST_COLOR_NAMES.length];
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

/**
 * Colors for the current preferences. Hosts use the host palette. Presets restyle automatic
 * project and label colors only: a chosen project color keeps its hue under every preset.
 */
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
      return hostColor(chosen && chosen !== "auto" ? chosen : autoHostColorName(hostId), dark);
    },
    project: (viewKey) => {
      const chosen = values.projectColors[viewKey];
      return chosen ? chosenColor(chosen, dark) : named(autoColorName(viewKey));
    },
    label: (labelKey) => named(autoColorName(labelKey)),
  };
}
