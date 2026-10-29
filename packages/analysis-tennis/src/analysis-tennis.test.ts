import type { ProcessedPoseTrack } from "@action-tracker/pose-core";
import { describe, expect, it } from "vitest";
import { groundstrokePack } from "./groundstroke.ts";
import { resolveHittingSide } from "./hitting-side.ts";

describe("resolveHittingSide", () => {
  const speeds = { left: 4.1, right: 9.3 };

  it("uses the athlete profile when it is known", () => {
    expect(resolveHittingSide({ dominantHand: "left", backhandType: "two_handed" }, speeds)).toEqual({
      side: "left",
      inferred: false,
    });
  });

  it("infers from the faster wrist when the profile is unknown", () => {
    expect(resolveHittingSide({ dominantHand: "unknown", backhandType: "unknown" }, speeds)).toEqual({
      side: "right",
      inferred: true,
    });
    expect(resolveHittingSide(undefined, { left: 8, right: null })).toEqual({ side: "left", inferred: true });
  });

  it("gives up when there is no usable or no distinguishing peak", () => {
    expect(resolveHittingSide(undefined, { left: null, right: null }).side).toBeNull();
    expect(resolveHittingSide(undefined, { left: 5, right: 5 }).side).toBeNull();
  });
});

describe("groundstrokePack v0", () => {
  const track: ProcessedPoseTrack = { frameSize: { width: 1080, height: 1920 }, sampleRateHz: 60, frames: [] };

  it("is deterministic and reports no events yet", () => {
    const ctx = { timeTrusted: true };
    const a = groundstrokePack.analyze(track, ctx, groundstrokePack.defaultConfig);
    const b = groundstrokePack.analyze(track, ctx, groundstrokePack.defaultConfig);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.events).toHaveLength(0);
    expect(a.packId).toBe(groundstrokePack.id);
  });
});
