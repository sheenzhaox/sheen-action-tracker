import type { FrameSize } from "./geometry.ts";
import type { JointName } from "./skeleton.ts";

/** Per-keypoint provenance after post-processing (02 §7). */
export type KpState = "observed" | "interpolated" | "missing" | "rejected";

export interface TrackedKeypoint {
  /** Normalised [0, 1] image coordinates; convert with toPixels before measuring. */
  readonly x: number;
  readonly y: number;
  /** Gating only; never shown as measurement precision. */
  readonly visibility: number;
  readonly state: KpState;
}

export interface PoseFrame {
  /** Real (not playback) time in ms, from the recording's timeMap. */
  readonly tMs: number;
  /** Segment id; post-processing never interpolates or filters across segments. */
  readonly segment: number;
  readonly keypoints: Readonly<Partial<Record<JointName, TrackedKeypoint>>>;
}

/**
 * Post-processed track consumed by analysis packs.
 * Provisional in-memory shape; the on-disk PTRK codec will produce it.
 */
export interface ProcessedPoseTrack {
  readonly frameSize: FrameSize;
  /** Uniform resampled rate within each segment. */
  readonly sampleRateHz: number;
  readonly frames: readonly PoseFrame[];
}
