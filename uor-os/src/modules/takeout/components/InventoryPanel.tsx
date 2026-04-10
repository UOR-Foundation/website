import { useEffect, useState } from "react";
import { inventoryAll, formatBytes } from "../lib/takeout-engine";
import { TAKEOUT_CATEGORIES, type CategoryInventory } from "../lib/types";

export default function InventoryPanel() {
  const [inventory, setInventory] = useState<CategoryInventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryAll()
      .then(setInventory)
      .finally(() => setLoading(false));
  }, []);

  const totalRows = inventory.reduce((s, c) => s + c.totalRows, 0);
  const totalBytes = inventory.reduce((s, c) => s + c.totalBytes, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs text-white/40">
          {loading ? "Scanning…" : (
            <>
              <span className="text-white/80 font-semibold">{totalRows.toLocaleString()}</span> rows ·{" "}
              <span className="text-white/80 font-semibold">{formatBytes(totalBytes)}</span> estimated ·{" "}
              <span className="text-white/80 font-semibold">{TAKEOUT_CATEGORIES.length}</span> categories
            </>
          )}
        </div>
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : (
          TAKEOUT_CATEGORIES.map((cat) => {
            const inv = inventory.find((i) => i.categoryId === cat.id);
            const rows = inv?.totalRows ?? 0;
            const bytes = inv?.totalBytes ?? 0;

            return (
              <div
                key={cat.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
              >
                <span className="text-lg">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white/90">{cat.label}</div>
                  <div className="text-xs text-white/40 truncate">{cat.description}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono text-white/70">
                    {rows.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-white/30">{formatBytes(bytes)}</div>
                </div>
                <div className="flex flex-col gap-0.5">
                  {inv?.tables
                    .filter((t) => t.rowCount > 0)
                    .map((t) => (
                      <div
                        key={t.table}
                        className="text-[9px] text-white/25 font-mono"
                      >
                        {t.table} ({t.rowCount})
                      </div>
                    ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
