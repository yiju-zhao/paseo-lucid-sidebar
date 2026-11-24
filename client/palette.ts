import type { PluginTheme } from "@getpaseo/plugin";

/**
 * Plugins receive eleven theme colors. The built-in sidebar also uses sidebar surfaces, an extra
 * muted foreground and saturated status dots that are not exposed, so recognise the built-in
 * themes by their `surface0` and use the app's values; blend for unknown themes.
 */
export interface SidebarPalette {
  dark: boolean;
  /** Sidebar background; `transparent` when the theme is unknown. */
  background: string;
  /** A solid color behind the rows, for knockouts and fades. */
  backdrop: string;
  hover: string;
  selected: string;
  /** Pressed and dragged rows. */
  pressed: string;
  extraMuted: string;
  borderAccent: string;
  dot: { success: string; danger: string; warning: string; running: string };
  merged: string;
  /** Text on a solid identity fill, such as a project tile or chip. */
  onIdentity: string;
  /** The built-in sidebar's chevron color, which ignores the theme. */
  chevron: string;
}

interface KnownTheme {
  background: string;
  hover: string;
  selected: string;
  extraMuted: string;
}

const KNOWN: Record<string, KnownTheme & { dark: boolean }> = {
  "#ffffff": {
    dark: false,
    background: "#f4f4f5",
    hover: "#e5e5e6",
    selected: "#d4d4d5",
    extraMuted: "#a1a1aa",
  },
  "#181b1a": {
    dark: true,
    background: "#141716",
    hover: "#1f2120",
    selected: "#282a29",
    extraMuted: "#717574",
  },
  "#18181b": {
    dark: true,
    background: "#131316",
    hover: "#1e1e20",
    selected: "#272729",
    extraMuted: "#71717a",
  },
  "#161820": {
    dark: true,
    background: "#121420",
    hover: "#1d1e27",
    selected: "#27282f",
    extraMuted: "#6b6e82",
  },
  "#1f1f1e": {
    dark: true,
    background: "#1a1918",
    hover: "#232222",
    selected: "#2c2b2b",
    extraMuted: "#78746f",
  },
  "#282c34": {
    dark: true,
    background: "#21252d",
    hover: "#2a2d33",
    selected: "#32353a",
    extraMuted: "#a0a4b2",
  },
  "#000000": {
    dark: true,
    background: "#000000",
    hover: "#111111",
    selected: "#1d1d1d",
    extraMuted: "#71717a",
  },
};

const DARK_DOTS = { success: "#35c264", danger: "#f7796d", warning: "#db932e", running: "#5caaf6" };
const LIGHT_DOTS = {
  success: "#299f51",
  danger: "#f12e2f",
  warning: "#b37824",
  running: "#268ae0",
};

/** `#rgb` or `#rrggbb` to `#rrggbb`, or null for anything else. */
function normalizeHex(color: string): string | null {
  const value = color.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  if (/^#[0-9a-f]{3}$/.test(value))
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  if (/^#[0-9a-f]{8}$/.test(value)) return value.slice(0, 7);
  return null;
}

function isDark(color: string): boolean {
  const hex = normalizeHex(color);
  if (!hex) return true;
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
}

/** Color with alpha, as `#rrggbbaa`. Falls back to the color itself when it is not hex. */
export function withAlpha(color: string, alpha: number): string {
  const hex = normalizeHex(color);
  if (!hex) return color;
  const byte = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${byte}`;
}

export function makePalette(theme: PluginTheme): SidebarPalette {
  const { colors } = theme;
  const known = KNOWN[normalizeHex(colors.surface0) ?? ""];
  const dark = known?.dark ?? isDark(colors.surface0);
  const fallback: KnownTheme = {
    background: "transparent",
    hover: withAlpha(colors.foreground, dark ? 0.05 : 0.07),
    selected: withAlpha(colors.foreground, dark ? 0.09 : 0.15),
    extraMuted: withAlpha(colors.foregroundMuted, 0.65),
  };
  const values = known ?? fallback;
  return {
    dark,
    background: values.background,
    backdrop: known ? values.background : colors.surface0,
    hover: values.hover,
    selected: values.selected,
    pressed: colors.surface2,
    extraMuted: values.extraMuted,
    borderAccent: dark ? "#2f3534" : "#ececf1",
    dot: dark ? DARK_DOTS : LIGHT_DOTS,
    merged: dark ? "#a890d5" : "#7347af",
    onIdentity: "#ffffff",
    chevron: "#9ca3af",
  };
}

export interface IdentityColor {
  /** Solid fill, such as a project tile. */
  fill: string;
  /** Text drawn on a tint of the fill. */
  text: string;
  /** The fill at 10% alpha. */
  tint: string;
}
