import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WorkspaceIndicator } from "@getpaseo/plugin";
import {
  buildPinned,
  buildProjects,
  buildRowList,
  buildStatusGroups,
  projectDisclosures,
  statusDisclosures,
  toggleAll,
  type ListState,
} from "../client/layout";
import { keys } from "../client/keys";

const LOCAL = "srv_local";
const REMOTE = "srv_remote";

const row = (hostId: string, id: string) => ({ key: `${hostId}/${id}`, hostId });
const rows = (hostId: string, count: number, prefix = "w") =>
  Array.from({ length: count }, (_, index) => row(hostId, `${prefix}${index}`));
const ids = (items: readonly { key: string }[]) => items.map((item) => item.key);

function state(patch: Partial<ListState> = {}): ListState {
  return {
    groupHosts: true,
    compareHosts: (a, b) => (a === LOCAL ? -1 : b === LOCAL ? 1 : a.localeCompare(b)),
    collapsed: new Set(),
    expanded: new Set(),
    activeKey: null,
    spacing: { project: 6, headerMargin: 2 },
    ...patch,
  };
}

describe("buildRowList", () => {
  // The show-more rules, without host headings.
  const flat = state({ groupHosts: false });

  it("keeps every non-done row past the limit and hides done ones", () => {
    const items = rows(LOCAL, 10);
    const done = new Set(ids(items.slice(8)));
    const list = buildRowList("s", items, flat, {
      limit: 7,
      isDone: (item) => done.has(item.key),
    });
    assert.equal(list.rows.length, 8);
    assert.deepEqual(list.more, { hidden: 2, expanded: false });
  });

  it("hoists the open workspace when the limit would hide it", () => {
    const items = rows(LOCAL, 10);
    const list = buildRowList("s", items, state({ groupHosts: false, activeKey: items[9].key }), {
      limit: 7,
    });
    assert.equal(list.rows[0].key, items[9].key);
    assert.deepEqual(list.more, { hidden: 2, expanded: false });
  });

  it("offers Show less only when folding would hide rows", () => {
    const items = rows(LOCAL, 9);
    const list = buildRowList("s", items, state({ groupHosts: false, expanded: new Set(["s"]) }), {
      limit: 7,
      isDone: () => false,
    });
    assert.equal(list.rows.length, 9);
    assert.equal(list.more, null);
  });

  it("leaves out hosts whose rows the limit hides, instead of an empty heading", () => {
    const items = [...rows(LOCAL, 8), ...rows(REMOTE, 2)];
    const list = buildRowList("pinned", items, state(), { limit: 8 });
    assert.deepEqual(
      list.hosts?.map((host) => host.hostId),
      [LOCAL],
    );
    assert.deepEqual(list.more, { hidden: 2, expanded: false });
  });

  it("keeps a folded host's heading with its total, and does not count its rows as hidden", () => {
    const items = [...rows(REMOTE, 3), ...rows(LOCAL, 2)];
    const collapsed = new Set([keys.sectionHost("pinned", REMOTE)]);
    const list = buildPinned(items, state({ collapsed }));
    assert.deepEqual(
      list.hosts?.map((host) => [host.hostId, host.collapsed, host.total, host.rows.length]),
      [
        [LOCAL, false, 2, 2],
        [REMOTE, true, 3, 0],
      ],
    );
    assert.equal(list.more, null);
  });

  it("puts the hoisted row inside its own host group", () => {
    const items = [...rows(LOCAL, 7), ...rows(REMOTE, 3)];
    const active = items[9].key;
    const list = buildRowList("s", items, state({ activeKey: active }), { limit: 7 });
    const remote = list.hosts?.find((host) => host.hostId === REMOTE);
    assert.deepEqual(ids(remote?.rows ?? []), [active]);
  });

  it("gives a section with a single host its heading too", () => {
    const list = buildRowList("status:attention", rows(REMOTE, 2), state(), { limit: 7 });
    assert.deepEqual(
      list.hosts?.map((host) => [host.hostId, host.rows.length]),
      [[REMOTE, 2]],
    );
  });

  it("stays flat when hosts are not kept together", () => {
    const items = [row(REMOTE, "a"), row(LOCAL, "b")];
    const list = buildRowList("s", items, state({ groupHosts: false }), { limit: 7 });
    assert.equal(list.hosts, null);
    assert.deepEqual(ids(list.rows), ids(items));
  });
});

describe("buildProjects", () => {
  const project = (hostId: string, id: string) => ({ key: `${hostId}/${id}`, hostId, id });
  const facts = (
    byView: Record<string, ReturnType<typeof row>[]>,
    extra: { done?: string[] } = {},
  ) => {
    const indicators = new Map<string, WorkspaceIndicator>();
    for (const items of Object.values(byView))
      for (const item of items)
        indicators.set(item.key, extra.done?.includes(item.key) ? "done" : "running");
    return {
      rows: new Map(Object.entries(byView)),
      indicators,
    };
  };
  const noFilters = { projects: [] };

  it("splits a project across hosts under host headings, local host first", () => {
    const inputs = [
      { ref: project(REMOTE, "p1"), viewKey: "repo" },
      { ref: project(LOCAL, "p2"), viewKey: "repo" },
    ];
    const layout = buildProjects(
      inputs,
      facts({ repo: [row(LOCAL, "a"), row(REMOTE, "b")] }),
      state(),
      noFilters,
    );
    assert.deepEqual(
      layout.hosts?.map((host) => [host.hostId, host.blocks.map((block) => ids(block.rows.rows))]),
      [
        [LOCAL, [[`${LOCAL}/a`]]],
        [REMOTE, [[`${REMOTE}/b`]]],
      ],
    );
  });

  it("merges a project across hosts when hosts are not kept together", () => {
    const inputs = [
      { ref: project(REMOTE, "p1"), viewKey: "repo" },
      { ref: project(LOCAL, "p2"), viewKey: "repo" },
    ];
    const layout = buildProjects(
      inputs,
      facts({ repo: [row(LOCAL, "a"), row(REMOTE, "b")] }),
      state({ groupHosts: false }),
      noFilters,
    );
    assert.equal(layout.hosts, null);
    assert.equal(layout.blocks.length, 1);
    assert.equal(layout.blocks[0].projects.length, 2);
    assert.equal(layout.blocks[0].rows.rows.length, 2);
  });

  it("folds a project under every host by its view key", () => {
    const inputs = [
      { ref: project(LOCAL, "p1"), viewKey: "repo" },
      { ref: project(REMOTE, "p2"), viewKey: "repo" },
    ];
    const collapsed = new Set([keys.project("repo")]);
    const layout = buildProjects(
      inputs,
      facts({ repo: [row(LOCAL, "a"), row(REMOTE, "b")] }),
      state({ collapsed }),
      noFilters,
    );
    assert.ok(layout.hosts?.every((host) => host.blocks.every((block) => block.collapsed)));
    assert.ok(layout.hosts?.every((host) => host.guideBottom === 2 + 2));
  });

  it("leaves out projects with no listed workspace, and hosts left with none", () => {
    // Unused, all pinned, or all filtered out: no listed rows either way.
    const inputs = [
      { ref: project(LOCAL, "used"), viewKey: "used" },
      { ref: project(LOCAL, "unused"), viewKey: "unused" },
      { ref: project(REMOTE, "pinned"), viewKey: "pinned-only" },
    ];
    const layout = buildProjects(inputs, facts({ used: [row(LOCAL, "a")] }), state(), noFilters);
    assert.deepEqual(
      layout.hosts?.map((host) => [host.hostId, host.blocks.map((block) => block.viewKey)]),
      [[LOCAL, ["used"]]],
    );
  });

  it("marks a folded host and still counts its blocks", () => {
    const inputs = [
      { ref: project(LOCAL, "p1"), viewKey: "one" },
      { ref: project(REMOTE, "p2"), viewKey: "two" },
      { ref: project(REMOTE, "p3"), viewKey: "three" },
    ];
    const collapsed = new Set([keys.host(REMOTE)]);
    const layout = buildProjects(
      inputs,
      facts({ one: [row(LOCAL, "a")], two: [row(REMOTE, "b")], three: [row(REMOTE, "c")] }),
      state({ collapsed }),
      noFilters,
    );
    const remote = layout.hosts?.find((host) => host.hostId === REMOTE);
    assert.equal(remote?.count, 2);
    assert.equal(remote?.collapsed, true);
  });

  it("aggregates the most urgent status, ignoring done rows", () => {
    const items = [row(LOCAL, "a"), row(LOCAL, "b")];
    const data = facts({ repo: items }, { done: [items[0].key] });
    const layout = buildProjects(
      [{ ref: project(LOCAL, "p"), viewKey: "repo" }],
      data,
      state({ groupHosts: false }),
      noFilters,
    );
    assert.equal(layout.blocks[0].aggregate, "running");
  });
});

describe("buildStatusGroups", () => {
  it("orders groups like the built-in list and puts unknown statuses last", () => {
    const groups = ["done", "future_status", "needs_input", "running"].map((key) => ({
      key,
      title: null,
      items: [row(LOCAL, key)],
    }));
    assert.deepEqual(
      buildStatusGroups(groups, state()).map((group) => group.indicator),
      ["needs_input", "running", "done", "future_status"],
    );
  });
});

describe("fold all", () => {
  const project = (hostId: string, id: string) => ({ key: `${hostId}/${id}`, hostId, id });

  it("lists every host and project fold once in project grouping", () => {
    const inputs = [
      { ref: project(LOCAL, "p1"), viewKey: "repo" },
      { ref: project(REMOTE, "p2"), viewKey: "repo" },
    ];
    const facts = {
      rows: new Map([["repo", [row(LOCAL, "a"), row(REMOTE, "b")]]]),
      indicators: new Map(),
    };
    const layout = buildProjects(inputs, facts, state(), { projects: [] });
    assert.deepEqual(
      projectDisclosures(layout).sort(),
      [keys.host(LOCAL), keys.host(REMOTE), keys.project("repo")].sort(),
    );
  });

  it("lists status groups and their host headings", () => {
    const groups = [{ key: "done", title: null, items: [row(LOCAL, "a"), row(REMOTE, "b")] }];
    assert.deepEqual(statusDisclosures(buildStatusGroups(groups, state())), [
      keys.status("done"),
      keys.sectionHost(keys.status("done"), LOCAL),
      keys.sectionHost(keys.status("done"), REMOTE),
    ]);
  });

  it("folds everything while anything is open, then unfolds, keeping other keys", () => {
    const all = ["a", "b"];
    const folded = toggleAll(["pinned", "a"], all);
    assert.deepEqual(folded, ["pinned", "a", "b"]);
    assert.deepEqual(toggleAll(folded, all), ["pinned"]);
  });
});
