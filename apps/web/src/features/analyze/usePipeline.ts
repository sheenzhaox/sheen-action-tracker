import { useCallback, useEffect, useRef, useState } from "react";
import type { PtrkTrack } from "@action-tracker/pose-core/io";
import type { ErrorCode, FromWorker, PipelineOptions, ProbeInfo, RunSummary, Stage, ToWorker } from "@/pipeline/protocol";
import { REFERENCE_SETTING } from "@/pipeline/assets";
import { compareTracks, loadReferenceTrack, type TrackDiff } from "./compare";

export type Comparison =
  | { status: "pending" }
  | { status: "self" }
  | { status: "none" }
  | { status: "done"; diff: TrackDiff | null };

export type PipelineState =
  | { status: "idle" }
  | { status: "running"; stage: Stage; probe?: ProbeInfo; done: number; total: number }
  | { status: "done"; summary: RunSummary; track: PtrkTrack; file: File; comparison: Comparison }
  | { status: "error"; code: ErrorCode; detail: string };

export const DEFAULT_OPTIONS: PipelineOptions = {
  model: REFERENCE_SETTING.model,
  delegate: "GPU",
  inferenceLongEdge: REFERENCE_SETTING.inferenceLongEdge,
};

const isReference = (o: PipelineOptions) =>
  o.model === REFERENCE_SETTING.model && o.inferenceLongEdge === REFERENCE_SETTING.inferenceLongEdge;

async function compareWithReference(summary: RunSummary, track: PtrkTrack): Promise<Comparison> {
  if (isReference(summary.options)) return { status: "self" };
  const ref = await loadReferenceTrack(summary.videoSha256, summary.analysisId);
  if (!ref) return { status: "none" };
  return { status: "done", diff: compareTracks(track, ref) };
}

type WakeLockSentinelLike = { release(): Promise<void> };

export function usePipeline() {
  const [state, setState] = useState<PipelineState>({ status: "idle" });
  const workers = useRef<Worker[]>([]);
  const pipeline = useRef<Worker | null>(null);
  const wakeLock = useRef<WakeLockSentinelLike | null>(null);

  const stop = useCallback(() => {
    for (const w of workers.current) w.terminate();
    workers.current = [];
    pipeline.current = null;
    void wakeLock.current?.release().catch(() => undefined);
    wakeLock.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(
    (file: File, options: PipelineOptions = DEFAULT_OPTIONS) => {
      stop();
      setState({ status: "running", stage: "loadModel", done: 0, total: 0 });
      const wl = (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<WakeLockSentinelLike> } })
        .wakeLock;
      wl?.request("screen")
        .then((s) => {
          wakeLock.current = s;
        })
        .catch(() => undefined);

      const pipe = new Worker(new URL("../../pipeline/pipeline.worker.ts", import.meta.url), { type: "module" });
      const hasher = new Worker(new URL("../../pipeline/hash.worker.ts", import.meta.url), { type: "module" });
      workers.current = [pipe, hasher];
      pipeline.current = pipe;
      const send = (msg: ToWorker) => pipe.postMessage(msg);

      hasher.onmessage = (e: MessageEvent<{ sha256?: string }>) => {
        send({ type: "videoHash", sha256: e.data.sha256 ?? "unknown" });
        hasher.terminate();
      };
      hasher.postMessage({ file });

      pipe.onmessage = (e: MessageEvent<FromWorker>) => {
        const msg = e.data;
        setState((s): PipelineState => {
          switch (msg.type) {
            case "stage":
              return s.status === "running" ? { ...s, stage: msg.stage } : s;
            case "probe":
              return s.status === "running" ? { ...s, probe: msg.probe, total: msg.probe.frameCount } : s;
            case "progress":
              return s.status === "running" ? { ...s, done: msg.done, total: msg.total } : s;
            case "done":
              return { status: "done", summary: msg.summary, track: msg.track, file, comparison: { status: "pending" } };
            case "error":
              return { status: "error", code: msg.code, detail: msg.detail };
          }
        });
        if (msg.type === "done") {
          void compareWithReference(msg.summary, msg.track).then((comparison) =>
            setState((s) => (s.status === "done" && s.summary.analysisId === msg.summary.analysisId ? { ...s, comparison } : s)),
          );
        }
        if (msg.type === "done" || msg.type === "error") stop();
      };
      pipe.onerror = (e) => {
        setState({ status: "error", code: "unknown", detail: e.message || "worker failed to start" });
        stop();
      };
      send({ type: "start", file, options });
    },
    [stop],
  );

  const cancel = useCallback(() => pipeline.current?.postMessage({ type: "cancel" } satisfies ToWorker), []);
  const reset = useCallback(() => {
    stop();
    setState({ status: "idle" });
  }, [stop]);

  return { state, start, cancel, reset };
}
