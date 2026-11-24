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
