import { FilesetResolver, PoseLandmarker, type Landmark, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { PoseProvider, RawPose, RawPoseFrame } from "@action-tracker/pose-core";
import { MEDIAPIPE_POSE_33 } from "@action-tracker/pose-core/io";

export const TASKS_VISION_VERSION = "1.2.0";

export interface MediaPipeModel {
  /** "lite" | "full" | "heavy" */
  readonly variant: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
}

export interface MediaPipeOptions {
  /** Directory serving vision_wasm_module_internal.{js,wasm}, self-hosted (no CDN). */
  readonly wasmBase: string;
  readonly model: MediaPipeModel;
  readonly delegate: "GPU" | "CPU";
  readonly numPoses?: number;
}

function toArray(points: ReadonlyArray<NormalizedLandmark | Landmark>, k: number) {
  const out = new Float32Array(k * 4);
  let presence: Float32Array | undefined;
  for (let i = 0; i < k; i++) {
    const p = points[i];
    if (!p) {
      out.fill(Number.NaN, i * 4, i * 4 + 4);
      continue;
    }
    out[i * 4] = p.x;
    out[i * 4 + 1] = p.y;
    out[i * 4 + 2] = p.z;
    out[i * 4 + 3] = p.visibility;
    if (p.presence !== undefined) {
      presence ??= new Float32Array(k).fill(Number.NaN);
      presence[i] = p.presence;
    }
  }
  return { out, presence };
}

/**
 * Creates a PoseLandmarker in VIDEO mode. Always passes an explicit OffscreenCanvas: tasks-vision's
 * own OffscreenCanvas detection keys off the Safari UA and wrongly falls back to `document` in a
 * worker on iOS Chrome/Edge (UA without "Version/x").
 */
export async function createMediaPipePoseProvider(
  opts: MediaPipeOptions,
): Promise<PoseProvider<TexImageSource>> {
  const fileset = await FilesetResolver.forVisionTasks(opts.wasmBase, true);
  const landmarker = await PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetBuffer: opts.model.bytes, delegate: opts.delegate },
    canvas: new OffscreenCanvas(1, 1),
    runningMode: "VIDEO",
    numPoses: opts.numPoses ?? 1,
    outputSegmentationMasks: false,
  });
  const k = MEDIAPIPE_POSE_33.length;

  return {
    id: `mediapipe.pose_landmarker_${opts.model.variant}@tasks-vision-${TASKS_VISION_VERSION}`,
    keypoints: MEDIAPIPE_POSE_33,
    delegate: opts.delegate,
    modelSha256: opts.model.sha256,
    detect(frame: TexImageSource, timestampMs: number): RawPoseFrame {
      const result = landmarker.detectForVideo(frame, timestampMs);
      const poses: RawPose[] = result.landmarks.map((lm, i) => {
        const { out: image, presence } = toArray(lm, k);
        const worldLm = result.worldLandmarks[i];
        return {
          image,
          ...(presence && { presence }),
          ...(worldLm && { world: toArray(worldLm, k).out }),
        };
      });
      result.close();
      return { timestampMs, poses };
    },
    dispose() {
      landmarker.close();
    },
  };
}

/** GPU first; on any init failure fall back to CPU and report why (02 §5). */
export async function createWithFallback(
  opts: Omit<MediaPipeOptions, "delegate">,
  prefer: "GPU" | "CPU" = "GPU",
): Promise<{ provider: PoseProvider<TexImageSource>; gpuError?: string }> {
  if (prefer === "CPU") return { provider: await createMediaPipePoseProvider({ ...opts, delegate: "CPU" }) };
  try {
    return { provider: await createMediaPipePoseProvider({ ...opts, delegate: "GPU" }) };
  } catch (e) {
    return {
      provider: await createMediaPipePoseProvider({ ...opts, delegate: "CPU" }),
      gpuError: e instanceof Error ? e.message : String(e),
    };
  }
}
