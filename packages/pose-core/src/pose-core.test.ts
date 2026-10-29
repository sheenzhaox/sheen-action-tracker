import { describe, expect, it } from "vitest";
import { jointAngleDeg, jointAngleFromNormalized, toPixels } from "./geometry.ts";
import { CANONICAL_JOINTS, isJointName, otherSide, sided } from "./skeleton.ts";

describe("jointAngleDeg", () => {
  it("measures a right angle", () => {
    expect(jointAngleDeg({ x: 0, y: -10 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(90, 10);
  });

  it("measures a straight limb as 180", () => {
    expect(jointAngleDeg({ x: 0, y: 0 }, { x: 0, y: 5 }, { x: 0, y: 10 })).toBeCloseTo(180, 10);
  });

  it("returns null for a zero-length segment", () => {
    expect(jointAngleDeg({ x: 3, y: 3 }, { x: 3, y: 3 }, { x: 9, y: 1 })).toBeNull();
  });
});

describe("pixel-space invariant", () => {
  // Portrait 360x640, same as the sample1 mockup.
  const size = { width: 360, height: 640 };
  const a = { x: 0.5, y: 0.4 };
  const vertex = { x: 0.5, y: 0.5 };
  const c = { x: 0.6, y: 0.6 };

  it("differs from the (wrong) angle computed on normalised coordinates", () => {
    const naive = jointAngleDeg(a, vertex, c)!;
    const pixel = jointAngleFromNormalized(a, vertex, c, size)!;
    expect(naive).toBeCloseTo(135, 6);
    // In pixels the c-ray is (36, 64): angle from straight up = 180 - atan2(36, 64).
    expect(pixel).toBeCloseTo(180 - (Math.atan2(36, 64) * 180) / Math.PI, 6);
    expect(Math.abs(pixel - naive)).toBeGreaterThan(5);
  });

  it("toPixels scales each axis by its own dimension", () => {
    expect(toPixels({ x: 0.5, y: 0.25 }, size)).toEqual({ x: 180, y: 160 });
  });
});

describe("skeleton", () => {
  it("has 33 unique joint names", () => {
    expect(new Set(CANONICAL_JOINTS).size).toBe(33);
  });

  it("builds sided names", () => {
    expect(sided("right", "wrist")).toBe("right_wrist");
    expect(otherSide("left")).toBe("right");
    expect(isJointName("left_knee")).toBe(true);
    expect(() => sided("left", "tail")).toThrow();
  });
});
