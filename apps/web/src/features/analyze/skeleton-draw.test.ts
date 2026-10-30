import { describe, expect, it } from "vitest";
import { frameAt } from "./skeleton-draw";

describe("frameAt", () => {
  const ts = Float64Array.from([0, 16.7, 33.4, 50.1]);

  it("maps a playback time to the frame being shown", () => {
    expect(frameAt(ts, 0)).toBe(0);
    expect(frameAt(ts, 17)).toBe(1);
    expect(frameAt(ts, 25.5)).toBe(2);
    expect(frameAt(ts, 999)).toBe(3);
    expect(frameAt(ts, -5)).toBe(0);
  });

  it("returns -1 for an empty track", () => {
    expect(frameAt(new Float64Array(0), 10)).toBe(-1);
  });
});
