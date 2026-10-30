import { DataStream, Endianness, MP4BoxBuffer, createFile, type ISOFile, type Sample, type Track } from "mp4box";
import type { ProbeInfo } from "./protocol.ts";
import { hdrFromColr, orientationFromMatrix, timeModel, type EditEntry } from "./frame-math.ts";

const CHUNK_BYTES = 4 * 1024 * 1024;

export class PipelineError extends Error {
  constructor(
    readonly code: "noVideoTrack" | "codecUnsupported" | "decodeFailed" | "cancelled",
    message: string,
  ) {
    super(message);
  }
}

interface SampleEntryLike {
  avcC?: { write(s: DataStream): void };
  hvcC?: { write(s: DataStream): void };
  vpcC?: { write(s: DataStream): void };
  av1C?: { write(s: DataStream): void };
  colrs?: Array<{ transfer_characteristics?: number }>;
  colr?: { transfer_characteristics?: number };
}

function sampleEntry(file: ISOFile, track: Track): SampleEntryLike | undefined {
  const trak = file.getTrackById(track.id);
  return trak?.mdia?.minf?.stbl?.stsd?.entries?.[0] as SampleEntryLike | undefined;
}

/** Decoder configuration record (avcC/hvcC/...) without its 8-byte box header. */
function codecDescription(entry: SampleEntryLike | undefined): Uint8Array | undefined {
  const box = entry?.avcC ?? entry?.hvcC ?? entry?.vpcC ?? entry?.av1C;
  if (!box) return undefined;
  const stream = new DataStream(undefined, 0, Endianness.BIG_ENDIAN);
  box.write(stream);
  return new Uint8Array(stream.buffer as ArrayBuffer, 8);
}

export interface DemuxedVideo {
  probe: ProbeInfo;
  config: VideoDecoderConfig;
  /** Media-time offset (µs) subtracted from every CTS (edit list). */
  offsetUs: number;
}

export interface DemuxHandlers {
  onReady(video: DemuxedVideo): Promise<void> | void;
  /** Called after each file chunk with the chunks extracted so far; await to apply backpressure. */
  onChunks(chunks: EncodedVideoChunk[]): Promise<void>;
  isCancelled(): boolean;
  addReadTime(ms: number): void;
}

/** Streams the file through mp4box, honouring its requested read positions (moov may be at the end). */
export async function demux(file: File, h: DemuxHandlers): Promise<void> {
  const mp4 = createFile();
  let video: DemuxedVideo | undefined;
  let trackId = -1;
  let pending: EncodedVideoChunk[] = [];
  let readyPromise: Promise<void> | undefined;
  let parseError: string | undefined;

  mp4.onError = (_module, message) => {
    parseError = message;
  };
  mp4.onReady = (info) => {
    const track = info.videoTracks[0];
    if (!track) {
      parseError = "no video track";
      return;
    }
    const entry = sampleEntry(mp4, track);
    const { orientation, rotation } = orientationFromMatrix(track.matrix);
    const durationS = track.samples_duration / track.timescale || track.duration / track.timescale;
    const fps = durationS > 0 ? track.nb_samples / durationS : 0;
    const time = timeModel(fps, track.edits as EditEntry[] | undefined);
    const w = track.video?.width ?? track.track_width;
    const hgt = track.video?.height ?? track.track_height;
    const swap = rotation === 90 || rotation === 270;
    const transfer = entry?.colr?.transfer_characteristics ?? entry?.colrs?.[0]?.transfer_characteristics;
    const description = codecDescription(entry);
    video = {
      probe: {
        codec: track.codec,
        codedWidth: w,
        codedHeight: hgt,
        displayWidth: swap ? hgt : w,
        displayHeight: swap ? w : hgt,
        rotation,
        orientation,
        durationMs: durationS * 1000,
        fps,
        frameCount: track.nb_samples,
        hdr: hdrFromColr(transfer),
        timeTrusted: time.trusted,
        ...(time.note && { timeNote: time.note }),
      },
      config: {
        codec: track.codec,
        codedWidth: w,
        codedHeight: hgt,
        ...(description && { description }),
      },
      offsetUs: (time.offset * 1e6) / track.timescale,
    };
    trackId = track.id;
    mp4.setExtractionOptions(track.id, undefined, { nbSamples: 30 });
    readyPromise = Promise.resolve(h.onReady(video));
    mp4.start();
  };
  mp4.onSamples = (_id, _user, samples: Sample[]) => {
    for (const s of samples) {
      if (!s.data || !video) continue;
      pending.push(
        new EncodedVideoChunk({
          type: s.is_sync ? "key" : "delta",
          timestamp: Math.round((s.cts * 1e6) / s.timescale - video.offsetUs),
          duration: Math.round((s.duration * 1e6) / s.timescale),
          data: s.data,
        }),
      );
    }
    const last = samples.at(-1);
    if (last) mp4.releaseUsedSamples(trackId, last.number + 1);
  };

  let offset = 0;
  let guard = Math.ceil(file.size / CHUNK_BYTES) * 4 + 16;
  while (offset < file.size) {
    if (h.isCancelled()) throw new PipelineError("cancelled", "cancelled");
    if (guard-- <= 0) throw new PipelineError("decodeFailed", "demuxer did not make progress");
    const t0 = performance.now();
    const buf = await file.slice(offset, offset + CHUNK_BYTES).arrayBuffer();
    const next = mp4.appendBuffer(MP4BoxBuffer.fromArrayBuffer(buf, offset), offset + buf.byteLength >= file.size);
    h.addReadTime(performance.now() - t0);
    if (parseError) throw new PipelineError(video ? "decodeFailed" : "noVideoTrack", parseError);
    if (readyPromise) {
      await readyPromise;
      readyPromise = undefined;
    }
    if (pending.length) {
      const batch = pending;
      pending = [];
      await h.onChunks(batch);
    }
    offset = typeof next === "number" && next > 0 ? next : offset + buf.byteLength;
  }
  mp4.flush();
  if (!video) throw new PipelineError("noVideoTrack", parseError ?? "no moov / video track found");
  if (pending.length) await h.onChunks(pending);
}
