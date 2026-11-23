import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  begin,
  emptyQueue,
  enqueue,
  land,
  settle,
  shown,
  type QueueState,
} from "../client/save-queue";

interface Doc {
  collapsed: string[];
}
const toggle = (key: string) => (doc: Doc) => ({
  collapsed: doc.collapsed.includes(key)
    ? doc.collapsed.filter((entry) => entry !== key)
    : [...doc.collapsed, key],
});

/** A stand-in for Paseo's settings store. */
function store(initial: Doc) {
  let doc = initial;
  let revision = 0;
  return {
    get doc() {
      return doc;
    },
    get revision() {
      return `r${revision}`;
    },
    write(next: Doc) {
      doc = next;
      revision += 1;
    },
  };
}

describe("save queue", () => {
  it("unfolds a stored fold when the new revision arrives before the save resolves", () => {
    const settings = store({ collapsed: ["host:a"] });
    let state: QueueState<Doc> = enqueue(emptyQueue<Doc>(), toggle("host:a"));
    assert.deepEqual(shown(state, settings.doc).collapsed, []);

    const started = begin(state, settings.doc, settings.revision);
    assert.ok(started);
    state = started.next;
    const before = settings.revision;
    // Paseo stores the document, and the view sees the new revision, first...
    settings.write(started.doc);
    state = land(state, settings.revision);
    assert.deepEqual(shown(state, settings.doc).collapsed, []);
    // ...and only then resolves the save.
    state = settle(state, true, settings.revision);
    assert.notEqual(before, settings.revision);

    assert.deepEqual(shown(state, settings.doc).collapsed, []);
    assert.equal(state.flight, null);
    assert.equal(begin(state, settings.doc, settings.revision), null);
  });

  it("also lands when the save resolves before the new revision arrives", () => {
    const settings = store({ collapsed: [] });
    let state = enqueue(emptyQueue<Doc>(), toggle("x"));
    const started = begin(state, settings.doc, settings.revision);
    assert.ok(started);
    state = settle(started.next, true, settings.revision);
    assert.deepEqual(shown(state, settings.doc).collapsed, ["x"]);
    settings.write(started.doc);
    state = land(state, settings.revision);
    assert.equal(state.flight, null);
    assert.deepEqual(shown(state, settings.doc).collapsed, ["x"]);
  });

  it("applies changes made during a save on top of it, then saves them next", () => {
    const settings = store({ collapsed: [] });
    let state = enqueue(emptyQueue<Doc>(), toggle("x"));
    const first = begin(state, settings.doc, settings.revision);
    assert.ok(first);
    state = enqueue(first.next, toggle("y"));
    assert.deepEqual(shown(state, settings.doc).collapsed, ["x", "y"]);
    assert.equal(begin(state, settings.doc, settings.revision), null, "one save at a time");

    settings.write(first.doc);
    state = settle(land(state, settings.revision), true, settings.revision);
    const second = begin(state, settings.doc, settings.revision);
    assert.ok(second);
    assert.deepEqual(second.doc.collapsed, ["x", "y"]);
  });

  it("returns a failed save's patches to the queue and retries only after a change", () => {
    const settings = store({ collapsed: [] });
    let state = enqueue(emptyQueue<Doc>(), toggle("x"));
    const started = begin(state, settings.doc, settings.revision);
    assert.ok(started);
    state = settle(started.next, false, settings.revision);
    assert.deepEqual(shown(state, settings.doc).collapsed, ["x"]);
    assert.equal(begin(state, settings.doc, settings.revision), null);
    settings.write({ collapsed: ["z"] });
    const retry = begin(state, settings.doc, settings.revision);
    assert.deepEqual(retry?.doc.collapsed, ["z", "x"]);
  });
});
