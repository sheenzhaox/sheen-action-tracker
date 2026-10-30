import { useEffect, useRef, useState } from "react";
import type { PtrkTrack } from "@action-tracker/pose-core/io";
import { ArrowLeft, CheckCircle, FilmStrip, Trash, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { t } from "@/messages";
import { hashFile } from "@/pipeline/hash";
import { deleteAnalysis, loadTrack, videoKey, type AnalysisRecord } from "@/storage/analyses";
import { RunReport } from "@/features/analyze/RunReport";
import { SkeletonPlayer } from "@/features/analyze/SkeletonPlayer";
import { compareWithReference, type Comparison } from "@/features/analyze/usePipeline";
import { formatDate, settingLabel } from "./format";

type VideoState =
  | { status: "none" }
  | { status: "checking" }
  | { status: "wrong" }
  | { status: "matched"; file: File };

export function RecordDetail({
  record,
  missing,
  onClose,
}: {
  record: AnalysisRecord;
  missing: boolean;
  onClose: (deleted: boolean) => void;
}) {
  const [track, setTrack] = useState<PtrkTrack | null | "error">(null);
  const [comparison, setComparison] = useState<Comparison>({ status: "pending" });
  const [video, setVideo] = useState<VideoState>({ status: "none" });
  const [confirming, setConfirming] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const cancelHash = useRef<(() => void) | null>(null);

  useEffect(() => {
    heading.current?.focus();
    return () => cancelHash.current?.();
  }, []);

  useEffect(() => {
    if (missing) return;
    let live = true;
    loadTrack(record.id)
      .then((tr) => {
        if (!live) return;
        setTrack(tr ?? "error");
        if (tr && record.summary) void compareWithReference(record.summary, tr).then((c) => live && setComparison(c));
      })
      .catch(() => live && setTrack("error"));
    return () => {
      live = false;
    };
  }, [record, missing]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setVideo({ status: "checking" });
    cancelHash.current?.();
    const h = hashFile(file);
    cancelHash.current = h.cancel;
    try {
      const sha = await h.promise;
      setVideo(videoKey(sha, record.id) === record.videoSha256 ? { status: "matched", file } : { status: "wrong" });
    } catch {
      setVideo({ status: "wrong" });
    }
  };

  const remove = async () => {
    try {
      await deleteAnalysis(record.id);
      onClose(true);
    } catch {
      setDeleteFailed(true);
    }
  };

  const file = video.status === "matched" ? video.file : null;
  const notice = (
    <div className="mt-2 flex flex-col gap-2" aria-live="polite">
      {video.status === "matched" ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle size={18} aria-hidden="true" />
          {t("detail.videoMatched")}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t("detail.noVideo")}</p>
          {video.status === "wrong" && (
            <p role="alert" className="inline-flex items-center gap-2 text-sm text-warning">
              <Warning size={18} aria-hidden="true" />
              {t("detail.wrongVideo")}
            </p>
          )}
          <div>
            <Button variant="secondary" onClick={() => input.current?.click()} disabled={video.status === "checking"}>
              <FilmStrip size={20} aria-hidden="true" />
              {video.status === "checking" ? t("detail.checkingVideo") : t("detail.chooseVideo")}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" className="-ml-3" onClick={() => onClose(false)}>
          <ArrowLeft size={20} aria-hidden="true" />
          {t("detail.back")}
        </Button>
      </div>
      <header>
        <h2 ref={heading} tabIndex={-1} className="break-words font-display text-xl font-semibold outline-none">
          {record.fileName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("records.kind.skeleton")} · {formatDate(record.createdAt)}
        </p>
        <p className="text-sm tabular-nums text-muted-foreground">
          {(record.video.durationMs / 1000).toFixed(1)} s · {record.video.width}×{record.video.height} ·{" "}
          {Math.round(record.video.fps)} fps · {settingLabel(record)}
        </p>
      </header>
      <input
        ref={input}
        type="file"
        accept="video/*,.mov,.mp4"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void onFile(e)}
      />

      {missing && (
        <p role="alert" className="inline-flex items-start gap-2 rounded-md border border-warning p-3 text-sm">
          <Warning size={20} aria-hidden="true" className="shrink-0 text-warning" />
          {t("detail.missing")}
        </p>
      )}
      {track === "error" && (
        <p role="alert" className="inline-flex items-center gap-2 text-sm text-warning">
          <Warning size={20} aria-hidden="true" />
          {t("detail.loadFailed")}
        </p>
      )}
      {track && track !== "error" && (
        <SkeletonPlayer key={file ? "video" : "skeleton"} file={file} track={track} notice={notice} />
      )}
      {!missing &&
        (record.summary ? (
          <RunReport summary={record.summary} comparison={comparison} />
        ) : (
          <p className="text-sm text-muted-foreground">{t("detail.noReport")}</p>
        ))}

      <section className="rounded-xl bg-card p-4 text-card-foreground" aria-live="polite">
        {confirming ? (
          <>
            <p className="text-sm">{t("detail.deleteConfirm")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="destructive" onClick={() => void remove()}>
                <Trash size={20} aria-hidden="true" />
                {t("detail.deleteYes")}
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                {t("detail.deleteNo")}
              </Button>
            </div>
            {deleteFailed && (
              <p role="alert" className="mt-2 text-sm text-warning">
                {t("detail.deleteFailed")}
              </p>
            )}
          </>
        ) : (
          <Button variant="destructive" onClick={() => setConfirming(true)}>
            <Trash size={20} aria-hidden="true" />
            {t("detail.delete")}
          </Button>
        )}
      </section>
    </div>
  );
}
