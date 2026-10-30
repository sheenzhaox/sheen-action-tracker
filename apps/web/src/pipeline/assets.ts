/** Self-hosted MediaPipe assets prepared by scripts/prepare-vendor.mjs. */
export const WASM_BASE = "/vendor/tasks-vision-1.2.0";

export const MODELS = {
  full: {
    variant: "full",
    url: "/vendor/models/pose_landmarker_full.float16.v1.task",
    sha256: "5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1",
  },
} as const;
