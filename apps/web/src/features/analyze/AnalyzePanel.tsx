import { useRef, useState } from "react";
import { FilmStrip, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { t, type MessageKey } from "@/messages";
import { INFERENCE_LONG_EDGES } from "@/pipeline/assets";
import type { PipelineOptions } from "@/pipeline/protocol";
import { RunReport } from "./RunReport";
import { SkeletonPlayer } from "./SkeletonPlayer";
import { DEFAULT_OPTIONS, usePipeline } from "./usePipeline";

export function AnalyzePanel() {
  const { state, start, cancel, reset } = usePipeline();
  const input = useRef<HTMLInputElement>(null);
  const [options, setOptions] = useState<PipelineOptions>(DEFAULT_OPTIONS);
  const running = state.status === "running";

  const pick = () => input.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) start(file, options);
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="analyze-title" className="rounded-xl bg-card p-4 text-card-foreground">
        <h2 id="analyze-title" className="font-display text-xl font-semibold">
          {t("analyze.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("analyze.description")}</p>

        <fieldset className="mt-4 flex flex-col gap-3" disabled={running}>
          <legend className="text-sm font-semibold">{t("settings.title")}</legend>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">{t("settings.model")}</span>
            <Segmented
              label={t("settings.model")}
              options={[
                { value: "full", label: t("settings.model.full") },
                { value: "lite", label: t("settings.model.lite") },
              ]}
              value={options.model}
              onChange={(model) => setOptions((o) => ({ ...o, model }))}
              disabled={running}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">{t("settings.size")}</span>
            <Segmented
              label={t("settings.size")}
              options={INFERENCE_LONG_EDGES.map((v) => ({ value: v, label: `${v} px` }))}
              value={options.inferenceLongEdge as (typeof INFERENCE_LONG_EDGES)[number]}
              onChange={(inferenceLongEdge) => setOptions((o) => ({ ...o, inferenceLongEdge }))}
              disabled={running}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("settings.hint")}</p>
        </fieldset>
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
          <RunReport summary={state.summary} comparison={state.comparison} />
        </>
      )}
    </div>
  );
}
