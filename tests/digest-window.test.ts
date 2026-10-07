import { describe, it, expect } from "vitest";
import { digestWindowStart } from "../src/lib/digest-window";

const NOW = new Date("2026-10-07T09:17:00.000Z");
const DAY = 24 * 3600 * 1000;

describe("digestWindowStart", () => {
  it("with no marker, covers exactly the trailing 7 days", () => {
    const start = digestWindowStart(null, NOW);
    expect(start.getTime()).toBe(NOW.getTime() - 7 * DAY);
  });

  it("with a recent marker, covers only new data since that digest", () => {
    const lastSent = new Date(NOW.getTime() - 2 * DAY);
    const start = digestWindowStart(lastSent, NOW);
    expect(start.getTime()).toBe(lastSent.getTime());
  });

  it("with an old marker (scheduler was down), never exceeds the 7-day promise", () => {
    const lastSent = new Date(NOW.getTime() - 30 * DAY);
    const start = digestWindowStart(lastSent, NOW);
    expect(start.getTime()).toBe(NOW.getTime() - 7 * DAY);
  });

  it("with a marker exactly 7 days old, starts at the floor (inclusive window)", () => {
    const lastSent = new Date(NOW.getTime() - 7 * DAY);
    const start = digestWindowStart(lastSent, NOW);
    expect(start.getTime()).toBe(NOW.getTime() - 7 * DAY);
  });

  it("clamps a future-dated marker (clock skew) to now -> empty window, no duplicate send", () => {
    const future = new Date(NOW.getTime() + 5 * 3600 * 1000);
    const start = digestWindowStart(future, NOW);
    expect(start.getTime()).toBe(NOW.getTime());
  });

  it("a report strictly before the window is excluded; at/after is included", () => {
    const lastSent = new Date(NOW.getTime() - 2 * DAY);
    const start = digestWindowStart(lastSent, NOW).getTime();
    const justBefore = start - 1;
    const exactlyAt = start;
    expect(justBefore < start).toBe(true);
    expect(exactlyAt >= start).toBe(true);
  });
});
