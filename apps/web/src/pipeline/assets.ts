/** Self-hosted MediaPipe assets prepared by scripts/prepare-vendor.mjs. */
export const WASM_BASE = "/vendor/tasks-vision-1.2.0";

export const MODELS = {
  full: {
    variant: "full",
    url: "/vendor/models/pose_landmarker_full.float16.v1.task",
    sha256: "5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1",
    sizeMb: 9.0,
  },
  lite: {
    variant: "lite",
    url: "/vendor/models/pose_landmarker_lite.float16.v1.task",
    sha256: "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a",
    sizeMb: 5.5,
  },
} as const;

export const INFERENCE_LONG_EDGES = [1280, 960, 720] as const;

/** Reference setting for accuracy comparisons (the design default, 02 §4–§5). */
export const REFERENCE_SETTING = { model: "full", inferenceLongEdge: 1280 } as const;
