import type { AnalysisPack } from "@action-tracker/analysis-core";

export interface GroundstrokeConfig {
  /** Candidate threshold on racket-wrist speed, torso lengths per second. */
  readonly peakThresholdTorsoPerS: number;
  readonly minPeakSeparationMs: number;
  readonly windowBeforeMs: number;
  readonly windowAfterMs: number;
}

/**
 * tennis.groundstroke v0: forehand + backhand (serve is P2, tennis.serve).
 * Stroke detection is not implemented yet; until real tennis clips and labels
 * exist the pack returns no events (03 §5, ADR-015).
 */
export const groundstrokePack: AnalysisPack<GroundstrokeConfig> = {
  id: "tennis.groundstroke",
  version: "0.0.0",
  sport: "tennis",
  title: "Tennis groundstrokes",
  capture: {
    views: ["side-left", "side-right", "back"],
    guidanceKey: "capture.tennis.groundstroke",
  },
  requirements: {
    keypoints: [
      "left_shoulder",
      "right_shoulder",
      "left_elbow",
      "right_elbow",
      "left_wrist",
      "right_wrist",
      "left_hip",
      "right_hip",
      "left_knee",
      "right_knee",
      "left_ankle",
      "right_ankle",
    ],
    observation: { maxGapMs: 40, minObservedRatio: 0.8 },
    views: ["side-left", "side-right", "back"],
    maxPersons: 1,
  },
  defaultConfig: {
    peakThresholdTorsoPerS: 6,
    minPeakSeparationMs: 800,
    windowBeforeMs: 1000,
    windowAfterMs: 600,
  },
  analyze(track, ctx) {
    return {
      packId: "tennis.groundstroke",
      packVersion: "0.0.0",
      events: [],
      metrics: [],
      notes: [],
      series: [],
      quality: { timeTrusted: ctx.timeTrusted, frameCount: track.frames.length },
    };
  },
};
