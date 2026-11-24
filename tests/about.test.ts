import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { LINKS, OVERVIEW, VERSION } from "../shared/about";

const root = new URL("../", import.meta.url);

describe("about", () => {
  it("shows the package version", () => {
    const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8")) as {
      version: string;
    };
    assert.equal(VERSION, pkg.version);
  });

  it("shows the listing overview exactly", () => {
    assert.equal(OVERVIEW, readFileSync(new URL("OVERVIEW.md", root), "utf8"));
  });

  it("links to the repository, registry page and npm package", () => {
    assert.deepEqual(LINKS, {
      github: "https://github.com/yiju-zhao/paseo-lucid-sidebar",
      registry: "https://paseo.sh/plugins/yiju-zhao/lucid-sidebar",
      npm: "https://www.npmjs.com/package/paseo-lucid-sidebar",
    });
  });
});
