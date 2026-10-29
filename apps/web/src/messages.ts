// All UI copy lives here (English only, Q13). Components reference messageKeys, never literal strings.
export const messages = {
  "app.title": "Action Tracker",
  "app.tagline": "Measure movement from video. Everything runs on this device.",
  "app.privacy": "Videos stay on this device. Nothing is uploaded.",

  "diag.title": "Device check",
  "diag.description": "What this browser supports for on-device video analysis.",
  "diag.run": "Run check",
  "diag.running": "Checking…",
  "diag.copy": "Copy report",
  "diag.copied": "Copied",
  "diag.api": "Server",

  "diag.status.supported": "Supported",
  "diag.status.unsupported": "Not supported",
  "diag.status.unknown": "Unknown",
  "diag.status.info": "Info",

  "probe.secureContext": "Secure context (HTTPS)",
  "probe.crossOriginIsolated": "Cross-origin isolated",
  "probe.videoDecoder": "WebCodecs VideoDecoder",
  "probe.decodeHevcMain10": "Decode HEVC Main10 4K (iPhone HDR)",
  "probe.decodeH264": "Decode H.264 1080p",
  "probe.encodeH264": "Encode H.264 1080p (export)",
  "probe.webgpu": "WebGPU adapter",
  "probe.webgl2": "WebGL 2",
  "probe.offscreenCanvas": "OffscreenCanvas",
  "probe.opfs": "Origin private file system",
  "probe.storageQuota": "Storage quota",
  "probe.wakeLock": "Screen Wake Lock",
  "probe.videoFrameCallback": "requestVideoFrameCallback",
  "probe.cpuCores": "Logical CPU cores",
  "probe.deviceMemory": "Device memory",
  "probe.userAgent": "User agent",
} as const;

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey): string {
  return messages[key];
}
