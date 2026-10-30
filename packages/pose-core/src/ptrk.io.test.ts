import { describe, expect, it } from "vitest";
import {
  FRAME_FLAG,
  KP_STATE,
  MEDIAPIPE_POSE_33,
  PTRK_MISSING,
  PtrkError,
  canonicalJson,
  decodePtrk,
  dequantPx,
  encodePtrk,
  gunzipBytes,
  gzipBytes,
  quantPx,
  quantUnit,
  readPtrkFile,
  recipeHash,
  writePtrkFile,
  type PtrkHeader,
  type PtrkTrack,
} from "./io.ts";

function makeTrack(frames = 3, withWorld = true): PtrkTrack {
  const k = MEDIAPIPE_POSE_33.length;
  const header: PtrkHeader = {
    schema: "ptrk/1",
    skeleton: "mediapipe-pose/33",
    canonicalMap: "canonical/1",
    keypoints: [...MEDIAPIPE_POSE_33],
    frames,
    video: {
      sha256: "0".repeat(64),
      durationMs: 7718,
      fps: 59.97,
      displayWidth: 2160,
      displayHeight: 3840,
      rotation: 90,
      codec: "hvc1.2.4.L153.B0",
      hdr: "hlg",
    },
    provider: { id: "test", modelSha256: "f".repeat(64), delegate: "GPU" },
    hasWorld: withWorld,
    hasPresence: false,
    timeMap: { source: "identity", trusted: true },
    inferenceSegments: [{ fromMs: 0, toMs: 33.4, delegate: "GPU" }],
    processing: { stage: "raw", inferenceLongEdge: 1280, frameStride: 1 },
    target: { personTrackId: 0, selection: "auto-single", revisions: [] },
    createdAt: "2026-10-30T00:00:00.000Z",
  };
  const image = new Int16Array(frames * k * 4);
  for (let i = 0; i < image.length; i++) image[i] = (i % 2000) - 1000;
  image[5] = PTRK_MISSING;
  return {
    header,
    timestamps: Float64Array.from({ length: frames }, (_, i) => i * 16.683),
    flags: Uint8Array.from({ length: frames }, (_, i) => (i === 1 ? 0 : FRAME_FLAG.detected)),
    kpState: new Uint8Array(frames * k).fill(KP_STATE.observed),
    image,
    ...(withWorld && { world: new Int16Array(frames * k * 4).fill(12) }),
  };
}

describe("PTRK v1", () => {
  it("round-trips through encode/decode and gzip", async () => {
    const track = makeTrack();
    const decoded = await readPtrkFile(await writePtrkFile(track));
    expect(decoded.header).toEqual(track.header);
    expect(decoded.timestamps).toEqual(track.timestamps);
    expect(decoded.flags).toEqual(track.flags);
    expect(decoded.kpState).toEqual(track.kpState);
    expect(decoded.image).toEqual(track.image);
    expect(decoded.world).toEqual(track.world);
    expect(decoded.presence).toBeUndefined();
  });

  it("starts the payload 8-byte aligned and writes the magic and version", () => {
    const bytes = encodePtrk(makeTrack(2, false));
    expect(new TextDecoder().decode(bytes.subarray(0, 4))).toBe("PTRK");
    const dv = new DataView(bytes.buffer);
    expect(dv.getUint16(4, true)).toBe(1);
    expect((10 + dv.getUint32(6, true)) % 8).toBe(0);
  });

  it("quantises pixels at 0.25 px, clamps, and maps non-finite to missing", () => {
    expect(quantPx(100.13)).toBe(401);
    expect(dequantPx(401)).toBe(100.25);
    expect(quantPx(1e9)).toBe(32767);
    expect(quantPx(Number.NaN)).toBe(PTRK_MISSING);
    expect(Number.isNaN(dequantPx(PTRK_MISSING))).toBe(true);
    expect(quantUnit(0.98765)).toBe(9877);
  });

  it("rejects mismatched section lengths when encoding", () => {
    const track = makeTrack();
    expect(() => encodePtrk({ ...track, kpState: new Uint8Array(1) })).toThrow(PtrkError);
  });

  it("rejects truncated, non-monotonic, or out-of-range input when decoding", () => {
    const good = encodePtrk(makeTrack());
    expect(() => decodePtrk(good.subarray(0, good.length - 1))).toThrow(/section sizes/);

    const badMagic = good.slice();
    badMagic[0] = 0x58;
    expect(() => decodePtrk(badMagic)).toThrow(/magic/);

    const t = makeTrack();
    t.timestamps[2] = t.timestamps[1] as number;
    expect(() => decodePtrk(encodePtrk(t))).toThrow(/not increasing/);

    const s = makeTrack();
    s.kpState[0] = 9;
    expect(() => decodePtrk(encodePtrk(s))).toThrow(/kpState/);

    const header = new TextEncoder().encode(JSON.stringify({ ...makeTrack(1).header, frames: 40_000 }));
    const forged = new Uint8Array(10 + header.length);
    forged.set(new TextEncoder().encode("PTRK"));
    new DataView(forged.buffer).setUint16(4, 1, true);
    new DataView(forged.buffer).setUint32(6, header.length, true);
    forged.set(header, 10);
    expect(() => decodePtrk(forged)).toThrow(/frame count/);
  });

  it("stops decompression once the size limit is exceeded", async () => {
    const zipped = await gzipBytes(new Uint8Array(4096));
    await expect(gunzipBytes(zipped, 1024)).rejects.toThrow(/exceeds limit/);
  });
});

describe("recipe hash", () => {
  it("is independent of key order and sensitive to any value", async () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: null } })).toBe(
      '{"a":{"c":null,"d":[2,{"y":2,"z":1}]},"b":1}',
    );
    const a = await recipeHash({ x: 1, y: { k: 0.5 } });
    expect(a).toBe(await recipeHash({ y: { k: 0.5 }, x: 1 }));
    expect(a).not.toBe(await recipeHash({ x: 1, y: { k: 0.51 } }));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
