import { describe, expect, it } from "vitest";
import { frameAt, overlaySizes, skeletonScale } from "./skeleton-draw";

describe("skeleton scale", () => {
  it("keeps MASTER §3.3 sizes for a normally sized figure", () => {
    expect(skeletonScale(120)).toBe(1);
    expect(overlaySizes(1, 1)).toMatchObject({ radius: 4, bone: 3, boneHalo: 5, dash: 4 });
  });

  it("shrinks dots and lines for a small figure, down to a floor", () => {
    expect(skeletonScale(40)).toBe(0.5);
    expect(skeletonScale(10)).toBe(0.35);
    const s = overlaySizes(skeletonScale(10), 2);
    expect(s.radius).toBeCloseTo(2.8);
    expect(s.bone).toBeCloseTo(2.1);
    // Halo and dash never vanish, so the bone stays readable on any background.
    expect(s.boneHalo - s.bone).toBeGreaterThanOrEqual(2);
    expect(s.dash).toBe(4);
  });

  it("falls back to full size when the torso is unknown", () => {
    expect(skeletonScale(null)).toBe(1);
    expect(skeletonScale(Number.NaN)).toBe(1);
  });
});

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
