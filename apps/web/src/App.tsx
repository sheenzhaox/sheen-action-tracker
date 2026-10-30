import { useState } from "react";
import { GearSix, ListBullets, PlusCircle, ShieldCheck, type Icon } from "@phosphor-icons/react";
import { AnalyzePanel } from "@/features/analyze/AnalyzePanel";
import { DiagnosticsPanel } from "@/features/diagnostics/DiagnosticsPanel";
import { RecordsPanel } from "@/features/records/RecordsPanel";
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
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span>{t("app.title")}</span>
        </div>
        <p className="app-privacy">
          <ShieldCheck size={20} aria-hidden="true" />
          {t("app.privacy")}
        </p>
      </header>

      <nav aria-label={t("nav.label")} className="app-nav">
        <ul>
          {TABS.map(({ id, labelKey, icon: TabIcon }) => (
            <li key={id}>
              <button
                type="button"
                aria-current={tab === id ? "page" : undefined}
                onClick={() => go(id)}
              >
                <TabIcon size={20} weight={tab === id ? "fill" : "regular"} aria-hidden="true" />
                {t(labelKey)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="app-main">
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
    </div>
  );
}
