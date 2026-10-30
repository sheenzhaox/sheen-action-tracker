import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { FRAME_FLAG, MEDIAPIPE_POSE_33, type PtrkHeader } from "@action-tracker/pose-core/io";
import { DB_NAME } from "./idb";
import {
  commitAnalysis,
  deleteAnalysis,
  findAnalysis,
  getAnalysis,
  listAnalyses,
  modelFromProvider,
  recordsFromTrack,
  videoKey,
} from "./analyses";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

function header(sha: string, model = "full", longEdge = 1280): PtrkHeader {
  return {
    schema: "ptrk/1",
    skeleton: "mediapipe-pose/33",
    canonicalMap: "canonical/1",
    keypoints: [...MEDIAPIPE_POSE_33],
    frames: 3,
    video: {
      sha256: sha,
      durationMs: 7718,
      fps: 59.97,
      displayWidth: 2160,
      displayHeight: 3840,
      rotation: 90,
      codec: "hvc1.2.4.L153.B0",
      hdr: "hlg",
    },
    provider: { id: `mediapipe.pose_landmarker_${model}@tasks-vision-1.2.0`, modelSha256: "f".repeat(64), delegate: "GPU" },
    hasWorld: true,
    hasPresence: true,
    timeMap: { source: "identity", trusted: true },
    inferenceSegments: [],
    processing: { stage: "raw", inferenceLongEdge: longEdge, frameStride: 1 },
    target: { personTrackId: 0, selection: "auto-single", revisions: [] },
    createdAt: "2026-10-30T00:00:00.000Z",
  };
}

const flags = Uint8Array.from([FRAME_FLAG.detected, 0, FRAME_FLAG.detected | FRAME_FLAG.cpuFallback]);

async function add(id: string, sha: string, createdAt: string, model = "full", longEdge = 1280) {
  const r = recordsFromTrack({
    id,
    header: header(sha, model, longEdge),
    flags,
    createdAt,
    recipeHash: "r".repeat(64),
    ptrkBytes: 1000,
    fileName: `${id}.mov`,
  });
  await commitAnalysis(r.analysis, r.recording);
}

async function recordingCount(): Promise<number> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const n = await new Promise<number>((resolve) => {
    const req = db.transaction("recordings").objectStore("recordings").count();
    req.onsuccess = () => resolve(req.result);
  });
  db.close();
  return n;
}

describe("records from a PTRK header", () => {
  it("summarises the video, setting and detected frames", () => {
    const { analysis, recording } = recordsFromTrack({
      id: "x",
      header: header(SHA_A, "lite", 720),
      flags,
      createdAt: "2026-10-30T01:00:00.000Z",
      recipeHash: "h",
      ptrkBytes: 42,
      fileName: "sample1.MOV",
    });
    expect(analysis).toMatchObject({
      model: "lite",
      inferenceLongEdge: 720,
      frames: 3,
      framesWithPose: 2,
      timeTrusted: true,
      video: { width: 2160, height: 3840, rotation: 90, hdr: "hlg" },
    });
    expect(analysis.summary).toBeUndefined();
    expect(recording).toMatchObject({ videoSha256: SHA_A, fileName: "sample1.MOV", fps: 59.97 });
  });

  it("never merges videos whose hash is unknown", () => {
    expect(videoKey(SHA_A, "id1")).toBe(SHA_A);
    expect(videoKey("unknown", "id1")).toBe("unknown:id1");
    expect(videoKey("unknown", "id2")).not.toBe(videoKey("unknown", "id1"));
    expect(modelFromProvider("mediapipe.pose_landmarker_heavy@tasks-vision-1.2.0")).toBe("heavy");
  });
});

describe("IndexedDB analysis store", () => {
  beforeEach(async () => {
    for (const a of await listAnalyses()) await deleteAnalysis(a.id);
  });

  it("lists newest first and reuses one recording per video", async () => {
    await add("a1", SHA_A, "2026-10-30T01:00:00.000Z");
    await add("a2", SHA_A, "2026-10-30T02:00:00.000Z", "lite", 720);
    await add("b1", SHA_B, "2026-10-30T03:00:00.000Z");
    expect((await listAnalyses()).map((a) => a.id)).toEqual(["b1", "a2", "a1"]);
    const [a1, a2] = [await getAnalysis("a1"), await getAnalysis("a2")];
    expect(a1?.recordingId).toBe(a2?.recordingId);
    expect(await recordingCount()).toBe(2);
  });

  it("finds the latest reference run of the same video, excluding the current one", async () => {
    await add("old", SHA_A, "2026-10-30T01:00:00.000Z");
    await add("new", SHA_A, "2026-10-30T02:00:00.000Z");
    await add("lite", SHA_A, "2026-10-30T03:00:00.000Z", "lite", 1280);
    await add("other", SHA_B, "2026-10-30T04:00:00.000Z");
    const ref = { model: "full", inferenceLongEdge: 1280 };
    expect((await findAnalysis(SHA_A, ref, "lite"))?.id).toBe("new");
    expect((await findAnalysis(SHA_A, ref, "new"))?.id).toBe("old");
    expect(await findAnalysis(SHA_B, { model: "lite", inferenceLongEdge: 1280 }, "x")).toBeUndefined();
  });

  it("deletes the recording only with its last analysis", async () => {
    await add("a1", SHA_A, "2026-10-30T01:00:00.000Z");
    await add("a2", SHA_A, "2026-10-30T02:00:00.000Z");
    await deleteAnalysis("a1");
    expect(await recordingCount()).toBe(1);
    await deleteAnalysis("a2");
    expect(await recordingCount()).toBe(0);
    expect(await listAnalyses()).toEqual([]);
    await expect(deleteAnalysis("does-not-exist")).resolves.toBeUndefined();
  });
});
