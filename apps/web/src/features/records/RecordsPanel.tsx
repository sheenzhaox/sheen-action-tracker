import { useCallback, useEffect, useRef, useState } from "react";
import { CaretRight, CheckCircle, FilmStrip, Warning } from "@phosphor-icons/react";
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
  const featured = records?.[0];
  if (open) {
    return (
      <div className="record-detail">
        <RecordDetail record={open} missing={missing.has(open.id)} onClose={close} />
      </div>
    );
  }

  return (
    <section aria-labelledby="records-title" className="records-page">
      <div className="page-intro">
        <div>
          <p className="page-eyebrow">{t("records.eyebrow")}</p>
          <h1 id="records-title" ref={listRef} tabIndex={-1} className="page-title outline-none">
            {t("records.title")}
          </h1>
          <p className="page-description">{t("records.description")}</p>
        </div>
        <Button className="records-import" onClick={onImport}>
          <FilmStrip size={20} aria-hidden="true" />
          {t("records.import")}
        </Button>
      </div>

      {failed && (
        <p role="alert" className="inline-flex items-center gap-2 text-sm text-warning">
          <Warning size={20} aria-hidden="true" />
          {t("records.loadFailed")}
        </p>
      )}

      {!failed && records === null && <p className="text-sm text-muted-foreground">{t("records.loading")}</p>}

      {records?.length === 0 && (
        <div className="records-empty">
          <p className="page-eyebrow">{t("records.empty.eyebrow")}</p>
          <h2>{t("records.empty.title")}</h2>
          <p className="empty-description">{t("records.empty.body")}</p>
          <ul>
            <li>{t("records.empty.tip1")}</li>
            <li>{t("records.empty.tip2")}</li>
            <li>{t("records.empty.tip3")}</li>
          </ul>
        </div>
      )}

      {featured && (
        <>
          <section aria-labelledby="featured-record-title" className="featured-record-section">
            <div className="section-label">
              <span>{t("records.featured")}</span>
              <span>01 / {String(records.length).padStart(2, "0")}</span>
            </div>
            <button
              type="button"
              onClick={() => setOpenId(featured.id)}
              className="record-feature"
            >
              <span className="record-feature-count">
                <span className="feature-eyebrow">{t("records.poseFrames")}</span>
                <span className="feature-number tabular-nums">{featured.framesWithPose}</span>
                <span className="feature-unit">{t("records.framesWithPose")}</span>
              </span>
              <span className="record-feature-info">
                <span className="feature-eyebrow">{t("records.kind.skeleton")} / {formatDate(featured.createdAt)}</span>
                <span id="featured-record-title" className="feature-title">{featured.fileName}</span>
                <span className="feature-meta tabular-nums">
                  {(featured.video.durationMs / 1000).toFixed(1)} s · {featured.video.width}×{featured.video.height} ·{" "}
                  {Math.round(featured.video.fps)} fps
                </span>
                <span className="feature-meta">{settingLabel(featured)} · {featured.frames} {t("records.frames")}</span>
                <span className={missing.has(featured.id) ? "feature-status warning" : "feature-status valid"}>
                  {missing.has(featured.id) ? (
                    <Warning size={18} aria-hidden="true" />
                  ) : (
                    <CheckCircle size={18} aria-hidden="true" />
                  )}
                  {missing.has(featured.id) ? t("records.missing") : t("records.poseTrackAvailable")}
                </span>
                {featured.recovered && <span className="feature-recovered">{t("records.recovered")}</span>}
                <span className="feature-open">{t("records.open")} <CaretRight size={20} aria-hidden="true" /></span>
              </span>
            </button>
          </section>

          {records.length > 1 && (
            <section className="records-list" aria-labelledby="session-log-title">
              <div className="section-label">
                <span id="session-log-title">{t("records.sessionLog")}</span>
                <span>{t("records.storage")}</span>
              </div>
              <ul>
                {records.slice(1).map((r, index) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => setOpenId(r.id)} className="record-row">
                      <span className="record-index">{String(index + 2).padStart(2, "0")}</span>
                      <span className="record-row-main">
                        <span className="record-row-title">{r.fileName}</span>
                        <span className="record-row-sub">{t("records.kind.skeleton")} / {formatDate(r.createdAt)}</span>
                      </span>
                      <span className="record-row-meta tabular-nums">
                        {(r.video.durationMs / 1000).toFixed(1)} s · {r.video.width}×{r.video.height} · {Math.round(r.video.fps)} fps
                      </span>
                      <CaretRight size={20} aria-hidden="true" className="record-row-arrow" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </section>
  );
}
