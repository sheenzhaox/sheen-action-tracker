import { FRAME_FLAG, readPtrkFile, type PtrkHeader, type PtrkTrack } from "@action-tracker/pose-core/io";
import type { RunSummary } from "../pipeline/protocol.ts";
import { STORE, openDb, request, transactionDone } from "./idb.ts";

/**
 * Local analysis store (designs/02 §12, 04 §6). OPFS holds the files under `analyses/<id>/`;
 * the IndexedDB record is the commit marker. A folder without a record is either recovered
 * (complete manifest + valid PTRK, e.g. a crash between the two writes) or deleted at startup.
 */

export interface RecordingRecord {
  id: string;
  videoSha256: string;
  fileName: string;
  durationMs: number;
  fps: number;
  width: number;
  height: number;
  rotation: number;
  codec: string;
  hdr: string;
  createdAt: string;
}

export interface AnalysisRecord {
  id: string;
  recordingId: string;
  videoSha256: string;
  createdAt: string;
  kind: "skeleton";
  status: "complete";
  syncState: "local";
  fileName: string;
  video: { durationMs: number; fps: number; width: number; height: number; rotation: number; codec: string; hdr: string };
  providerId: string;
  model: string;
  delegate: "GPU" | "CPU";
  inferenceLongEdge: number;
  frames: number;
  framesWithPose: number;
  timeTrusted: boolean;
  recipeHash: string;
  ptrkBytes: number;
  /** Full run report; absent for analyses recovered from files written before it was stored. */
  summary?: RunSummary;
  recovered?: boolean;
}

export type NewAnalysis = Omit<AnalysisRecord, "recordingId">;
export type NewRecording = Omit<RecordingRecord, "id">;

export const PTRK_FILE = "raw.ptrk.gz";
export const MANIFEST_FILE = "manifest.json";
export const lockName = (analysisId: string) => `action-tracker:analysis:${analysisId}`;

/** Video identity used for de-duplication; an unknown hash never merges different videos. */
export const videoKey = (sha256: string, analysisId: string) =>
  /^[0-9a-f]{64}$/.test(sha256) ? sha256 : `unknown:${analysisId}`;

export const modelFromProvider = (providerId: string) => /pose_landmarker_(\w+)@/.exec(providerId)?.[1] ?? "unknown";

/** Builds both records from a PTRK header; shared by the pipeline and recovery so they agree. */
export function recordsFromTrack(args: {
  id: string;
  header: PtrkHeader;
  flags: Uint8Array;
  createdAt: string;
  recipeHash: string;
  ptrkBytes: number;
  fileName: string;
  summary?: RunSummary;
  recovered?: boolean;
}): { analysis: NewAnalysis; recording: NewRecording } {
  const { header: h } = args;
  const v = h.video;
  const video = {
    durationMs: v.durationMs,
    fps: v.fps,
    width: v.displayWidth,
    height: v.displayHeight,
    rotation: v.rotation,
    codec: v.codec,
    hdr: v.hdr,
  };
  const videoSha256 = videoKey(v.sha256, args.id);
  let framesWithPose = 0;
  for (const f of args.flags) if (f & FRAME_FLAG.detected) framesWithPose++;
  return {
    analysis: {
      id: args.id,
      videoSha256,
      createdAt: args.createdAt,
      kind: "skeleton",
      status: "complete",
      syncState: "local",
      fileName: args.fileName,
      video,
      providerId: h.provider.id,
      model: modelFromProvider(h.provider.id),
      delegate: h.provider.delegate,
      inferenceLongEdge: h.processing.inferenceLongEdge,
      frames: h.frames,
      framesWithPose,
      timeTrusted: h.timeMap.trusted,
      recipeHash: args.recipeHash,
      ptrkBytes: args.ptrkBytes,
      ...(args.summary && { summary: args.summary }),
      ...(args.recovered && { recovered: true }),
    },
    recording: { videoSha256, fileName: args.fileName, ...video, createdAt: args.createdAt },
  };
}

/** Adds the analysis and, if this video is new, its recording — in one transaction. */
export async function commitAnalysis(analysis: NewAnalysis, recording: NewRecording): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([STORE.recordings, STORE.analyses], "readwrite");
  const done = transactionDone(tx);
  const recordings = tx.objectStore(STORE.recordings);
  const lookup = recordings.index("videoSha256").get(recording.videoSha256);
  lookup.onsuccess = () => {
    const existing = lookup.result as RecordingRecord | undefined;
    const recordingId = existing?.id ?? crypto.randomUUID();
    if (!existing) recordings.add({ ...recording, id: recordingId } satisfies RecordingRecord);
    tx.objectStore(STORE.analyses).put({ ...analysis, recordingId } satisfies AnalysisRecord);
  };
  await done;
}

export async function listAnalyses(): Promise<AnalysisRecord[]> {
  const db = await openDb();
  const all = (await request(db.transaction(STORE.analyses).objectStore(STORE.analyses).getAll())) as AnalysisRecord[];
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAnalysis(id: string): Promise<AnalysisRecord | undefined> {
  const db = await openDb();
  return (await request(db.transaction(STORE.analyses).objectStore(STORE.analyses).get(id))) as
    | AnalysisRecord
    | undefined;
}

/** Latest analysis of the same video with the given setting, excluding one id. */
export async function findAnalysis(
  videoSha256: string,
  match: { model: string; inferenceLongEdge: number },
  excludeId: string,
): Promise<AnalysisRecord | undefined> {
  const db = await openDb();
  const same = (await request(
    db.transaction(STORE.analyses).objectStore(STORE.analyses).index("videoSha256").getAll(videoSha256),
  )) as AnalysisRecord[];
  return same
    .filter((a) => a.id !== excludeId && a.model === match.model && a.inferenceLongEdge === match.inferenceLongEdge)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/** Files first, then records: a failed file delete leaves a record the user can delete again. */
export async function deleteAnalysis(id: string): Promise<void> {
  await removeAnalysisDir(id);
  const db = await openDb();
  const tx = db.transaction([STORE.recordings, STORE.analyses], "readwrite");
  const done = transactionDone(tx);
  const analyses = tx.objectStore(STORE.analyses);
  const get = analyses.get(id);
  get.onsuccess = () => {
    const rec = get.result as AnalysisRecord | undefined;
    if (!rec) return;
    analyses.delete(id);
    const count = analyses.index("recordingId").count(rec.recordingId);
    count.onsuccess = () => {
      if (count.result === 0) tx.objectStore(STORE.recordings).delete(rec.recordingId);
    };
  };
  await done;
}

// ---- OPFS (async API: available on the main thread and in workers) ----

async function analysesRoot(create: boolean): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle("analyses", { create });
  } catch {
    return null;
  }
}

export async function readAnalysisFile(id: string, name: string): Promise<Uint8Array | null> {
  try {
    const dir = await (await analysesRoot(false))?.getDirectoryHandle(id);
    if (!dir) return null;
    const file = await (await dir.getFileHandle(name)).getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

export async function loadTrack(id: string): Promise<PtrkTrack | null> {
  const bytes = await readAnalysisFile(id, PTRK_FILE);
  return bytes ? readPtrkFile(bytes) : null;
}

export async function removeAnalysisDir(id: string): Promise<void> {
  const root = await analysesRoot(false);
  try {
    await root?.removeEntry(id, { recursive: true });
  } catch (e) {
    if ((e as DOMException).name !== "NotFoundError") throw e;
  }
}

async function listAnalysisDirs(): Promise<string[]> {
  const root = await analysesRoot(false);
  if (!root) return [];
  const names: string[] = [];
  for await (const [name, handle] of root as unknown as AsyncIterable<[string, FileSystemHandle]>) {
    if (handle.kind === "directory") names.push(name);
  }
  return names;
}

interface StoredManifest {
  schema?: string;
  analysisId?: string;
  createdAt?: string;
  recipeHash?: string;
  source?: { fileName?: string };
  run?: RunSummary;
}

async function recover(id: string): Promise<{ analysis: NewAnalysis; recording: NewRecording } | null> {
  try {
    const mBytes = await readAnalysisFile(id, MANIFEST_FILE);
    const pBytes = await readAnalysisFile(id, PTRK_FILE);
    if (!mBytes || !pBytes) return null;
    const m = JSON.parse(new TextDecoder().decode(mBytes)) as StoredManifest;
    if (m.schema !== "manifest/1" || m.analysisId !== id || !m.createdAt || !m.recipeHash) return null;
    const track = await readPtrkFile(pBytes);
    return recordsFromTrack({
      id,
      header: track.header,
      flags: track.flags,
      createdAt: m.createdAt,
      recipeHash: m.recipeHash,
      ptrkBytes: pBytes.length,
      fileName: m.source?.fileName ?? "Recovered analysis",
      ...(m.run && { summary: m.run }),
      recovered: true,
    });
  } catch {
    return null;
  }
}

export interface ReconcileResult {
  recovered: number;
  removed: number;
  /** Records whose pose file is gone (storage cleared by the OS); can only be deleted. */
  missing: Set<string>;
}

/**
 * Brings OPFS and IndexedDB back in line (02 §12). Folders of analyses still running in any tab
 * hold a Web Lock and are skipped.
 */
export async function reconcileStorage(): Promise<ReconcileResult> {
  const result: ReconcileResult = { recovered: 0, removed: 0, missing: new Set() };
  const db = await openDb();
  const ids = new Set(
    (await request(db.transaction(STORE.analyses).objectStore(STORE.analyses).getAllKeys())) as string[],
  );
  const held = new Set(
    navigator.locks ? ((await navigator.locks.query()).held ?? []).map((l) => l.name ?? "") : [],
  );
  const dirs = await listAnalysisDirs();
  for (const name of dirs) {
    if (ids.has(name) || held.has(lockName(name))) continue;
    const records = await recover(name);
    if (records) {
      await commitAnalysis(records.analysis, records.recording);
      result.recovered++;
    } else {
      await removeAnalysisDir(name);
      result.removed++;
    }
  }
  const dirSet = new Set(dirs);
  for (const id of ids) if (!dirSet.has(id)) result.missing.add(id);
  return result;
}

/** Ask the browser not to evict our data under storage pressure (04 §6). Window-only API. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    const storage = navigator.storage as StorageManager & { persist?: () => Promise<boolean> };
    if (!storage.persist) return false;
    return await storage.persist();
  } catch {
    return false;
  }
}
