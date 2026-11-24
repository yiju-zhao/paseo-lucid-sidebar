import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_PREFERENCES, sidebarSettings } from "../shared/preferences";

const migrate = (values: unknown, fromVersion: number) =>
  sidebarSettings.schema.parse(sidebarSettings.migrate?.(values, fromVersion));

describe("preference migrations", () => {
  it("keeps Host on when both old host switches were on", () => {
    const next = migrate({ rowItems: { host: true }, clusterByHost: true }, 3);
    assert.equal(next.rowItems.host, true);
    assert.equal("clusterByHost" in next, false);
  });

  it("turns Host off when either old host switch was off", () => {
    assert.equal(
      migrate({ rowItems: { host: true }, clusterByHost: false }, 3).rowItems.host,
      false,
    );
    assert.equal(
      migrate({ rowItems: { host: false }, clusterByHost: true }, 3).rowItems.host,
      false,
    );
  });

  it("moves per-host project folds to view keys", () => {
    const next = migrate({ collapsed: ['project:["srv_a","repo"]', "project:repo", "pinned"] }, 2);
    assert.deepEqual(next.collapsed, ["project:repo", "pinned"]);
  });

  it("defaults to host headings on", () => {
    assert.equal(DEFAULT_PREFERENCES.rowItems.host, true);
  });
});

describe("appearance settings (v5)", () => {
  it("defaults reproduce 0.3.1", () => {
    assert.deepEqual(DEFAULT_PREFERENCES.appearance, {
      preset: "default",
      density: "standard",
      tagStyle: "solid",
      guides: "thin",
      timeFormat: "relative",
    });
    assert.deepEqual(DEFAULT_PREFERENCES.hostOverrides, {});
    assert.deepEqual(DEFAULT_PREFERENCES.projectColors, {});
  });

  it("keeps a v4 document's values and adds appearance", () => {
    const next = migrate({ grouping: "status", rowItems: { host: false } }, 4);
    assert.equal(next.grouping, "status");
    assert.equal(next.rowItems.host, false);
    assert.equal(next.appearance.density, "standard");
  });

  it("falls back per field on unknown stored values", () => {
    const next = sidebarSettings.schema.parse({
      appearance: { preset: "neon", density: "compact" },
      hostOverrides: { srv_a: { name: "Mini", color: "magenta", icon: "toaster" } },
      projectColors: { repo: "magenta", ok: "teal" },
    });
    assert.equal(next.appearance.preset, "default");
    assert.equal(next.appearance.density, "compact");
    assert.deepEqual(next.hostOverrides.srv_a, { color: "auto", icon: "auto" });
    assert.deepEqual(next.projectColors, { ok: "teal" });
  });
});

describe("damaged settings", () => {
  it("drops only the bad host entry and keeps the others", () => {
    const next = sidebarSettings.schema.parse({
      hostOverrides: { a: { name: "Mini", color: "red", icon: "gpu" }, b: null },
    });
    assert.deepEqual(next.hostOverrides, { a: { color: "red", icon: "gpu" } });
  });

  it("falls back to default appearance instead of invalidating the document", () => {
    const parsed = sidebarSettings.schema.safeParse({ appearance: null, grouping: "status" });
    assert.ok(parsed.success);
    assert.equal(parsed.data.grouping, "status");
    assert.equal(parsed.data.appearance.density, "standard");
  });
});
