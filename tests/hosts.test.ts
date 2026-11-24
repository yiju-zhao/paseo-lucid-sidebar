import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeColors } from "../client/colors";
import { makeHostDirectory } from "../client/context";
import { DEFAULT_PREFERENCES } from "../shared/preferences";

const list = [
  { serverId: "local", label: "eason's MacBook Pro", status: "online" as const },
  { serverId: "srv", label: "eason's Mac mini", status: "online" as const },
  { serverId: "gpu", label: "gx10", status: "online" as const },
];
const colors = makeColors(DEFAULT_PREFERENCES, true);
const directory = (overrides: typeof DEFAULT_PREFERENCES.hostOverrides) =>
  makeHostDirectory(list, "local", overrides, colors);

describe("host directory", () => {
  it("shows the host's own label, ignoring a name stored by 0.4.0", () => {
    const stored = { srv: { name: "Mini", color: "auto", icon: "auto" } } as never;
    assert.equal(directory(stored).label("srv"), "eason's Mac mini");
  });

  it("handles a host it does not know", () => {
    const hosts = directory({});
    assert.equal(hosts.label("gone"), "gone");
    assert.equal(hosts.icon("gone"), "Server");
  });

  it("picks icons: monitor for this device, server elsewhere, or the chosen one", () => {
    const hosts = directory({ gpu: { color: "auto", icon: "gpu" } });
    assert.equal(hosts.icon("local"), "Monitor");
    assert.equal(hosts.icon("srv"), "Server");
    assert.equal(hosts.icon("gpu"), "Cpu");
  });

  it("sorts this device first, then remote hosts by label", () => {
    const hosts = directory({});
    assert.deepEqual(["gpu", "srv", "local"].sort(hosts.compare), ["local", "srv", "gpu"]);
  });
});
