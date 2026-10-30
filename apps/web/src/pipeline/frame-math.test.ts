import { describe, expect, it } from "vitest";
import {
  hdrFromColr,
  inferenceScale,
  nextDetectTimestamp,
  orientationFromMatrix,
  percentile,
  timeModel,
  uprightTransform,
} from "./frame-math";

const FX = 65536;
const apply = (t: number[], x: number, y: number) => [t[0]! * x + t[2]! * y + t[4]!, t[1]! * x + t[3]! * y + t[5]!];

describe("orientation", () => {
  it("reads the iPhone portrait tkhd matrix as 90°", () => {
    expect(orientationFromMatrix([0, FX, 0, -FX, 0, 0, 2160 * FX, 0, 1 << 30])).toEqual({
      orientation: [0, 1, -1, 0],
      rotation: 90,
    });
    expect(orientationFromMatrix([FX, 0, 0, 0, FX, 0, 0, 0, 1 << 30]).rotation).toBe(0);
    expect(orientationFromMatrix([-FX, 0, 0, 0, -FX, 0, 0, 0, 1 << 30]).rotation).toBe(180);
    expect(orientationFromMatrix([0, -FX, 0, FX, 0, 0, 0, 0, 1 << 30]).rotation).toBe(270);
  });

  it("falls back to identity for a non-orthogonal matrix", () => {
    expect(orientationFromMatrix([2 * FX, 0, 0, 0, 2 * FX, 0, 0, 0, 0]).rotation).toBe(0);
  });

  it("draws a 3840×2160 frame upright at 720×1280 for a 90° rotation", () => {
    const up = uprightTransform([0, 1, -1, 0], 3840, 2160, inferenceScale(2160, 3840, 1280));
    expect([up.width, up.height]).toEqual([720, 1280]);
    // Sensor top-left lands at display top-right; sensor bottom-left at display top-left.
    expect(apply(up.transform, 0, 0)).toEqual([720, 0]);
    expect(apply(up.transform, 0, 2160)).toEqual([0, 0]);
    expect(apply(up.transform, 3840, 2160)).toEqual([0, 1280]);
  });

  it("never upscales", () => {
    expect(inferenceScale(360, 640, 1280)).toBe(1);
  });
});

describe("time model", () => {
  const edit = (media_time: number, rate = 1) => ({
    segment_duration: 1000,
    media_time,
    media_rate_integer: rate,
    media_rate_fraction: 0,
  });

  it("trusts a normal 60 fps clip and returns the edit offset", () => {
    expect(timeModel(59.97, [edit(1200)])).toEqual({ offset: 1200, trusted: true });
    expect(timeModel(30, undefined)).toEqual({ offset: 0, trusted: true });
  });

  it("does not trust slow motion or rate-changing edit lists", () => {
    expect(timeModel(240, [edit(0)]).trusted).toBe(false);
    expect(timeModel(60, [edit(0, 0)]).trusted).toBe(false);
    expect(timeModel(60, [edit(0), edit(5000)]).trusted).toBe(false);
  });
});

describe("helpers", () => {
  it("classifies HDR transfer functions", () => {
    expect(hdrFromColr(18)).toBe("hlg");
    expect(hdrFromColr(16)).toBe("pq");
    expect(hdrFromColr(1)).toBe("none");
    expect(hdrFromColr(undefined)).toBe("unknown");
  });

  it("keeps MediaPipe timestamps strictly increasing", () => {
    expect(nextDetectTimestamp(16.68, 16)).toBe(17);
    expect(nextDetectTimestamp(4.2, 4)).toBe(5);
    expect(nextDetectTimestamp(100.4, -1)).toBe(100);
  });

  it("computes nearest-rank percentiles", () => {
    const xs = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(xs, 50)).toBe(50);
    expect(percentile(xs, 95)).toBe(95);
    expect(percentile([], 50)).toBe(0);
  });
});
