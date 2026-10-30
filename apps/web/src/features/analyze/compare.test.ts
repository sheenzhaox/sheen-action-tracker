import { describe, expect, it } from "vitest";
import { KP_STATE, MEDIAPIPE_POSE_33, PTRK_MISSING, type PtrkTrack } from "@action-tracker/pose-core/io";
import { compareTracks } from "./compare";

const K = MEDIAPIPE_POSE_33.length;

function track(times: number[], offsetPx = 0, missingFrame = -1): PtrkTrack {
  const f = times.length;
  const image = new Int16Array(f * K * 4).fill(PTRK_MISSING);
  const kpState = new Uint8Array(f * K).fill(KP_STATE.missing);
  for (let i = 0; i < f; i++) {
    if (i === missingFrame) continue;
    for (let j = 0; j < K; j++) {
      kpState[i * K + j] = KP_STATE.observed;
      image.set([(100 + j + offsetPx) * 4, 200 * 4, 0, 9000], (i * K + j) * 4);
    }
  }
  return {
    header: {
      keypoints: [...MEDIAPIPE_POSE_33],
      frames: f,
      video: { displayHeight: 640 },
    } as PtrkTrack["header"],
    timestamps: Float64Array.from(times),
    flags: new Uint8Array(f),
    kpState,
    image,
  };
}

describe("compareTracks", () => {
  it("reports zero difference for identical tracks", () => {
    const a = track([0, 33.3, 66.7]);
    expect(compareTracks(a, a)).toMatchObject({ framesCompared: 3, pointsCompared: 39, meanPx: 0 });
  });

  it("measures a constant 3 px offset and its share of the frame height", () => {
    const d = compareTracks(track([0, 33.3, 66.7], 3), track([0, 33.3, 66.7]))!;
    expect(d.meanPx).toBeCloseTo(3);
    expect(d.p95Px).toBeCloseTo(3);
    expect(d.meanPct).toBeCloseTo((3 / 640) * 100);
  });

  it("matches frames by time and skips frames missing in either track", () => {
    const d = compareTracks(track([0, 33.3, 66.7, 100]), track([0.4, 33.6, 66.9, 99.8], 0, 1))!;
    expect(d.framesCompared).toBe(3);
  });

  it("ignores frames with no counterpart within half a frame", () => {
    expect(compareTracks(track([500, 533]), track([0, 33.3]))).toBeNull();
  });
});
