import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { autoColorName, colorFor, makeColors, PALETTES } from "../client/colors";
import { COLOR_NAMES, DEFAULT_PREFERENCES, PRESETS } from "../shared/preferences";

const defaults = {
  appearance: DEFAULT_PREFERENCES.appearance,
  hostOverrides: {},
  projectColors: {},
};

describe("colors", () => {
  it("keeps 0.3.1's colors in the Default preset", () => {
    assert.deepEqual(colorFor("violet", "default", true), {
      fill: "#7a6aa8",
      text: "#a392d5",
      tint: "#7a6aa81a",
    });
    assert.equal(colorFor("violet", "default", false).text, "#6d49b5");
  });

  it("gives a project its hashed auto color by default", () => {
    assert.deepEqual(
      makeColors(defaults, true).project("repo"),
      colorFor(autoColorName("repo"), "default", true),
    );
  });

  it("keeps a project's chosen color the same in every preset", () => {
    for (const preset of PRESETS)
      for (const dark of [true, false]) {
        const colors = makeColors(
          {
            ...defaults,
            appearance: { ...defaults.appearance, preset },
            projectColors: { repo: "teal" },
          },
          dark,
        );
        // A chosen color keeps its own hue; presets only restyle automatic colors.
        assert.deepEqual(colors.project("repo"), colorFor("teal", "default", dark));
      }
  });

  it("uses a host's chosen color, and its auto color for auto", () => {
    const colors = makeColors(
      {
        ...defaults,
        hostOverrides: {
          srv: { name: "", color: "red", icon: "auto" },
          other: { name: "", color: "auto", icon: "auto" },
        },
      },
      true,
    );
    assert.equal(colors.host("srv").fill, colorFor("red", "default", true).fill);
    assert.deepEqual(colors.host("other"), colorFor(autoColorName("other"), "default", true));
  });

  it("defines every color in every preset as hex", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (const preset of PRESETS)
      for (const name of COLOR_NAMES) {
        const entry = PALETTES[preset][name];
        assert.ok(hex.test(entry.base) && hex.test(entry.darkText) && hex.test(entry.lightText));
      }
  });
});

// WCAG contrast of white text on a fill.
function contrastOnWhite(hex: string): number {
  const channel = (index: number) => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return 1.05 / (luminance + 0.05);
}

describe("palette readability", () => {
  it("keeps white tag text on every fill at least as readable as Default's", () => {
    // Default is 0.3.1's palette and stays as it is; every other preset must match its floor.
    const floor = Math.min(
      ...COLOR_NAMES.map((name) => contrastOnWhite(PALETTES.default[name].base)),
    );
    for (const preset of PRESETS)
      for (const name of COLOR_NAMES) {
        const ratio = contrastOnWhite(PALETTES[preset][name].base);
        assert.ok(ratio >= floor, `${preset}.${name}: ${ratio.toFixed(2)} < ${floor.toFixed(2)}`);
      }
  });
});
