// Prepares self-hosted MediaPipe assets under public/vendor (02 §5: no runtime CDN).
// - Copies the tasks-vision module-worker WASM build from node_modules.
// - Downloads the pose model from a versioned URL and verifies its pinned SHA-256.
// Idempotent: skips files that already match. Run via `pnpm dev` / `pnpm build`.
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendor = join(appDir, "public", "vendor");

const TASKS_VISION = "1.2.0";
const WASM_FILES = ["vision_wasm_module_internal.js", "vision_wasm_module_internal.wasm"];
const MODELS = [
  {
    file: "pose_landmarker_full.float16.v1.task",
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
    sha256: "5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1",
  },
  {
    file: "pose_landmarker_lite.float16.v1.task",
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    sha256: "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a",
  },
];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const exists = (p) => stat(p).then(() => true, () => false);

async function copyWasm() {
  const src = join(appDir, "node_modules", "@mediapipe", "tasks-vision");
  const pkg = JSON.parse(await readFile(join(src, "package.json"), "utf8"));
  if (pkg.version !== TASKS_VISION) throw new Error(`tasks-vision ${pkg.version} installed, expected ${TASKS_VISION}`);
  const out = join(vendor, `tasks-vision-${TASKS_VISION}`);
  await mkdir(out, { recursive: true });
  for (const f of WASM_FILES) {
    const from = join(src, "wasm", f);
    const to = join(out, f);
    if ((await exists(to)) && sha256(await readFile(to)) === sha256(await readFile(from))) continue;
    await copyFile(from, to);
    console.log(`vendor: copied ${f}`);
  }
}

async function fetchModels() {
  const out = join(vendor, "models");
  await mkdir(out, { recursive: true });
  for (const m of MODELS) {
    const to = join(out, m.file);
    if ((await exists(to)) && sha256(await readFile(to)) === m.sha256) continue;
    console.log(`vendor: downloading ${m.file}`);
    const res = await fetch(m.url);
    if (!res.ok) throw new Error(`download ${m.url} failed: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const got = sha256(buf);
    if (got !== m.sha256) throw new Error(`${m.file}: sha256 ${got} does not match pinned ${m.sha256}`);
    await writeFile(`${to}.tmp`, buf);
    await rename(`${to}.tmp`, to);
  }
}

await copyWasm();
await fetchModels();
