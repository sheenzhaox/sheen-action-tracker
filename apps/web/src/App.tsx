import { useState } from "react";
import { GearSix, ListBullets, PlusCircle, ShieldCheck, type Icon } from "@phosphor-icons/react";
import { AnalyzePanel } from "@/features/analyze/AnalyzePanel";
import { DiagnosticsPanel } from "@/features/diagnostics/DiagnosticsPanel";
import { RecordsPanel } from "@/features/records/RecordsPanel";
import { cn } from "@/lib/utils";
import { t, type MessageKey } from "@/messages";

type Tab = "records" | "import" | "settings";

const TABS: ReadonlyArray<{ id: Tab; labelKey: MessageKey; icon: Icon }> = [
  { id: "records", labelKey: "nav.records", icon: ListBullets },
  { id: "import", labelKey: "nav.import", icon: PlusCircle },
  { id: "settings", labelKey: "nav.settings", icon: GearSix },
];

export function App() {
  const [tab, setTab] = useState<Tab>("records");
  // Panels stay mounted once visited so a running analysis survives tab switches.
  const [visited, setVisited] = useState<ReadonlySet<Tab>>(new Set(["records", "import"]));
  const go = (next: Tab) => {
    setTab(next);
    setVisited((v) => (v.has(next) ? v : new Set([...v, next])));
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-[calc(max(env(safe-area-inset-bottom),8px)+88px)]">
      <header>
        <h1 className="font-display text-2xl font-bold">{t("app.title")}</h1>
        <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck size={20} aria-hidden="true" />
          {t("app.privacy")}
        </p>
      </header>

      <main>
        <div hidden={tab !== "records"}>
          <RecordsPanel active={tab === "records"} onImport={() => go("import")} />
        </div>
        <div hidden={tab !== "import"}>
          <AnalyzePanel />
        </div>
        {visited.has("settings") && (
          <div hidden={tab !== "settings"}>
            <DiagnosticsPanel />
          </div>
        )}
      </main>

      <nav
        aria-label={t("nav.label")}
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card/95 pb-[max(env(safe-area-inset-bottom),8px)] backdrop-blur"
      >
        <ul className="mx-auto flex max-w-xl">
          {TABS.map(({ id, labelKey, icon: TabIcon }) => (
            <li key={id} className="flex-1">
              <button
                type="button"
                aria-current={tab === id ? "page" : undefined}
                onClick={() => go(id)}
                className={cn(
                  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                  tab === id ? "text-primary-text" : "text-muted-foreground",
                )}
              >
                <TabIcon size={24} weight={tab === id ? "fill" : "regular"} aria-hidden="true" />
                {t(labelKey)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
