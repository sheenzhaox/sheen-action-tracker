import type { AnalysisRecord } from "@/storage/analyses";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFormat.format(d);
}

const MODEL_LABEL: Record<string, string> = { full: "Full", lite: "Lite", heavy: "Heavy" };

export function settingLabel(r: Pick<AnalysisRecord, "model" | "inferenceLongEdge">): string {
  return `${MODEL_LABEL[r.model] ?? r.model} · ${r.inferenceLongEdge} px`;
}
