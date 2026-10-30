import type { JointName } from "./skeleton.ts";

/** Native-model abstraction (02 §5). Implementations run inside the pipeline Web Worker. */
export interface RawPose {
  /** [x, y, z, visibility] × K; x/y normalised to the inference image. */
  readonly image: Float32Array;
  readonly presence?: Float32Array;
  /** [x, y, z, visibility] × K in metres, hip-centred model estimate. */
  readonly world?: Float32Array;
}

export interface RawPoseFrame {
  readonly timestampMs: number;
  readonly poses: readonly RawPose[];
}

export interface PoseProvider<TFrame = unknown> {
  readonly id: string;
  readonly keypoints: readonly string[];
  readonly delegate: "GPU" | "CPU";
  readonly modelSha256: string;
  /** Synchronous like MediaPipe's detectForVideo; timestamps must strictly increase. */
  detect(frame: TFrame, timestampMs: number): RawPoseFrame;
  dispose(): void;
}

/** Bones drawn for the body overlay (face points other than the nose are omitted). */
export const BODY_BONES: ReadonlyArray<readonly [JointName, JointName]> = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_wrist", "left_index"],
  ["right_wrist", "right_index"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
  ["left_ankle", "left_heel"],
  ["left_heel", "left_foot_index"],
  ["left_ankle", "left_foot_index"],
  ["right_ankle", "right_heel"],
  ["right_heel", "right_foot_index"],
  ["right_ankle", "right_foot_index"],
];

export const BODY_JOINTS: readonly JointName[] = [
  "nose",
  ...new Set(BODY_BONES.flat()),
];
