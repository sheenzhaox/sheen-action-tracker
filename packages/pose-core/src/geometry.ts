export interface Point2 {
  readonly x: number;
  readonly y: number;
}

export interface FrameSize {
  /** Display width in pixels (after applying rotation metadata). */
  readonly width: number;
  /** Display height in pixels (after applying rotation metadata). */
  readonly height: number;
}

/** Below this length (px) a segment has no usable direction. */
const MIN_SEGMENT_PX = 1e-6;

/** Converts normalised [0, 1] coordinates to display pixels. */
export function toPixels(p: Point2, size: FrameSize): Point2 {
  return { x: p.x * size.width, y: p.y * size.height };
}

/**
 * Angle at `vertex` between rays vertex→a and vertex→c, in degrees [0, 180].
 * Inputs must already be in pixel space: normalised coordinates distort angles
 * whenever width !== height. Returns null for degenerate (zero-length) segments.
 */
export function jointAngleDeg(a: Point2, vertex: Point2, c: Point2): number | null {
  const ux = a.x - vertex.x;
  const uy = a.y - vertex.y;
  const vx = c.x - vertex.x;
  const vy = c.y - vertex.y;
  const lu = Math.hypot(ux, uy);
  const lv = Math.hypot(vx, vy);
  if (lu < MIN_SEGMENT_PX || lv < MIN_SEGMENT_PX) {
    return null;
  }
  const cos = (ux * vx + uy * vy) / (lu * lv);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

/** Joint angle from normalised landmarks, converted to pixels first. */
export function jointAngleFromNormalized(
  a: Point2,
  vertex: Point2,
  c: Point2,
  size: FrameSize,
): number | null {
  return jointAngleDeg(toPixels(a, size), toPixels(vertex, size), toPixels(c, size));
}
