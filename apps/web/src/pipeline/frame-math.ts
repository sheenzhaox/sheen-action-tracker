/** Pure helpers for probing and frame preparation (02 §2–§4); unit-tested. */

/** tkhd matrix (9 entries, 16.16 fixed point for a/b/c/d) -> normalised orientation and degrees. */
export function orientationFromMatrix(matrix: ArrayLike<number>): {
  orientation: [number, number, number, number];
  rotation: number;
} {
  const norm = (v: number | undefined) => Math.round((v ?? 0) / 65536);
  const a = norm(matrix[0]);
  const b = norm(matrix[1]);
  const c = norm(matrix[3]);
  const d = norm(matrix[4]);
  if (Math.abs(a * d - b * c) !== 1) return { orientation: [1, 0, 0, 1], rotation: 0 };
  const deg = Math.round((Math.atan2(b, a) * 180) / Math.PI);
  return { orientation: [a, b, c, d], rotation: ((deg % 360) + 360) % 360 };
}

/**
 * Canvas transform that draws a frame of size (w, h) upright and scaled by `scale`.
 * Maps (x, y) -> (a x + c y + e, b x + d y + f) like CanvasRenderingContext2D.setTransform.
 */
export function uprightTransform(
  orientation: readonly [number, number, number, number],
  w: number,
  h: number,
  scale: number,
): { transform: [number, number, number, number, number, number]; width: number; height: number } {
  const [a, b, c, d] = orientation.map((v) => v * scale) as [number, number, number, number];
  const xs = [0, a * w, c * h, a * w + c * h];
  const ys = [0, b * w, d * h, b * w + d * h];
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    transform: [a, b, c, d, -minX, -minY],
    width: Math.round(Math.max(...xs) - minX),
    height: Math.round(Math.max(...ys) - minY),
  };
}

/** Scale so the long edge is at most `longEdge` (never upscales). */
export function inferenceScale(displayW: number, displayH: number, longEdge: number): number {
  return Math.min(1, longEdge / Math.max(displayW, displayH));
}

export interface EditEntry {
  segment_duration: number;
  media_time: number;
  media_rate_integer: number;
  media_rate_fraction: number;
}

/**
 * Time-map trust (02 §3): slow motion (≥ 100 fps) or edit lists that change rate make real
 * time unknown. Returns the media-time offset of the first non-empty edit (track timescale).
 */
export function timeModel(fps: number, edits: readonly EditEntry[] | undefined) {
  const playable = (edits ?? []).filter((e) => e.media_time >= 0);
  const offset = playable[0]?.media_time ?? 0;
  const rateChange = playable.some((e) => e.media_rate_integer !== 1 || e.media_rate_fraction !== 0);
  if (fps >= 100) return { offset, trusted: false, note: `high frame rate ${fps.toFixed(2)} fps` };
  if (rateChange) return { offset, trusted: false, note: "edit list changes playback rate" };
  if (playable.length > 1) return { offset, trusted: false, note: "multiple edit segments" };
  return { offset, trusted: true };
}

/** ISO/IEC 23091-2 transfer characteristics: 18 = HLG, 16 = PQ. */
export function hdrFromColr(transfer: number | undefined): "none" | "hlg" | "pq" | "unknown" {
  if (transfer === undefined) return "unknown";
  if (transfer === 18) return "hlg";
  if (transfer === 16) return "pq";
  return "none";
}

export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i] as number;
}

/** Strictly increasing integer ms for MediaPipe VIDEO mode (02 §3). */
export function nextDetectTimestamp(tPlayMs: number, previous: number): number {
  return Math.max(previous + 1, Math.round(tPlayMs));
}
