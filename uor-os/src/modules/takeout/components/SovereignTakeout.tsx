/**
 * Sovereign Takeout — Main App.
 * ═════════════════════════════
 *
 * Google-Takeout-style full data portability for the sovereign stack.
 * Four tabs: Inventory · Export · Import · Migrate.
 */

import { useState } from "react";
import InventoryPanel from "./InventoryPanel";
import ExportPanel from "./ExportPanel";
import ImportPanel from "./ImportPanel";
import MigratePanel from "./MigratePanel";
import { Package, Download, Upload, ArrowRightLeft } from "lucide-react";

const TABS = [
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "export",    label: "Export",    icon: Download },
  { id: "import",    label: "Import",    icon: Upload },
  { id: "migrate",   label: "Migrate",   icon: ArrowRightLeft },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SovereignTakeout() {
  const [tab, setTab] = useState<TabId>("inventory");

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-xl rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-3 pt-3 pb-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`
                flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-medium transition-all
                ${active
                  ? "bg-white/[0.06] text-white/90 border-b-2 border-white/20"
                  : "text-white/40 hover:text-white/60 hover:bg-white/[0.03]"
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="h-px bg-white/[0.06]" />

      {/* Panel */}
      <div className="flex-1 overflow-hidden">
        {tab === "inventory" && <InventoryPanel />}
        {tab === "export"    && <ExportPanel />}
        {tab === "import"    && <ImportPanel />}
        {tab === "migrate"   && <MigratePanel />}
      </div>
    </div>
  );
}
