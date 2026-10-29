import { ShieldCheck } from "@phosphor-icons/react";
import { DiagnosticsPanel } from "@/features/diagnostics/DiagnosticsPanel";
import { t } from "@/messages";

export function App() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <header>
        <h1 className="font-display text-2xl font-bold">{t("app.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("app.tagline")}</p>
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck size={20} aria-hidden="true" />
          {t("app.privacy")}
        </p>
      </header>
      <main>
        <DiagnosticsPanel />
      </main>
    </div>
  );
}
