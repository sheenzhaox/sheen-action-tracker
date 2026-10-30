import type { PtrkTrack } from "@action-tracker/pose-core/io";

export type ModelVariant = "full" | "lite";

export interface PipelineOptions {
  model: ModelVariant;
  delegate: "GPU" | "CPU";
  inferenceLongEdge: number;
}

export interface ProbeInfo {
  codec: string;
  codedWidth: number;
  codedHeight: number;
  /** Upright (rotated) display size. */
  displayWidth: number;
  displayHeight: number;
  rotation: number;
  /** 2×2 orientation matrix [a, b, c, d] from tkhd, normalised to ±1/0. */
  orientation: [number, number, number, number];
  durationMs: number;
  fps: number;
  frameCount: number;
  hdr: "none" | "hlg" | "pq" | "unknown";
  timeTrusted: boolean;
  timeNote?: string;
}

export type Stage = "loadModel" | "probe" | "analyze" | "save";

export interface Timings {
  modelLoadMs: number;
  modelInitMs: number;
  readMs: number;
  decodeWaitMs: number;
  prepMs: number;
  inferMs: number;
  inferP50Ms: number;
  inferP95Ms: number;
  encodeMs: number;
  saveMs: number;
  totalMs: number;
}

export interface RunSummary {
  analysisId: string;
  options: PipelineOptions;
  videoSha256: string;
  probe: ProbeInfo;
  /** Upright image size actually fed to the model. */
  inferenceSize: { width: number; height: number };
  providerId: string;
  delegate: "GPU" | "CPU";
  gpuError?: string;
  modelSha256: string;
  firstFrame?: { format: string | null; colorSpace: string };
  framesDecoded: number;
  framesWithPose: number;
  ptrkBytes: number;
  recipeHash: string;
  opfsPath: string;
  timings: Timings;
}

export type ErrorCode =
  | "noVideoTrack"
  | "codecUnsupported"
  | "decodeFailed"
  | "modelLoadFailed"
  | "cancelled"
  | "unknown";

export type ToWorker =
  | { type: "start"; file: File; options: PipelineOptions }
  | { type: "videoHash"; sha256: string }
  | { type: "cancel" };

export type FromWorker =
  | { type: "stage"; stage: Stage }
  | { type: "probe"; probe: ProbeInfo }
  | { type: "progress"; done: number; total: number }
  | { type: "done"; summary: RunSummary; track: PtrkTrack }
  | { type: "error"; code: ErrorCode; detail: string };
