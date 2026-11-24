import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  autoColorName,
  autoHostColorName,
  CHOSEN,
  chosenColor,
  colorFor,
  HOST_PALETTE,
  hostColor,
  makeColors,
  PALETTES,
} from "../client/colors";
import {
  COLOR_NAMES,
  DEFAULT_PREFERENCES,
  PRESETS,
  HOST_COLOR_NAMES,
  PROJECT_COLOR_NAMES,
} from "../shared/preferences";

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
        assert.deepEqual(colors.project("repo"), chosenColor("teal", dark));
      }
  });

  it("uses a host's chosen color, and its auto color for auto", () => {
    const colors = makeColors(
      {
        ...defaults,
        hostOverrides: {
          srv: { color: "coral", icon: "auto" },
          other: { color: "auto", icon: "auto" },
        },
      },
      true,
    );
    assert.deepEqual(colors.host("srv"), hostColor("coral", true));
    assert.deepEqual(colors.host("other"), hostColor(autoHostColorName("other"), true));
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

describe("chosen colors", () => {
  it("offers sixteen project colors, the first ten being the Default palette's", () => {
    assert.equal(PROJECT_COLOR_NAMES.length, 16);
    for (const name of COLOR_NAMES)
      assert.deepEqual(chosenColor(name, true), colorFor(name, "default", true));
  });

  it("keeps white text on every chosen color as readable as on Default's", () => {
    const floor = Math.min(
      ...COLOR_NAMES.map((name) => contrastOnWhite(PALETTES.default[name].base)),
    );
    for (const name of PROJECT_COLOR_NAMES) {
      const ratio = contrastOnWhite(CHOSEN[name].base);
      assert.ok(ratio >= floor, `${name}: ${ratio.toFixed(2)} < ${floor.toFixed(2)}`);
    }
  });
});

// WCAG contrast between two colors.
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const channel = (index: number) => {
      const value = parseInt(hex.slice(index, index + 2), 16) / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe("host colors", () => {
  it("share no color with projects", () => {
    for (const name of HOST_COLOR_NAMES)
      assert.ok(!(PROJECT_COLOR_NAMES as readonly string[]).includes(name), name);
  });

  it("give hosts without a chosen color one of the host colors", () => {
    const colors = makeColors(DEFAULT_PREFERENCES, true);
    for (const hostId of ["srv_a", "srv_b", "local"])
      assert.ok(
        HOST_COLOR_NAMES.some((name) => hostColor(name, true).fill === colors.host(hostId).fill),
      );
  });

  it("read clearly as text on the dark and light sidebar backgrounds", () => {
    for (const name of HOST_COLOR_NAMES) {
      const entry = HOST_PALETTE[name];
      assert.ok(contrast(entry.darkText, "#141716") >= 4.5, `${name} on dark`);
      assert.ok(contrast(entry.lightText, "#f4f4f5") >= 4.5, `${name} on light`);
    }
  });
});
