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
  it("shows a host's custom name", () => {
    assert.equal(
      directory({ srv: { name: "Mini", color: "auto", icon: "auto" } }).label("srv"),
      "Mini",
    );
  });

  it("falls back to the host's label for a blank name", () => {
    assert.equal(
      directory({ srv: { name: "   ", color: "auto", icon: "auto" } }).label("srv"),
      "eason's Mac mini",
    );
  });

  it("handles a host it does not know", () => {
    const hosts = directory({});
    assert.equal(hosts.label("gone"), "gone");
    assert.equal(hosts.icon("gone"), "Server");
  });

  it("picks icons: monitor for this device, server elsewhere, or the chosen one", () => {
    const hosts = directory({ gpu: { name: "", color: "auto", icon: "gpu" } });
    assert.equal(hosts.icon("local"), "Monitor");
    assert.equal(hosts.icon("srv"), "Server");
    assert.equal(hosts.icon("gpu"), "Cpu");
  });

  it("sorts remote hosts by their custom name", () => {
    const hosts = directory({ gpu: { name: "Alpha", color: "auto", icon: "auto" } });
    assert.deepEqual(["srv", "gpu", "local"].sort(hosts.compare), ["local", "gpu", "srv"]);
  });
});
