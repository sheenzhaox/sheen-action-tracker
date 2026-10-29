import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Info, Question, X } from "@phosphor-icons/react";
import { HealthResponse } from "@action-tracker/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t, type MessageKey } from "@/messages";
import { formatReport, runProbes, type ProbeResult, type ProbeStatus } from "./probes";

// Green is reserved for metric `valid` (MASTER §3.2), so capability status uses neutral/warning colours + icon + text.
const statusStyle: Record<ProbeStatus, { icon: typeof Check; className: string; labelKey: MessageKey }> = {
  supported: { icon: Check, className: "text-foreground", labelKey: "diag.status.supported" },
  unsupported: { icon: X, className: "text-warning", labelKey: "diag.status.unsupported" },
  unknown: { icon: Question, className: "text-muted-foreground", labelKey: "diag.status.unknown" },
  info: { icon: Info, className: "text-muted-foreground", labelKey: "diag.status.info" },
};

async function probeApi(): Promise<ProbeResult> {
  try {
    const res = await fetch("/api/health");
    const body = HealthResponse.safeParse(await res.json());
    return {
      id: "api",
      labelKey: "diag.api",
      status: res.ok && body.success ? "supported" : "unsupported",
      detail: `HTTP ${res.status}`,
    };
  } catch (e) {
    return { id: "api", labelKey: "diag.api", status: "unsupported", detail: String(e) };
  }
}

export function DiagnosticsPanel() {
  const [results, setResults] = useState<ProbeResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setCopied(false);
    try {
      const [probes, api] = await Promise.all([runProbes(), probeApi()]);
      setResults([api, ...probes]);
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const copy = async () => {
    if (!results) return;
    await navigator.clipboard.writeText(formatReport(results));
    setCopied(true);
  };

  return (
    <section aria-labelledby="diag-title" className="rounded-xl bg-card p-4 text-card-foreground">
      <h2 id="diag-title" className="font-display text-xl font-semibold">
        {t("diag.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("diag.description")}</p>

      <ul className="mt-4 divide-y divide-border" aria-busy={running}>
        {results?.map((r) => {
          const s = statusStyle[r.status];
          const Icon = s.icon;
          return (
            <li key={r.id} className="flex min-h-11 flex-col justify-center gap-0.5 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[15px]">{t(r.labelKey)}</span>
                <span className={cn("inline-flex shrink-0 items-center gap-1 text-sm font-medium", s.className)}>
                  <Icon size={18} weight="bold" aria-hidden="true" />
                  {t(s.labelKey)}
                </span>
              </div>
              {r.detail && <span className="break-all font-mono text-xs text-muted-foreground">{r.detail}</span>}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => void run()} disabled={running}>
          {running ? t("diag.running") : t("diag.run")}
        </Button>
        <Button variant="secondary" onClick={() => void copy()} disabled={!results || running}>
          <Copy size={20} aria-hidden="true" />
          {copied ? t("diag.copied") : t("diag.copy")}
        </Button>
      </div>
    </section>
  );
}
