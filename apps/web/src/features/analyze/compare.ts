import { KP_STATE, PTRK_MISSING, type PtrkTrack } from "@action-tracker/pose-core/io";
import { REFERENCE_SETTING } from "@/pipeline/assets";
import { findAnalysis, loadTrack } from "@/storage/analyses";

/** Body joints used for accuracy comparisons (face points excluded). */
export const COMPARE_JOINTS = [
  "nose",
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
] as const;

export interface TrackDiff {
  framesCompared: number;
  pointsCompared: number;
  meanPx: number;
  p95Px: number;
  /** Mean difference as % of the display height. */
  meanPct: number;
}

/**
 * Per-joint image-space distance between two tracks of the same video, matching frames by
 * timestamp (within half a frame). Only points observed in both tracks are compared.
 */
export function compareTracks(a: PtrkTrack, b: PtrkTrack): TrackDiff | null {
  const ka = a.header.keypoints.length;
  const kb = b.header.keypoints.length;
  const ia = new Map(a.header.keypoints.map((n, j) => [n, j]));
  const ib = new Map(b.header.keypoints.map((n, j) => [n, j]));
  const joints = COMPARE_JOINTS.map((n) => [ia.get(n), ib.get(n)] as const).filter(
    (p): p is readonly [number, number] => p[0] !== undefined && p[1] !== undefined,
  );
  const n = b.timestamps.length;
  const step = n > 1 ? ((b.timestamps[n - 1] as number) - (b.timestamps[0] as number)) / (n - 1) : 0;
  const tol = step > 0 ? step / 2 : 1;

  const dists: number[] = [];
  let frames = 0;
  let jb = 0;
  for (let i = 0; i < a.timestamps.length; i++) {
    const t = a.timestamps[i] as number;
    while (jb + 1 < n && Math.abs((b.timestamps[jb + 1] as number) - t) <= Math.abs((b.timestamps[jb] as number) - t)) {
      jb++;
    }
    if (n === 0 || Math.abs((b.timestamps[jb] as number) - t) > tol) continue;
    let used = false;
    for (const [ja, jbk] of joints) {
      if (a.kpState[i * ka + ja] !== KP_STATE.observed || b.kpState[jb * kb + jbk] !== KP_STATE.observed) continue;
      const oa = (i * ka + ja) * 4;
      const ob = (jb * kb + jbk) * 4;
      const ax = a.image[oa] as number;
      const ay = a.image[oa + 1] as number;
      const bx = b.image[ob] as number;
      const by = b.image[ob + 1] as number;
      if (ax === PTRK_MISSING || ay === PTRK_MISSING || bx === PTRK_MISSING || by === PTRK_MISSING) continue;
      dists.push(Math.hypot(ax - bx, ay - by) / 4);
      used = true;
    }
    if (used) frames++;
  }
  if (dists.length === 0) return null;
  const mean = dists.reduce((s, d) => s + d, 0) / dists.length;
  const sorted = dists.sort((x, y) => x - y);
  return {
    framesCompared: frames,
    pointsCompared: sorted.length,
    meanPx: mean,
    p95Px: sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)] as number,
    meanPct: (mean / a.header.video.displayHeight) * 100,
  };
}

/** Latest Full · 1280 analysis of the same video on this device (IndexedDB), if any. */
export async function loadReferenceTrack(videoSha256: string, excludeId: string): Promise<PtrkTrack | null> {
  try {
    const ref = await findAnalysis(videoSha256, REFERENCE_SETTING, excludeId);
    return ref ? await loadTrack(ref.id) : null;
  } catch {
    return null;
  }
}