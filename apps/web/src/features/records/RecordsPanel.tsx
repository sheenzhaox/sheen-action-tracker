import { useCallback, useEffect, useRef, useState } from "react";
import { CaretRight, FilmStrip, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { t } from "@/messages";
import { listAnalyses, reconcileStorage, type AnalysisRecord } from "@/storage/analyses";
import { RecordDetail } from "./RecordDetail";
import { formatDate, settingLabel } from "./format";

// Reconcile OPFS with IndexedDB once per page load (02 §12), before the first listing.
let reconcileOnce: ReturnType<typeof reconcileStorage> | undefined;

export function RecordsPanel({ active, onImport }: { active: boolean; onImport: () => void }) {
  const [records, setRecords] = useState<AnalysisRecord[] | null>(null);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async () => {
    try {
      reconcileOnce ??= reconcileStorage();
      const r = await reconcileOnce;
      setMissing(r.missing);
      setRecords(await listAnalyses());
      setFailed(false);
    } catch {
      reconcileOnce = undefined;
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const close = (deleted: boolean) => {
    setOpenId(null);
    if (deleted) void load();
    requestAnimationFrame(() => listRef.current?.focus());
  };

  const open = records?.find((r) => r.id === openId);
  if (open) return <RecordDetail record={open} missing={missing.has(open.id)} onClose={close} />;

  return (
    <section aria-labelledby="records-title" className="flex flex-col gap-4">
      <h2 id="records-title" ref={listRef} tabIndex={-1} className="font-display text-xl font-semibold outline-none">
        {t("records.title")}
      </h2>

      {failed && (
        <p role="alert" className="inline-flex items-center gap-2 text-sm text-warning">
          <Warning size={20} aria-hidden="true" />
          {t("records.loadFailed")}
        </p>
      )}

      {!failed && records === null && <p className="text-sm text-muted-foreground">{t("records.loading")}</p>}

      {records?.length === 0 && (
        <div className="rounded-xl bg-card p-6 text-center text-card-foreground">
          <p className="font-display text-lg font-semibold">{t("records.empty.title")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("records.empty.body")}</p>
          <ul className="mx-auto mt-2 max-w-xs list-disc pl-5 text-left text-sm text-muted-foreground">
            <li>{t("records.empty.tip1")}</li>
            <li>{t("records.empty.tip2")}</li>
            <li>{t("records.empty.tip3")}</li>
          </ul>
          <Button className="mt-4" onClick={onImport}>
            <FilmStrip size={20} aria-hidden="true" />
            {t("records.import")}
          </Button>
        </div>
      )}

      {records && records.length > 0 && (
        <>
          <ul className="flex flex-col gap-3">
            {records.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(r.id)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-card p-4 text-left text-card-foreground transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.fileName}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {t("records.kind.skeleton")} · {formatDate(r.createdAt)}
                    </span>
                    <span className="mt-0.5 block text-sm tabular-nums text-muted-foreground">
                      {(r.video.durationMs / 1000).toFixed(1)} s · {r.video.width}×{r.video.height} ·{" "}
                      {Math.round(r.video.fps)} fps · {settingLabel(r)}
                    </span>
                    <span className="mt-0.5 block text-sm tabular-nums text-muted-foreground">
                      {r.framesWithPose} / {r.frames} {t("records.framesWithPose")}
                    </span>
                    {(missing.has(r.id) || r.recovered) && (
                      <span className="mt-1 flex flex-wrap gap-2">
                        {missing.has(r.id) && (
                          <span className="inline-flex items-center gap-1 rounded-sm border border-warning px-2 py-0.5 text-xs text-warning">
                            <Warning size={14} aria-hidden="true" />
                            {t("records.missing")}
                          </span>
                        )}
                        {r.recovered && (
                          <span className="inline-flex items-center rounded-sm border border-input px-2 py-0.5 text-xs text-muted-foreground">
                            {t("records.recovered")}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  <CaretRight size={20} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("records.storage")}</p>
        </>
      )}
    </section>
  );
}
