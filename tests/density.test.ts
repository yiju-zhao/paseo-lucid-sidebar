import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { metricsFor } from "../client/density";
import { DENSITIES } from "../shared/preferences";

describe("density", () => {
  it("keeps 0.3.1's sizes at Standard on pointer layouts", () => {
    assert.deepEqual(metricsFor("standard", false), {
      rowMinHeight: 36,
      rowPaddingY: 8,
      projectRowPaddingY: 6,
      headerMinHeight: 36,
      headerPaddingY: 8,
      projectHeaderMinHeight: 30,
      projectHeaderPaddingY: 5,
      headerMargin: 2,
      projectSpacing: 6,
      statusSpacing: 12,
    });
  });

  it("keeps a 44 tap height on touch at every density", () => {
    for (const density of DENSITIES) {
      const touch = metricsFor(density, true);
      assert.equal(touch.rowMinHeight, 44);
      assert.equal(touch.headerMinHeight, 44);
      assert.equal(touch.projectHeaderMinHeight, 44);
    }
  });

  it("shrinks rows when compact and grows them when comfortable", () => {
    assert.ok(metricsFor("compact", false).rowMinHeight < 36);
    assert.ok(metricsFor("comfortable", false).rowMinHeight > 36);
  });

  it("orders spacing compact ≤ standard ≤ comfortable on both layouts", () => {
    for (const touch of [false, true]) {
      const [compact, standard, comfortable] = DENSITIES.map((d) => metricsFor(d, touch));
      for (const key of ["projectSpacing", "statusSpacing", "headerMargin"] as const) {
        assert.ok(compact[key] <= standard[key] && standard[key] <= comfortable[key], key);
      }
    }
  });
});
