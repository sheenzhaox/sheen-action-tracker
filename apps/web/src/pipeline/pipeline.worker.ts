/// <reference lib="webworker" />
import { createWithFallback } from "@action-tracker/pose-mediapipe";
import type { PoseProvider, RawPoseFrame } from "@action-tracker/pose-core";
import {
  FRAME_FLAG,
  KP_STATE,
  MEDIAPIPE_POSE_33,
  PTRK_MISSING,
  quantMm,
  quantPx,
  quantUnit,
  recipeHash,
  sha256Hex,
  writePtrkFile,
  type PtrkHeader,
  type PtrkTrack,
} from "@action-tracker/pose-core/io";
import { MODELS, WASM_BASE } from "./assets.ts";
import { PipelineError, demux, type DemuxedVideo } from "./demux.ts";
import { inferenceScale, nextDetectTimestamp, percentile, uprightTransform } from "./frame-math.ts";
import { removeAnalysis, writeOpfsFile } from "./opfs.ts";
import type { ErrorCode, FromWorker, PipelineOptions, RunSummary, Timings, ToWorker } from "./protocol.ts";

const post = (msg: FromWorker, transfer: Transferable[] = []) => self.postMessage(msg, transfer);

let cancelled = false;
let resolveHash: ((sha: string) => void) | undefined;
const videoHash = new Promise<string>((resolve) => {
  resolveHash = resolve;
});

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  if (msg.type === "start") void run(msg.file, msg.options);
  else if (msg.type === "videoHash") resolveHash?.(msg.sha256);
  else if (msg.type === "cancel") cancelled = true;
};

interface FrameResult {
  tMs: number;
  pose: RawPoseFrame["poses"][number] | undefined;
}

async function loadModel(variant: PipelineOptions["model"]) {
  const m = MODELS[variant];
  const res = await fetch(m.url);
  if (!res.ok) throw new Error(`model HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const sha256 = await sha256Hex(bytes);
  if (sha256 !== m.sha256) throw new Error(`model sha256 mismatch: ${sha256}`);
  return { variant: m.variant, bytes, sha256 };
}

async function run(file: File, options: PipelineOptions) {
  const analysisId = crypto.randomUUID();
  const t: Timings = {
    modelLoadMs: 0,
    modelInitMs: 0,
    readMs: 0,
    decodeWaitMs: 0,
    prepMs: 0,
    inferMs: 0,
    inferP50Ms: 0,
    inferP95Ms: 0,
    encodeMs: 0,
    saveMs: 0,
    totalMs: 0,
  };
  const tStart = performance.now();
  let provider: PoseProvider<TexImageSource> | undefined;
  let decoder: VideoDecoder | undefined;
  const queue: VideoFrame[] = [];
  try {
    post({ type: "stage", stage: "loadModel" });
    let t0 = performance.now();
    let model;
    try {
      model = await loadModel(options.model);
    } catch (err) {
      throw Object.assign(new Error(String(err)), { code: "modelLoadFailed" as ErrorCode });
    }
    t.modelLoadMs = performance.now() - t0;
    t0 = performance.now();
    let created;
    try {
      // Absolute URL: Vite dev rewrites relative dynamic imports (adds ?import), which breaks /public files.
      const wasmBase = new URL(WASM_BASE, self.location.href).href;
      created = await createWithFallback({ wasmBase, model, numPoses: 1 }, options.delegate);
    } catch (err) {
      throw Object.assign(new Error(String(err)), { code: "modelLoadFailed" as ErrorCode });
    }
    provider = created.provider;
    t.modelInitMs = performance.now() - t0;

    post({ type: "stage", stage: "probe" });
    let video: DemuxedVideo | undefined;
    let canvas: OffscreenCanvas | undefined;
    let ctx: OffscreenCanvasRenderingContext2D | null = null;
    let prepKey = "";
    let lastDetectTs = -1;
    let firstFrame: RunSummary["firstFrame"];
    let decodeError: string | undefined;
    let wake: (() => void) | undefined;
    const results: FrameResult[] = [];
    const inferTimes: number[] = [];
    let lastProgress = 0;

    const processFrame = (frame: VideoFrame) => {
      const p = video!.probe;
      const tMs = frame.timestamp / 1000;
      firstFrame ??= { format: frame.format, colorSpace: JSON.stringify(frame.colorSpace.toJSON()) };
      let tp = performance.now();
      const key = `${frame.displayWidth}x${frame.displayHeight}`;
      if (key !== prepKey) {
        const scale = inferenceScale(p.displayWidth, p.displayHeight, options.inferenceLongEdge);
        const up = uprightTransform(p.orientation, frame.displayWidth, frame.displayHeight, scale);
        canvas = new OffscreenCanvas(up.width, up.height);
        ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) throw new PipelineError("decodeFailed", "2D OffscreenCanvas unavailable");
        ctx.setTransform(...up.transform);
        prepKey = key;
      }
      ctx!.drawImage(frame, 0, 0, frame.displayWidth, frame.displayHeight);
      frame.close();
      t.prepMs += performance.now() - tp;

      lastDetectTs = nextDetectTimestamp(tMs, lastDetectTs);
      tp = performance.now();
      const out = provider!.detect(canvas!, lastDetectTs);
      const dt = performance.now() - tp;
      t.inferMs += dt;
      inferTimes.push(dt);
      results.push({ tMs, pose: out.poses[0] });

      const now = performance.now();
      if (now - lastProgress > 100) {
        lastProgress = now;
        post({ type: "progress", done: results.length, total: p.frameCount });
      }
    };

    const drain = async (maxDecodeQueue: number) => {
      while (queue.length) processFrame(queue.shift()!);
      let stalledSince = performance.now();
      while (decoder && decoder.decodeQueueSize > maxDecodeQueue) {
        if (decodeError) throw new PipelineError("decodeFailed", decodeError);
        if (performance.now() - stalledSince > 10_000) throw new PipelineError("decodeFailed", "decoder stalled");
        const tw = performance.now();
        await new Promise<void>((resolve) => {
          wake = resolve;
          setTimeout(resolve, 20);
        });
        t.decodeWaitMs += performance.now() - tw;
        if (queue.length) stalledSince = performance.now();
        while (queue.length) processFrame(queue.shift()!);
      }
      // Yield so control messages (cancel) are delivered between batches.
      await new Promise((r) => setTimeout(r, 0));
    };

    await demux(file, {
      isCancelled: () => cancelled,
      addReadTime: (ms) => {
        t.readMs += ms;
      },
      onReady: async (v) => {
        video = v;
        post({ type: "probe", probe: v.probe });
        const support = await VideoDecoder.isConfigSupported(v.config).catch(() => ({ supported: false }));
        if (!support.supported) throw new PipelineError("codecUnsupported", v.config.codec);
        decoder = new VideoDecoder({
          output: (frame) => {
            queue.push(frame);
            wake?.();
          },
          error: (err) => {
            decodeError = err.message;
            wake?.();
          },
        });
        decoder.configure(v.config);
        post({ type: "stage", stage: "analyze" });
      },
      onChunks: async (chunks) => {
        for (const chunk of chunks) {
          if (cancelled) throw new PipelineError("cancelled", "cancelled");
          if (decodeError) throw new PipelineError("decodeFailed", decodeError);
          decoder!.decode(chunk);
          if (decoder!.decodeQueueSize > 6 || queue.length > 2) await drain(3);
        }
        await drain(6);
      },
    });
    if (!video || !decoder) throw new PipelineError("noVideoTrack", "no video");
    const tf = performance.now();
    await decoder.flush();
    t.decodeWaitMs += performance.now() - tf;
    while (queue.length) processFrame(queue.shift()!);
    if (decodeError) throw new PipelineError("decodeFailed", decodeError);
    if (results.length === 0) throw new PipelineError("decodeFailed", "decoder produced no frames");
    post({ type: "progress", done: results.length, total: results.length });

    post({ type: "stage", stage: "save" });
    let te = performance.now();
    results.sort((a, b) => a.tMs - b.tMs);
    // PTRK requires strictly increasing timestamps; drop exact duplicates the container may produce.
    const unique = results.filter((r, i) => i === 0 || r.tMs > (results[i - 1] as FrameResult).tMs);
    const track = buildRawTrack(unique, video, provider, await videoHash, options);
    const ptrkGz = await writePtrkFile(track);
    const rawPtrkSha256 = await sha256Hex(ptrkGz);
    const recipe = {
      schema: "recipe/1",
      input: { videoSha256: track.header.video.sha256, rawPtrkSha256 },
      inference: {
        providerId: provider.id,
        modelSha256: provider.modelSha256,
        delegate: provider.delegate,
        segments: track.header.inferenceSegments,
        inferenceLongEdge: options.inferenceLongEdge,
        frameStride: 1,
        numPoses: 1,
        roi: null,
      },
      coordinates: {
        rotation: video.probe.rotation,
        orientation: video.probe.orientation,
        displayWidth: video.probe.displayWidth,
        displayHeight: video.probe.displayHeight,
      },
      timeMap: track.header.timeMap,
      target: track.header.target,
      postprocess: null,
      analysis: null,
    };
    const hash = await recipeHash(recipe);
    const manifest = {
      schema: "manifest/1",
      analysisId,
      createdAt: track.header.createdAt,
      app: { build: import.meta.env.MODE },
      recipe,
      recipeHash: hash,
    };
    t.encodeMs = performance.now() - te;

    te = performance.now();
    const ptrkPath = await writeOpfsFile(analysisId, "raw.ptrk.gz", ptrkGz);
    // Manifest last: its presence marks the analysis as complete (02 §12).
    await writeOpfsFile(analysisId, "manifest.json", new TextEncoder().encode(JSON.stringify(manifest, null, 2)));
    t.saveMs = performance.now() - te;

    const sorted = [...inferTimes].sort((a, b) => a - b);
    t.inferP50Ms = percentile(sorted, 50);
    t.inferP95Ms = percentile(sorted, 95);
    t.totalMs = performance.now() - tStart;

    const summary: RunSummary = {
      analysisId,
      options,
      videoSha256: track.header.video.sha256,
      probe: video.probe,
      inferenceSize: { width: canvas?.width ?? 0, height: canvas?.height ?? 0 },
      providerId: provider.id,
      delegate: provider.delegate,
      ...(created.gpuError && { gpuError: created.gpuError }),
      modelSha256: provider.modelSha256,
      ...(firstFrame && { firstFrame }),
      framesDecoded: results.length,
      framesWithPose: unique.filter((r) => r.pose).length,
      ptrkBytes: ptrkGz.length,
      recipeHash: hash,
      opfsPath: ptrkPath,
      timings: t,
    };
    const transfer = [track.timestamps.buffer, track.flags.buffer, track.kpState.buffer, track.image.buffer];
    if (track.world) transfer.push(track.world.buffer);
    if (track.presence) transfer.push(track.presence.buffer);
    post({ type: "done", summary, track }, transfer);
  } catch (err) {
    for (const f of queue) f.close();
    await removeAnalysis(analysisId);
    const code: ErrorCode =
      err instanceof PipelineError ? err.code : ((err as { code?: ErrorCode }).code ?? "unknown");
    post({ type: "error", code, detail: err instanceof Error ? err.message : String(err) });
  } finally {
    if (decoder && decoder.state !== "closed") decoder.close();
    provider?.dispose();
  }
}

function buildRawTrack(
  results: FrameResult[],
  video: DemuxedVideo,
  provider: PoseProvider<TexImageSource>,
  videoSha256: string,
  options: PipelineOptions,
): PtrkTrack {
  const k = MEDIAPIPE_POSE_33.length;
  const f = results.length;
  const { displayWidth: W, displayHeight: H } = video.probe;
  const timestamps = new Float64Array(f);
  const flags = new Uint8Array(f);
  const kpState = new Uint8Array(f * k).fill(KP_STATE.missing);
  const image = new Int16Array(f * k * 4).fill(PTRK_MISSING);
  const world = new Int16Array(f * k * 4).fill(PTRK_MISSING);
  const hasPresence = results.some((r) => r.pose?.presence);
  const presence = hasPresence ? new Int16Array(f * k).fill(PTRK_MISSING) : undefined;
  const cpu = provider.delegate === "CPU" ? FRAME_FLAG.cpuFallback : 0;

  results.forEach((r, i) => {
    timestamps[i] = r.tMs;
    flags[i] = cpu;
    const pose = r.pose;
    if (!pose) return;
    flags[i] |= FRAME_FLAG.detected;
    for (let j = 0; j < k; j++) {
      const o = (i * k + j) * 4;
      const x = pose.image[j * 4] as number;
      if (!Number.isFinite(x)) continue;
      // Raw stage: every point the model returned is "observed"; visibility gating happens in post-processing.
      kpState[i * k + j] = KP_STATE.observed;
      image[o] = quantPx(x * W);
      image[o + 1] = quantPx((pose.image[j * 4 + 1] as number) * H);
      image[o + 2] = quantPx((pose.image[j * 4 + 2] as number) * W);
      image[o + 3] = quantUnit(pose.image[j * 4 + 3] as number);
      if (pose.world) {
        world[o] = quantMm(pose.world[j * 4] as number);
        world[o + 1] = quantMm(pose.world[j * 4 + 1] as number);
        world[o + 2] = quantMm(pose.world[j * 4 + 2] as number);
        world[o + 3] = quantUnit(pose.world[j * 4 + 3] as number);
      }
      if (presence && pose.presence) presence[i * k + j] = quantUnit(pose.presence[j] as number);
    }
  });

  const first = timestamps[0] ?? 0;
  const last = timestamps[f - 1] ?? 0;
  const header: PtrkHeader = {
    schema: "ptrk/1",
    skeleton: "mediapipe-pose/33",
    canonicalMap: "canonical/1",
    keypoints: [...MEDIAPIPE_POSE_33],
    frames: f,
    video: {
      sha256: videoSha256,
      durationMs: video.probe.durationMs,
      fps: video.probe.fps,
      displayWidth: W,
      displayHeight: H,
      rotation: video.probe.rotation,
      codec: video.probe.codec,
      hdr: video.probe.hdr,
    },
    provider: { id: provider.id, modelSha256: provider.modelSha256, delegate: provider.delegate },
    hasWorld: true,
    hasPresence,
    timeMap: { source: video.probe.timeTrusted ? "identity" : "unknown", trusted: video.probe.timeTrusted },
    inferenceSegments: [{ fromMs: first, toMs: last, delegate: provider.delegate }],
    processing: { stage: "raw", inferenceLongEdge: options.inferenceLongEdge, frameStride: 1 },
    target: { personTrackId: 0, selection: "auto-single", revisions: [] },
    createdAt: new Date().toISOString(),
  };
  return { header, timestamps, flags, kpState, image, world, ...(presence && { presence }) };
}
