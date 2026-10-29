import type { MessageKey } from "@/messages";

export type ProbeStatus = "supported" | "unsupported" | "unknown" | "info";

export interface ProbeResult {
  id: string;
  labelKey: MessageKey;
  status: ProbeStatus;
  /** Raw technical value (codec string, quota, UA). Shown verbatim, not translated. */
  detail?: string;
}

type ProbeFn = () => Promise<Omit<ProbeResult, "id" | "labelKey">> | Omit<ProbeResult, "id" | "labelKey">;

const flag = (ok: boolean): ProbeStatus => (ok ? "supported" : "unsupported");

async function decodeSupported(codec: string, codedWidth: number, codedHeight: number) {
  if (typeof VideoDecoder === "undefined") return { status: "unsupported" as const, detail: codec };
  try {
    const r = await VideoDecoder.isConfigSupported({ codec, codedWidth, codedHeight });
    return { status: flag(r.supported === true), detail: codec };
  } catch (e) {
    return { status: "unknown" as const, detail: `${codec}: ${String(e)}` };
  }
}

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GiB`;
  return `${Math.round(n / 1024 ** 2)} MiB`;
}

const probes: Array<[string, MessageKey, ProbeFn]> = [
  ["secureContext", "probe.secureContext", () => ({ status: flag(window.isSecureContext) })],
  ["crossOriginIsolated", "probe.crossOriginIsolated", () => ({ status: flag(window.crossOriginIsolated) })],
  ["videoDecoder", "probe.videoDecoder", () => ({ status: flag(typeof VideoDecoder !== "undefined") })],
  ["decodeHevcMain10", "probe.decodeHevcMain10", () => decodeSupported("hvc1.2.4.L153.B0", 3840, 2160)],
  ["decodeH264", "probe.decodeH264", () => decodeSupported("avc1.640028", 1920, 1080)],
  [
    "encodeH264",
    "probe.encodeH264",
    async () => {
      if (typeof VideoEncoder === "undefined") return { status: "unsupported" };
      try {
        const r = await VideoEncoder.isConfigSupported({
          codec: "avc1.640028",
          width: 1920,
          height: 1080,
          bitrate: 8_000_000,
          framerate: 30,
        });
        return { status: flag(r.supported === true), detail: "avc1.640028" };
      } catch (e) {
        return { status: "unknown", detail: String(e) };
      }
    },
  ],
  [
    "webgpu",
    "probe.webgpu",
    async () => {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      if (!gpu) return { status: "unsupported" };
      try {
        return { status: flag((await gpu.requestAdapter()) != null) };
      } catch (e) {
        return { status: "unknown", detail: String(e) };
      }
    },
  ],
  ["webgl2", "probe.webgl2", () => ({ status: flag(document.createElement("canvas").getContext("webgl2") != null) })],
  ["offscreenCanvas", "probe.offscreenCanvas", () => ({ status: flag(typeof OffscreenCanvas !== "undefined") })],
  [
    "opfs",
    "probe.opfs",
    async () => {
      if (!navigator.storage?.getDirectory) return { status: "unsupported" };
      try {
        await navigator.storage.getDirectory();
        return { status: "supported" };
      } catch (e) {
        return { status: "unsupported", detail: String(e) };
      }
    },
  ],
  [
    "storageQuota",
    "probe.storageQuota",
    async () => {
      if (!navigator.storage?.estimate) return { status: "unknown" };
      const { quota, usage } = await navigator.storage.estimate();
      if (quota == null) return { status: "unknown" };
      return { status: "info", detail: `${formatBytes(usage ?? 0)} used of ${formatBytes(quota)}` };
    },
  ],
  ["wakeLock", "probe.wakeLock", () => ({ status: flag("wakeLock" in navigator) })],
  [
    "videoFrameCallback",
    "probe.videoFrameCallback",
    () => ({ status: flag("requestVideoFrameCallback" in HTMLVideoElement.prototype) }),
  ],
  ["cpuCores", "probe.cpuCores", () => ({ status: "info", detail: String(navigator.hardwareConcurrency ?? "?") })],
  [
    "deviceMemory",
    "probe.deviceMemory",
    () => {
      const gb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      return gb == null ? { status: "unknown" } : { status: "info", detail: `${gb} GB` };
    },
  ],
  ["userAgent", "probe.userAgent", () => ({ status: "info", detail: navigator.userAgent })],
];

export async function runProbes(): Promise<ProbeResult[]> {
  return Promise.all(
    probes.map(async ([id, labelKey, fn]) => {
      try {
        return { id, labelKey, ...(await fn()) };
      } catch (e) {
        return { id, labelKey, status: "unknown" as const, detail: String(e) };
      }
    }),
  );
}

export function formatReport(results: ProbeResult[]): string {
  return results.map((r) => `${r.id}: ${r.status}${r.detail ? ` (${r.detail})` : ""}`).join("\n");
}
