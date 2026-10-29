import { describe, expect, it } from "vitest";
import { experimentalMetric, gateByTime, makeEventId, unavailableMetric, validMetric } from "./metrics.ts";

const knee = { key: "squat.knee_flexion_max", unit: "deg", space: "image" } as const;
const speed = { key: "tennis.wrist_speed_peak", unit: "torso/s", space: "image" } as const;

describe("metric helpers", () => {
  it("unavailable metrics have a reason and no value", () => {
    const m = unavailableMetric(knee, "needs_side_view");
    expect(m).toEqual({ ...knee, status: "unavailable", reasonCode: "needs_side_view" });
    expect("value" in m).toBe(false);
  });

  it("rejects non-finite values", () => {
    expect(() => validMetric(knee, Number.NaN)).toThrow(/unavailable/);
    expect(() => experimentalMetric(knee, Number.POSITIVE_INFINITY)).toThrow();
  });

  it("time-dependent metrics are unavailable when time is not trusted", () => {
    const m = gateByTime(speed, false, () => validMetric(speed, 9));
    expect(m.status).toBe("unavailable");
    expect(m.reasonCode).toBe("time_untrusted");
  });

  it("image-space angles are not gated by time", () => {
    expect(gateByTime(knee, false, () => validMetric(knee, 72)).status).toBe("valid");
  });
});

describe("makeEventId", () => {
  it("is deterministic", () => {
    expect(makeEventId("stroke", 3)).toBe("stroke-3");
    expect(() => makeEventId("rep", -1)).toThrow();
  });
});
