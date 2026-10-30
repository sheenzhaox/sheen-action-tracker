import { CANONICAL_JOINTS } from "./skeleton.ts";

/**
 * PTRK v1 pose file codec (designs/02-pose-pipeline.md §9).
 * Layout (little-endian): "PTRK" | version u16 | headerLen u32 | header JSON (padded so the
 * payload starts 8-byte aligned) | timestamps f64[F] | flags u8[F] | kpState u8[F*K] |
 * image i16[F*K*4] | presence i16[F*K]? | world i16[F*K*4]?. The whole file is gzip-compressed.
 */
export const PTRK_MAGIC = "PTRK";
export const PTRK_VERSION = 1;
export const PTRK_MISSING = -32768;

export const KP_STATE = { observed: 0, interpolated: 1, missing: 2, rejected: 3 } as const;
export const FRAME_FLAG = {
  detected: 1 << 0,
  interpolated: 1 << 1,
  multiPerson: 1 << 2,
  lowQuality: 1 << 3,
  cpuFallback: 1 << 4,
  segmentBoundary: 1 << 5,
} as const;

export const PTRK_LIMITS = {
  maxCompressedBytes: 20 * 1024 * 1024,
  maxDecompressedBytes: 100 * 1024 * 1024,
  maxHeaderBytes: 64 * 1024,
  maxFrames: 30_000,
  maxKeypoints: 256,
} as const;

export interface PtrkVideoInfo {
  sha256: string;
  durationMs: number;
  fps: number;
  displayWidth: number;
  displayHeight: number;
  rotation: number;
  codec: string;
  hdr: "none" | "hlg" | "pq" | "unknown";
}

export interface PtrkHeader {
  schema: "ptrk/1";
  skeleton: string;
  canonicalMap: string;
  keypoints: string[];
  frames: number;
  video: PtrkVideoInfo;
  provider: { id: string; modelSha256: string; delegate: "GPU" | "CPU" };
  hasWorld: boolean;
  hasPresence: boolean;
  timeMap: { source: "identity" | "unknown"; trusted: boolean };
  inferenceSegments: Array<{ fromMs: number; toMs: number; delegate: "GPU" | "CPU" }>;
  processing: {
    stage: "raw" | "processed";
    inferenceLongEdge: number;
    frameStride: number;
    resampleHz?: number;
    filters?: string[];
  };
  target: { personTrackId: number; selection: "auto-single" | "user"; revisions: unknown[] };
  createdAt: string;
}

export interface PtrkTrack {
  header: PtrkHeader;
  /** tPlay in ms for raw tracks; uniform grid for processed tracks. */
  timestamps: Float64Array;
  flags: Uint8Array;
  kpState: Uint8Array;
  /** [x px*4, y px*4, z px*4, visibility*10000] per keypoint. */
  image: Int16Array;
  presence?: Int16Array;
  /** [x mm, y mm, z mm, visibility*10000] per keypoint. */
  world?: Int16Array;
}

export class PtrkError extends Error {
  override readonly name = "PtrkError";
}

const clampI16 = (v: number) => Math.max(-32767, Math.min(32767, Math.round(v)));
/** Pixel coordinate -> stored value (0.25 px resolution). Non-finite input becomes missing. */
export const quantPx = (px: number) => (Number.isFinite(px) ? clampI16(px * 4) : PTRK_MISSING);
export const quantUnit = (u: number) => (Number.isFinite(u) ? clampI16(u * 10000) : PTRK_MISSING);
export const quantMm = (m: number) => (Number.isFinite(m) ? clampI16(m * 1000) : PTRK_MISSING);
export const dequantPx = (q: number) => (q === PTRK_MISSING ? Number.NaN : q / 4);
export const dequantUnit = (q: number) => (q === PTRK_MISSING ? Number.NaN : q / 10000);

/** MediaPipe Pose's 33 native keypoints share the canonical names and order. */
export const MEDIAPIPE_POSE_33: readonly string[] = CANONICAL_JOINTS;

function sectionSizes(f: number, k: number, hasPresence: boolean, hasWorld: boolean) {
  return {
    timestamps: f * 8,
    flags: f,
    kpState: f * k,
    image: f * k * 4 * 2,
    presence: hasPresence ? f * k * 2 : 0,
    world: hasWorld ? f * k * 4 * 2 : 0,
  };
}

export function encodePtrk(track: PtrkTrack): Uint8Array<ArrayBuffer> {
  const { header } = track;
  const f = track.timestamps.length;
  const k = header.keypoints.length;
  if (header.frames !== f) throw new PtrkError(`header.frames ${header.frames} != ${f}`);
  if (header.hasPresence !== (track.presence !== undefined)) throw new PtrkError("hasPresence mismatch");
  if (header.hasWorld !== (track.world !== undefined)) throw new PtrkError("hasWorld mismatch");
  const sizes = sectionSizes(f, k, header.hasPresence, header.hasWorld);
  const expect: Array<[string, number, number]> = [
    ["flags", track.flags.length, f],
    ["kpState", track.kpState.length, f * k],
    ["image", track.image.length, f * k * 4],
    ["presence", track.presence?.length ?? 0, header.hasPresence ? f * k : 0],
    ["world", track.world?.length ?? 0, header.hasWorld ? f * k * 4 : 0],
  ];
  for (const [name, got, want] of expect) {
    if (got !== want) throw new PtrkError(`${name} length ${got} != ${want}`);
  }

  let headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const pad = (8 - ((10 + headerBytes.length) % 8)) % 8;
  if (pad) {
    const padded = new Uint8Array(headerBytes.length + pad).fill(0x20);
    padded.set(headerBytes);
    headerBytes = padded;
  }
  const payload = Object.values(sizes).reduce((a, b) => a + b, 0);
  const out = new Uint8Array(10 + headerBytes.length + payload);
  const dv = new DataView(out.buffer);
  out.set(new TextEncoder().encode(PTRK_MAGIC), 0);
  dv.setUint16(4, PTRK_VERSION, true);
  dv.setUint32(6, headerBytes.length, true);
  out.set(headerBytes, 10);

  let o = 10 + headerBytes.length;
  for (const t of track.timestamps) {
    dv.setFloat64(o, t, true);
    o += 8;
  }
  out.set(track.flags, o);
  o += f;
  out.set(track.kpState, o);
  o += f * k;
  const writeI16 = (arr: Int16Array | undefined) => {
    if (!arr) return;
    for (const v of arr) {
      dv.setInt16(o, v, true);
      o += 2;
    }
  };
  writeI16(track.image);
  writeI16(track.presence);
  writeI16(track.world);
  return out;
}

function parseHeader(json: string): PtrkHeader {
  let h: unknown;
  try {
    h = JSON.parse(json);
  } catch {
    throw new PtrkError("header is not valid JSON");
  }
  const r = h as Partial<PtrkHeader> | null;
  if (!r || typeof r !== "object" || r.schema !== "ptrk/1") throw new PtrkError("unsupported header schema");
  if (!Array.isArray(r.keypoints) || !r.keypoints.every((x) => typeof x === "string")) {
    throw new PtrkError("header.keypoints invalid");
  }
  if (!Number.isInteger(r.frames) || typeof r.hasWorld !== "boolean" || typeof r.hasPresence !== "boolean") {
    throw new PtrkError("header fields invalid");
  }
  return r as PtrkHeader;
}

/** Decode an uncompressed PTRK buffer, validating sizes and values; never trusts the input. */
export function decodePtrk(bytes: Uint8Array): PtrkTrack {
  if (bytes.length > PTRK_LIMITS.maxDecompressedBytes) throw new PtrkError("file too large");
  if (bytes.length < 10) throw new PtrkError("truncated");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== PTRK_MAGIC) throw new PtrkError("bad magic");
  const version = dv.getUint16(4, true);
  if (version !== PTRK_VERSION) throw new PtrkError(`unsupported version ${version}`);
  const headerLen = dv.getUint32(6, true);
  if (headerLen > PTRK_LIMITS.maxHeaderBytes || 10 + headerLen > bytes.length) throw new PtrkError("bad header length");
  const header = parseHeader(new TextDecoder().decode(bytes.subarray(10, 10 + headerLen)));

  const f = header.frames;
  const k = header.keypoints.length;
  if (f < 0 || f > PTRK_LIMITS.maxFrames) throw new PtrkError(`frame count ${f} out of range`);
  if (k < 1 || k > PTRK_LIMITS.maxKeypoints) throw new PtrkError(`keypoint count ${k} out of range`);
  const sizes = sectionSizes(f, k, header.hasPresence, header.hasWorld);
  const payload = Object.values(sizes).reduce((a, b) => a + b, 0);
  if (bytes.length !== 10 + headerLen + payload) throw new PtrkError("section sizes do not match header");

  let o = 10 + headerLen;
  const timestamps = new Float64Array(f);
  for (let i = 0; i < f; i++, o += 8) {
    const t = dv.getFloat64(o, true);
    if (!Number.isFinite(t)) throw new PtrkError(`timestamp ${i} not finite`);
    if (i > 0 && t <= (timestamps[i - 1] as number)) throw new PtrkError(`timestamp ${i} not increasing`);
    timestamps[i] = t;
  }
  const flags = bytes.slice(o, o + f);
  o += f;
  const kpState = bytes.slice(o, o + f * k);
  o += f * k;
  for (const s of kpState) if (s > KP_STATE.rejected) throw new PtrkError(`invalid kpState ${s}`);
  const readI16 = (n: number) => {
    const arr = new Int16Array(n);
    for (let i = 0; i < n; i++, o += 2) arr[i] = dv.getInt16(o, true);
    return arr;
  };
  const image = readI16(f * k * 4);
  const presence = header.hasPresence ? readI16(f * k) : undefined;
  const world = header.hasWorld ? readI16(f * k * 4) : undefined;
  return { header, timestamps, flags, kpState, image, ...(presence && { presence }), ...(world && { world }) };
}

async function collect(stream: ReadableStream<Uint8Array>, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new PtrkError("decompressed size exceeds limit");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

const streamOf = (bytes: Uint8Array) => new Blob([bytes as Uint8Array<ArrayBuffer>]).stream();

export async function gzipBytes(bytes: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  return collect(streamOf(bytes).pipeThrough(new CompressionStream("gzip")), Number.MAX_SAFE_INTEGER);
}

/** Gunzip with streaming size limits so a hostile file cannot exhaust memory. */
export async function gunzipBytes(bytes: Uint8Array, maxBytes: number = PTRK_LIMITS.maxDecompressedBytes) {
  if (bytes.length > PTRK_LIMITS.maxCompressedBytes) throw new PtrkError("compressed file too large");
  return collect(streamOf(bytes).pipeThrough(new DecompressionStream("gzip")), maxBytes);
}

export async function writePtrkFile(track: PtrkTrack): Promise<Uint8Array<ArrayBuffer>> {
  return gzipBytes(encodePtrk(track));
}

export async function readPtrkFile(bytes: Uint8Array): Promise<PtrkTrack> {
  return decodePtrk(await gunzipBytes(bytes));
}
