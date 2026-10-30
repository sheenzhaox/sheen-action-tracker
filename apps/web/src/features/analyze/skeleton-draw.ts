import { BODY_BONES, BODY_JOINTS } from "@action-tracker/pose-core";
import { KP_STATE, PTRK_MISSING, type PtrkTrack } from "@action-tracker/pose-core/io";

/** Display-only gate: below this the joint is drawn hollow and its bones dashed (MASTER §3.3). */
export const LOW_VISIBILITY = 0.5;

export interface SkeletonColors {
  bone: string;
  left: string;
  right: string;
  center: string;
  halo: string;
}

export function readSkeletonColors(el: Element = document.documentElement): SkeletonColors {
  const css = getComputedStyle(el);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    bone: v("--skel-bone", "rgb(255 255 255 / 0.92)"),
    left: v("--skel-left", "#22d3ee"),
    right: v("--skel-right", "#f97316"),
    center: v("--skel-center", "#f8fafc"),
    halo: v("--skel-halo", "rgb(0 0 0 / 0.75)"),
  };
}

interface Pt {
  x: number;
  y: number;
  low: boolean;
}

/** Torso length (shoulder→hip, CSS px) at which the overlay reaches its full MASTER §3.3 size. */
export const FULL_SIZE_TORSO_PX = 80;
export const MIN_SKELETON_SCALE = 0.35;

/** Overlay size factor from the on-screen torso length, so joints never swamp a small figure. */
export function skeletonScale(torsoCssPx: number | null): number {
  if (torsoCssPx === null || !Number.isFinite(torsoCssPx) || torsoCssPx <= 0) return 1;
  return Math.min(1, Math.max(MIN_SKELETON_SCALE, torsoCssPx / FULL_SIZE_TORSO_PX));
}

/** Stroke and radius sizes in device pixels for a given scale (MASTER §3.3 at s = 1). */
export function overlaySizes(s: number, dpr: number) {
  return {
    radius: 4 * s * dpr,
    halo: Math.max(1, 1.5 * s) * dpr,
    bone: 3 * s * dpr,
    boneHalo: (3 * s + 2 * Math.max(0.5, s)) * dpr,
    ring: Math.max(1, 1.5 * s) * dpr,
    dash: Math.max(2, 4 * s) * dpr,
  };
}

/** Mean shoulder→hip length over the visible sides; falls back to the joints' bounding box. */
function torsoLength(pts: Map<string, Pt>, dpr: number): number | null {
  const sides = (["left", "right"] as const)
    .map((side) => [pts.get(`${side}_shoulder`), pts.get(`${side}_hip`)] as const)
    .filter((p): p is readonly [Pt, Pt] => !!p[0] && !!p[1])
    .map(([a, b]) => Math.hypot(a.x - b.x, a.y - b.y));
  if (sides.length) return sides.reduce((a, b) => a + b, 0) / sides.length / dpr;
  if (pts.size < 3) return null;
  const ys = [...pts.values()].map((p) => p.y);
  // A standing adult's torso is roughly 30 % of the head-to-ankle extent.
  return ((Math.max(...ys) - Math.min(...ys)) * 0.3) / dpr;
}

export function makeSkeletonDrawer(track: PtrkTrack) {
  const k = track.header.keypoints.length;
  const index = new Map(track.header.keypoints.map((name, j) => [name, j]));
  const bones = BODY_BONES.map(([a, b]) => [index.get(a), index.get(b)] as const).filter(
    (p): p is readonly [number, number] => p[0] !== undefined && p[1] !== undefined,
  );
  const joints = BODY_JOINTS.map((name) => ({ j: index.get(name), name })).filter(
    (p): p is { j: number; name: (typeof BODY_JOINTS)[number] } => p.j !== undefined,
  );

  const point = (i: number, j: number, sx: number, sy: number): Pt | null => {
    if (track.kpState[i * k + j] !== KP_STATE.observed && track.kpState[i * k + j] !== KP_STATE.interpolated) {
      return null;
    }
    const o = (i * k + j) * 4;
    const x = track.image[o] as number;
    const y = track.image[o + 1] as number;
    if (x === PTRK_MISSING || y === PTRK_MISSING) return null;
    const vis = track.image[o + 3] as number;
    const interpolated = track.kpState[i * k + j] === KP_STATE.interpolated;
    return { x: (x / 4) * sx, y: (y / 4) * sy, low: interpolated || vis === PTRK_MISSING || vis / 10000 < LOW_VISIBILITY };
  };

  /** Draws frame i scaled from video display pixels to the canvas (device pixels). */
  return (ctx: CanvasRenderingContext2D, i: number, sx: number, sy: number, dpr: number, colors: SkeletonColors) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (i < 0 || i >= track.timestamps.length) return 0;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pts = new Map<number, Pt>();
    const named = new Map<string, Pt>();
    for (const { j, name } of joints) {
      const p = point(i, j, sx, sy);
      if (p) {
        pts.set(j, p);
        named.set(name, p);
      }
    }
    const size = overlaySizes(skeletonScale(torsoLength(named, dpr)), dpr);

    for (const pass of ["halo", "bone"] as const) {
      for (const [a, b] of bones) {
        const pa = pts.get(a);
        const pb = pts.get(b);
        if (!pa || !pb) continue;
        ctx.setLineDash(pa.low || pb.low ? [size.dash, size.dash] : []);
        ctx.strokeStyle = pass === "halo" ? colors.halo : colors.bone;
        ctx.lineWidth = pass === "halo" ? size.boneHalo : size.bone;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    for (const { j, name } of joints) {
      const p = pts.get(j);
      if (!p) continue;
      const color = name.startsWith("left_") ? colors.left : name.startsWith("right_") ? colors.right : colors.center;
      const r = size.radius;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + size.halo, 0, Math.PI * 2);
      ctx.fillStyle = colors.halo;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.low ? Math.max(r - size.ring / 2, size.ring) : r, 0, Math.PI * 2);
      if (p.low) {
        ctx.lineWidth = size.ring;
        ctx.strokeStyle = color;
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
    return pts.size;
  };
}

/** Index of the frame shown at `timeMs` (last frame starting at or before it, with half-frame tolerance). */
export function frameAt(timestamps: Float64Array, timeMs: number): number {
  const n = timestamps.length;
  if (n === 0) return -1;
  const half = n > 1 ? ((timestamps[n - 1] as number) - (timestamps[0] as number)) / (n - 1) / 2 : 0;
  const target = timeMs + half;
  let lo = 0;
  let hi = n - 1;
  if (target < (timestamps[0] as number)) return 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((timestamps[mid] as number) <= target) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
