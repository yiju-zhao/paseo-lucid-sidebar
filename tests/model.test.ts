import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAge, formatTime } from "../client/model";

// Local-time dates, so the tests hold in any time zone.
const at = (day: number, hour: number, minute: number) =>
  new Date(2026, 10, day, hour, minute).toISOString();
const now = (day: number, hour: number, minute: number) =>
  new Date(2026, 10, day, hour, minute).getTime();

describe("formatTime", () => {
  it("shows a clock time for earlier today", () => {
    assert.equal(formatTime(at(24, 9, 5), now(24, 15, 0), "absolute"), "09:05");
  });

  it("shows a date for yesterday, even under 24 hours ago", () => {
    assert.equal(formatTime(at(23, 23, 50), now(24, 0, 10), "absolute"), "Nov 23");
  });

  it("shows nothing without a time", () => {
    assert.equal(formatTime(null, now(24, 0, 0), "absolute"), null);
  });

  it("matches the existing relative format", () => {
    const when = at(24, 9, 5);
    const current = now(24, 12, 0);
    assert.equal(formatTime(when, current, "relative"), formatAge(when, current));
  });
});
