import type {
  AnalysisEvent,
  MeasuredMetric,
  MeasurementSpace,
  MetricUnit,
  ReasonCode,
  UnavailableMetric,
} from "./types.ts";

type MetricInit = {
  key: string;
  unit: MetricUnit;
  space: MeasurementSpace;
} & Partial<Pick<MeasuredMetric, "eventId" | "side" | "coverage">>;

export function makeEventId(kind: AnalysisEvent["kind"], index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Event index must be a non-negative integer, got ${index}`);
  }
  return `${kind}-${index}`;
}

export function validMetric(init: MetricInit, value: number): MeasuredMetric {
  return measured(init, value, "valid");
}

export function experimentalMetric(init: MetricInit, value: number, reasonCode?: ReasonCode): MeasuredMetric {
  const metric = measured(init, value, "experimental");
  return reasonCode === undefined ? metric : { ...metric, reasonCode };
}

/** Unavailable metrics carry a reason and never a value (UI shows "—"). */
export function unavailableMetric(init: MetricInit, reasonCode: ReasonCode): UnavailableMetric {
  return { ...init, status: "unavailable", reasonCode };
}

/**
 * Time-dependent metrics (space "time", or rates such as deg/s) are unavailable
 * whenever real time is not trusted, e.g. slow-motion files.
 */
export function gateByTime(
  init: MetricInit,
  timeTrusted: boolean,
  compute: () => MeasuredMetric | UnavailableMetric,
): MeasuredMetric | UnavailableMetric {
  const timeDependent = init.space === "time" || init.unit.includes("/s");
  return timeDependent && !timeTrusted ? unavailableMetric(init, "time_untrusted") : compute();
}

function measured(init: MetricInit, value: number, status: MeasuredMetric["status"]): MeasuredMetric {
  if (!Number.isFinite(value)) {
    throw new Error(`Metric ${init.key} has a non-finite value; report it as unavailable instead`);
  }
  return { ...init, status, value };
}
