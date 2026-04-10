/**
 * Sovereign Takeout Engine
 * ════════════════════════
 *
 * Core logic for inventorying, exporting, importing, and
 * migrating the full sovereign data stack. Modeled on
 * Google Takeout's architecture with UOR seal verification.
 */

import { supabase } from "@/integrations/supabase/client";
import { sha256hex } from "@/lib/crypto";
import type {
  TakeoutArchive,
  TakeoutCategory,
  CategoryInventory,
} from "./types";
import { TAKEOUT_CATEGORIES } from "./types";

// ── Inventory ──────────────────────────────────────────────────

export async function inventoryCategory(
  cat: TakeoutCategory,
): Promise<CategoryInventory> {
  const tableResults = await Promise.all(
    cat.tables.map(async (table) => {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        const rowCount = error ? 0 : (count ?? 0);
        return { table, rowCount, estimatedBytes: rowCount * 512 };
      } catch {
        return { table, rowCount: 0, estimatedBytes: 0 };
      }
    }),
  );
  const totalRows = tableResults.reduce((s, t) => s + t.rowCount, 0);
  const totalBytes = tableResults.reduce((s, t) => s + t.estimatedBytes, 0);
  return { categoryId: cat.id, tables: tableResults, totalRows, totalBytes };
}

export async function inventoryAll(): Promise<CategoryInventory[]> {
  return Promise.all(TAKEOUT_CATEGORIES.map(inventoryCategory));
}

// ── Export ──────────────────────────────────────────────────────

async function fetchTableData(table: string): Promise<Record<string, unknown>[]> {
  const allRows: Record<string, unknown>[] = [];
  let from = 0;
  const pageSize = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    allRows.push(...(data as Record<string, unknown>[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
}

export async function exportTakeout(
  categoryIds: string[],
  onProgress?: (cat: string, pct: number) => void,
): Promise<TakeoutArchive> {
  const categories: TakeoutArchive["categories"] = {};
  let totalRows = 0;
  let totalBytes = 0;

  const selected = TAKEOUT_CATEGORIES.filter((c) => categoryIds.includes(c.id));

  for (let i = 0; i < selected.length; i++) {
    const cat = selected[i];
    onProgress?.(cat.label, Math.round((i / selected.length) * 100));

    const tableResults = await Promise.all(
      cat.tables.map(async (table) => {
        const data = await fetchTableData(table);
        return { table, rowCount: data.length, data };
      }),
    );

    categories[cat.id] = tableResults;
    totalRows += tableResults.reduce((s, t) => s + t.rowCount, 0);
  }

  onProgress?.("Sealing archive…", 95);

  const payload = JSON.stringify(categories);
  totalBytes = new TextEncoder().encode(payload).length;
  const sealHash = await sha256hex(payload);

  const archive: TakeoutArchive = {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    sealHash,
    categories,
    metadata: {
      sourceProvider: "lovable-cloud",
      totalRows,
      totalBytes,
      categoryCount: Object.keys(categories).length,
    },
  };

  onProgress?.("Complete", 100);
  return archive;
}

// ── Seal Verification ──────────────────────────────────────────

export async function verifySeal(archive: TakeoutArchive): Promise<boolean> {
  const payload = JSON.stringify(archive.categories);
  const hash = await sha256hex(payload);
  return hash === archive.sealHash;
}

// ── Import ─────────────────────────────────────────────────────

export async function importTakeout(
  archive: TakeoutArchive,
  onProgress?: (cat: string, pct: number) => void,
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  const catKeys = Object.keys(archive.categories);

  for (let i = 0; i < catKeys.length; i++) {
    const catId = catKeys[i];
    const tables = archive.categories[catId];
    const catLabel =
      TAKEOUT_CATEGORIES.find((c) => c.id === catId)?.label ?? catId;
    onProgress?.(catLabel, Math.round((i / catKeys.length) * 100));

    for (const { table, data } of tables) {
      if (data.length === 0) continue;
      // Batch insert in chunks of 500
      for (let j = 0; j < data.length; j += 500) {
        const chunk = data.slice(j, j + 500);
        const { error } = await supabase.from(table).upsert(chunk as any[], {
          onConflict: "id",
          ignoreDuplicates: true,
        });
        if (error) {
          errors.push(`${table}: ${error.message}`);
        }
      }
    }
  }

  onProgress?.("Complete", 100);
  return { success: errors.length === 0, errors };
}

// ── Download Helper ────────────────────────────────────────────

export function downloadArchive(archive: TakeoutArchive) {
  const json = JSON.stringify(archive, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sovereign-takeout-${new Date().toISOString().slice(0, 10)}.uor-takeout.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── File Reader Helper ─────────────────────────────────────────

export function readArchiveFile(file: File): Promise<TakeoutArchive> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const archive = JSON.parse(reader.result as string) as TakeoutArchive;
        if (archive.version !== "1.0.0" || !archive.sealHash) {
          reject(new Error("Invalid takeout archive format"));
          return;
        }
        resolve(archive);
      } catch {
        reject(new Error("Failed to parse archive file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// ── Formatting Helpers ─────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
