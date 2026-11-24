import {
  COLOR_NAMES,
  DENSITIES,
  GUIDES,
  HOST_ICONS,
  PRESETS,
  TAG_STYLES,
  TIME_FORMATS,
  type ColorName,
} from "../../shared/preferences";

/** Option lists for the settings page's selects. */
const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const options = <Value extends string>(values: readonly Value[], label = title) =>
  values.map((value) => ({ value, label: label(value) }));

export const PRESET_OPTIONS = options(PRESETS);
export const DENSITY_OPTIONS = options(DENSITIES);
export const TAG_STYLE_OPTIONS = options(TAG_STYLES);
export const GUIDE_OPTIONS = options(GUIDES);
export const TIME_FORMAT_OPTIONS = options(TIME_FORMATS);
export const HOST_ICON_OPTIONS = options(HOST_ICONS, (value) =>
  value === "gpu" ? "GPU" : title(value),
);
export const COLOR_OPTIONS = [
  { value: "auto" as const, label: "Auto" },
  ...options<ColorName>(COLOR_NAMES),
];
