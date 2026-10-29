import type { JointName, ProcessedPoseTrack, Side } from "@action-tracker/pose-core";

export type Sport = "gym" | "tennis";
export type CameraView = "side-left" | "side-right" | "front" | "back";
export type MetricStatus = "valid" | "unavailable" | "experimental";
export type MeasurementSpace = "image" | "world" | "time";
export type MetricUnit = "deg" | "deg/s" | "ms" | "count" | "ratio" | "torso/s" | "m/s";

export type ReasonCode =
  | "time_untrusted"
  | "keypoint_occluded"
  | "no_vertical_reference"
  | "depends_on_interpolation"
  | "insufficient_observation"
  | "needs_side_view"
  | "not_implemented";

/** Athlete profile snapshot taken at analysis time (ADR-015). */
export interface AthleteSnapshot {
  readonly dominantHand: Side | "unknown";
  readonly backhandType: "two_handed" | "one_handed" | "unknown";
  readonly heightCm?: number;
}

export interface AnalysisContext {
  readonly athlete?: AthleteSnapshot;
  readonly view?: CameraView;
  readonly verticalReference?: "camera-level-confirmed" | "manual" | "none";
  /** From timeMap.trusted; false makes every time-dependent metric unavailable. */
  readonly timeTrusted: boolean;
}

export interface CaptureProtocol {
  readonly views: readonly CameraView[];
  /** messageKey of the English capture guidance shown before import. */
  readonly guidanceKey: string;
}

export interface PackRequirements {
  readonly keypoints: readonly JointName[];
  readonly observation: {
    readonly maxGapMs: number;
    readonly minObservedRatio: number;
  };
  readonly views: readonly CameraView[];
  readonly maxPersons: number;
}

export interface Phase {
  readonly name: string;
  readonly startMs: number;
  readonly endMs: number;
}

export interface AnalysisEvent {
  /** Deterministic: `${kind}-${index}` (see makeEventId). */
  readonly id: string;
  readonly kind: "rep" | "stroke";
  readonly label: "squat" | "forehand" | "backhand" | "serve" | "partial" | "unknown";
  readonly startMs: number;
  readonly endMs: number;
  /** Squat bottom or wrist-speed peak; never called the ball-contact moment. */
  readonly keyMs: number;
  readonly phases: readonly Phase[];
  readonly confidence: number;
}

export interface MetricCoverage {
  readonly observedRatio: number;
  readonly maxGapMs: number;
  readonly keyWindowInterpolated: boolean;
}

interface MetricBase {
  readonly key: string;
  readonly unit: MetricUnit;
  readonly space: MeasurementSpace;
  readonly eventId?: string;
  readonly side?: Side;
  readonly coverage?: MetricCoverage;
}

export interface MeasuredMetric extends MetricBase {
  readonly status: "valid" | "experimental";
  readonly value: number;
  /** Why the metric is experimental; empty for valid metrics. */
  readonly reasonCode?: ReasonCode;
}

export interface UnavailableMetric extends MetricBase {
  readonly status: "unavailable";
  readonly reasonCode: ReasonCode;
}

export type Metric = MeasuredMetric | UnavailableMetric;

/** v1 only produces measurement notes (ADR-012). */
export interface Finding {
  readonly code: string;
  readonly category: "measurement";
  readonly severity: "info";
  readonly eventIds: readonly string[];
  readonly evidence: Readonly<Record<string, number | string>>;
  readonly messageKey: string;
}

export interface TimeSeries {
  readonly key: string;
  readonly unit: MetricUnit;
  readonly space: MeasurementSpace;
  readonly side?: Side;
  readonly tMs: readonly number[];
  /** null where the source is not observed; interpolated samples are flagged separately. */
  readonly values: readonly (number | null)[];
  readonly interpolated: readonly boolean[];
}

export interface QualityReport {
  readonly timeTrusted: boolean;
  readonly frameCount: number;
}

export interface AnalysisResult {
  readonly packId: string;
  readonly packVersion: string;
  readonly events: readonly AnalysisEvent[];
  readonly metrics: readonly Metric[];
  readonly notes: readonly Finding[];
  readonly series: readonly TimeSeries[];
  readonly quality: QualityReport;
}

/**
 * A sport pack. `analyze` must be pure and deterministic: no DOM, network,
 * clock or randomness; identical input yields byte-identical output.
 */
export interface AnalysisPack<Config = unknown> {
  readonly id: string;
  readonly version: string;
  readonly sport: Sport;
  readonly title: string;
  readonly capture: CaptureProtocol;
  readonly requirements: PackRequirements;
  readonly defaultConfig: Config;
  analyze(track: ProcessedPoseTrack, ctx: AnalysisContext, config: Config): AnalysisResult;
}
