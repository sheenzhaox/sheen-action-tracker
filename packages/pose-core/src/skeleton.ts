/**
 * Canonical skeleton shared by every PoseProvider and AnalysisPack.
 * Packs refer to joints by these names only; providers map their own keypoint
 * indices onto them. "left"/"right" are the athlete's own sides.
 */
export const CANONICAL_JOINTS = [
  "nose",
  "left_eye_inner",
  "left_eye",
  "left_eye_outer",
  "right_eye_inner",
  "right_eye",
  "right_eye_outer",
  "left_ear",
  "right_ear",
  "mouth_left",
  "mouth_right",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_pinky",
  "right_pinky",
  "left_index",
  "right_index",
  "left_thumb",
  "right_thumb",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_foot_index",
  "right_foot_index",
] as const;

export type JointName = (typeof CANONICAL_JOINTS)[number];

export type Side = "left" | "right";

const jointSet: ReadonlySet<string> = new Set(CANONICAL_JOINTS);

export function isJointName(value: string): value is JointName {
  return jointSet.has(value);
}

/** Joint on the given side, e.g. sided("right", "wrist") -> "right_wrist". */
export function sided<J extends string>(side: Side, joint: J): `${Side}_${J}` & JointName {
  const name = `${side}_${joint}`;
  if (!isJointName(name)) {
    throw new Error(`Unknown sided joint: ${name}`);
  }
  return name as `${Side}_${J}` & JointName;
}

export function otherSide(side: Side): Side {
  return side === "left" ? "right" : "left";
}
