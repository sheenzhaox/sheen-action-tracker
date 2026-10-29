import type { AthleteSnapshot } from "@action-tracker/analysis-core";
import type { Side } from "@action-tracker/pose-core";

export interface HittingSide {
  readonly side: Side | null;
  /** True when the profile said "unknown" and the side was picked from the data. */
  readonly inferred: boolean;
}

/**
 * Racket side for one analysis (ADR-015): the athlete profile wins; when it is
 * unknown, take the wrist with the larger peak speed. Returns null when neither
 * wrist has a usable peak or both peaks are equal.
 */
export function resolveHittingSide(
  athlete: AthleteSnapshot | undefined,
  peakWristSpeed: Readonly<Record<Side, number | null>>,
): HittingSide {
  const hand = athlete?.dominantHand ?? "unknown";
  if (hand !== "unknown") {
    return { side: hand, inferred: false };
  }
  const { left, right } = peakWristSpeed;
  if (left === null && right === null) {
    return { side: null, inferred: true };
  }
  if (left === null) return { side: "right", inferred: true };
  if (right === null) return { side: "left", inferred: true };
  if (left === right) return { side: null, inferred: true };
  return { side: left > right ? "left" : "right", inferred: true };
}
