import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaretLeft, CaretRight, Pause, Play } from "@phosphor-icons/react";
import type { PtrkTrack } from "@action-tracker/pose-core/io";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { t } from "@/messages";
import { frameAt, makeSkeletonDrawer, readSkeletonColors } from "./skeleton-draw";

const SPEEDS = [0.25, 0.5, 1] as const;

type VideoWithRvfc = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

export function SkeletonPlayer({ file, track }: { file: File; track: PtrkTrack }) {
  const videoRef = useRef<VideoWithRvfc>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(0.5);
  const [frame, setFrame] = useState(0);
  const [visibleJoints, setVisibleJoints] = useState(0);
  // Frame requested by the step buttons while the seek is still in flight.
  const pending = useRef<number | null>(null);
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const { displayWidth: W, displayHeight: H } = track.header.video;
  const ts = track.timestamps;
  const n = ts.length;
  const draw = useMemo(() => makeSkeletonDrawer(track), [track]);
  const colors = useMemo(() => readSkeletonColors(), []);

  const render = useCallback(
    (timeMs: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const i = frameAt(ts, timeMs);
      if (pending.current !== null && videoRef.current?.seeking) return;
      const dpr = window.devicePixelRatio || 1;
      setFrame(i);
      setVisibleJoints(draw(ctx, i, canvas.width / W, canvas.height / H, dpr, colors));
    },
    [colors, draw, ts, W, H],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      render(video.currentTime * 1000);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [render]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let id = 0;
    let raf = 0;
    const onFrame = (_now: number, meta: { mediaTime: number }) => {
      render(meta.mediaTime * 1000);
      id = video.requestVideoFrameCallback!(onFrame);
    };
    const onRaf = () => {
      render(video.currentTime * 1000);
      raf = requestAnimationFrame(onRaf);
    };
    if (video.requestVideoFrameCallback) id = video.requestVideoFrameCallback(onFrame);
    else raf = requestAnimationFrame(onRaf);
    const onSeeked = () => {
      pending.current = null;
      render(video.currentTime * 1000);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadeddata", onSeeked);
    return () => {
      if (id) video.cancelVideoFrameCallback?.(id);
      cancelAnimationFrame(raf);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadeddata", onSeeked);
    };
  }, [render]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const seekFrame = (i: number) => {
    const v = videoRef.current;
    if (!v || n === 0) return;
    v.pause();
    const clamped = Math.max(0, Math.min(n - 1, i));
    pending.current = clamped;
    // Land just inside the frame so the decoder shows it, not its predecessor.
    v.currentTime = ((ts[clamped] as number) + 1) / 1000;
    setFrame(clamped);
  };
  const step = (delta: number) => seekFrame((pending.current ?? frame) + delta);

  return (
    <section aria-labelledby="player-title" className="rounded-xl bg-card p-4 text-card-foreground">
      <h2 id="player-title" className="font-display text-xl font-semibold">
        {t("player.title")}
      </h2>
      <div
        className="relative mx-auto mt-3 w-full overflow-hidden rounded-xl bg-stage"
        style={{ aspectRatio: `${W} / ${H}`, maxHeight: "70dvh", maxWidth: `calc(70dvh * ${W / H})` }}
      >
        <video
          ref={videoRef}
          src={url}
          className="absolute inset-0 h-full w-full object-contain"
          playsInline
          muted
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
        {visibleJoints === 0 && (
          <p className="absolute inset-x-0 bottom-2 mx-auto w-fit rounded-sm bg-black/60 px-2 py-1 text-sm text-white">
            {t("player.noPose")}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" aria-label={t("player.prevFrame")} onClick={() => step(-1)}>
          <CaretLeft size={24} aria-hidden="true" />
        </Button>
        <Button onClick={toggle} className="min-w-28">
          {playing ? <Pause size={20} weight="fill" aria-hidden="true" /> : <Play size={20} weight="fill" aria-hidden="true" />}
          {playing ? t("player.pause") : t("player.play")}
        </Button>
        <Button variant="ghost" size="icon" aria-label={t("player.nextFrame")} onClick={() => step(1)}>
          <CaretRight size={24} aria-hidden="true" />
        </Button>
      </div>

      <label className="mt-2 block">
        <span className="sr-only">{t("player.position")}</span>
        <input
          type="range"
          min={0}
          max={Math.max(0, n - 1)}
          value={frame}
          onChange={(e) => seekFrame(Number(e.target.value))}
          className="h-11 w-full accent-[var(--primary)]"
        />
      </label>
      <p className="text-sm tabular-nums text-muted-foreground">
        {t("player.frame")} {frame + 1} / {n} · {((ts[frame] ?? 0) / 1000).toFixed(2)} s
      </p>

      <div className="mt-3">
        <Segmented
          label={t("player.speed")}
          options={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))}
          value={speed}
          onChange={setSpeed}
        />
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-full bg-[var(--skel-left)] ring-2 ring-black/75" />
          {t("legend.left")}
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-full bg-[var(--skel-right)] ring-2 ring-black/75" />
          {t("legend.right")}
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-full border-2 border-foreground" />
          {t("legend.low")}
        </li>
      </ul>
    </section>
  );
}
