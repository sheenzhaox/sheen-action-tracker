import { useState } from "react";
import { Copy } from "@phosphor-icons/react";
import type { RunSummary } from "@/pipeline/protocol";
import { Button } from "@/components/ui/button";
import { t, type MessageKey } from "@/messages";

const ms = (v: number) => `${Math.round(v)} ms`;

export function reportRows(s: RunSummary): Array<[MessageKey, string]> {
  const p = s.probe;
  const tm = s.timings;
  const ratio = p.durationMs > 0 ? tm.totalMs / p.durationMs : 0;
  return [
    [
      "report.video",
      `${p.codec} · ${p.displayWidth}×${p.displayHeight} · rot ${p.rotation}° · ${p.fps.toFixed(2)} fps · ${p.frameCount} frames · ${(p.durationMs / 1000).toFixed(2)} s · HDR ${p.hdr}`,
    ],
    ["report.timeMap", p.timeTrusted ? t("report.timeTrusted") : `${t("report.timeUntrusted")} (${p.timeNote ?? ""})`],
    ["report.decoder", s.firstFrame ? `${s.firstFrame.format ?? "opaque"} · ${s.firstFrame.colorSpace}` : "—"],
    [
      "report.inference",
      `${s.providerId} · ${s.delegate}${s.gpuError ? ` · ${t("report.gpuFallback")}: ${s.gpuError}` : ""}`,
    ],
    ["report.frames", `${s.framesWithPose} / ${s.framesDecoded}`],
    ["report.modelLoad", ms(tm.modelLoadMs)],
    ["report.modelInit", ms(tm.modelInitMs)],
    ["report.read", ms(tm.readMs)],
    ["report.decodeWait", ms(tm.decodeWaitMs)],
    ["report.prep", ms(tm.prepMs)],
    ["report.infer", ms(tm.inferMs)],
    ["report.inferPerFrame", `${tm.inferP50Ms.toFixed(1)} / ${tm.inferP95Ms.toFixed(1)} ms`],
    ["report.encode", ms(tm.encodeMs)],
    ["report.save", ms(tm.saveMs)],
    ["report.total", ms(tm.totalMs)],
    ["report.speed", `${ratio.toFixed(2)}×`],
    ["report.saved", `${s.opfsPath} · ${(s.ptrkBytes / 1024).toFixed(0)} KB`],
    ["report.recipe", s.recipeHash.slice(0, 16)],
  ];
}

export function RunReport({ summary }: { summary: RunSummary }) {
  const [copied, setCopied] = useState(false);
  const rows = reportRows(summary);
  const copy = async () => {
    const text = [
      `run ${summary.analysisId}`,
      ...rows.map(([k, v]) => `${t(k)}: ${v}`),
      `ua: ${navigator.userAgent}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };
  return (
    <section aria-labelledby="report-title" className="rounded-xl bg-card p-4 text-card-foreground">
      <h2 id="report-title" className="font-display text-xl font-semibold">
        {t("report.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("report.description")}</p>
      <dl className="mt-3 divide-y divide-border">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3 py-2 text-sm">
            <dt className="text-muted-foreground">{t(k)}</dt>
            <dd className="tabular-nums [overflow-wrap:anywhere]">{v}</dd>
          </div>
        ))}
      </dl>
      <Button variant="secondary" className="mt-3" onClick={() => void copy()}>
        <Copy size={20} aria-hidden="true" />
        {copied ? t("report.copied") : t("report.copy")}
      </Button>
    </section>
  );
}
