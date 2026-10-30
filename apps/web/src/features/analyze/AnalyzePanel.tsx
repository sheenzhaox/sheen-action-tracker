import { useRef } from "react";
import { FilmStrip, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { t, type MessageKey } from "@/messages";
import { RunReport } from "./RunReport";
import { SkeletonPlayer } from "./SkeletonPlayer";
import { usePipeline } from "./usePipeline";

export function AnalyzePanel() {
  const { state, start, cancel, reset } = usePipeline();
  const input = useRef<HTMLInputElement>(null);

  const pick = () => input.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) start(file);
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="analyze-title" className="rounded-xl bg-card p-4 text-card-foreground">
        <h2 id="analyze-title" className="font-display text-xl font-semibold">
          {t("analyze.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("analyze.description")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("analyze.model")}</p>
        <input
          ref={input}
          type="file"
          accept="video/*,.mov,.mp4"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onFile}
        />

        {state.status === "running" ? (
          <div className="mt-4" aria-live="polite">
            <p className="font-medium">{t(`stage.${state.stage}` as MessageKey)}</p>
            <progress
              className="mt-2 h-2 w-full overflow-hidden rounded-full accent-[var(--primary)]"
              max={Math.max(1, state.total)}
              value={state.stage === "analyze" || state.stage === "save" ? state.done : undefined}
            />
            {state.total > 0 && (
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                {state.done} / {state.total} {t("analyze.frames")}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">{t("analyze.keepOpen")}</p>
            <Button variant="secondary" className="mt-3" onClick={cancel}>
              {t("analyze.cancel")}
            </Button>
          </div>
        ) : (
          <Button className="mt-4" onClick={state.status === "idle" ? pick : () => (reset(), pick())}>
            <FilmStrip size={20} aria-hidden="true" />
            {state.status === "idle" ? t("analyze.pick") : t("analyze.again")}
          </Button>
        )}

        {state.status === "error" && (
          <div role="alert" className="mt-4 rounded-md border border-warning p-3 text-sm">
            <p className="inline-flex items-center gap-2 font-semibold text-warning">
              <Warning size={20} aria-hidden="true" />
              {t("error.title")}
            </p>
            <p className="mt-1">{t(`error.${state.code}` as MessageKey)}</p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{state.detail}</p>
          </div>
        )}
      </section>

      {state.status === "done" && (
        <>
          <SkeletonPlayer file={state.file} track={state.track} />
          <RunReport summary={state.summary} />
        </>
      )}
    </div>
  );
}
