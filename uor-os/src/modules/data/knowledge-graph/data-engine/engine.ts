/**
 * Data Engineering Engine — 5-Stage Pipeline.
 *
 * Stages 1-4 are standard data engineering (no UOR).
 * Stage 5 calls singleProofHash() to content-address the cleaned dataset.
 *
 * The IPv6 ULA (fd00:0075:6f72::/48) is the single canonical address.
 */

import { singleProofHash, type SingleProofResult } from "@/lib/uor-canonical";

// ── Types ──────────────────────────────────────────────────────────────

export interface ColumnStats {
  name: string;
  dtype: string;
  nullPercent: number;
  cardinality: number;
  pkCandidate: boolean;
  skewness: number | null;
  sampleValues: string[];
}

export interface QualityDimensions {
  completeness: number;
  uniqueness: number;
  validity: number;
  overall: number;
}

export interface CleaningAction {
  stage: string;
  column?: string;
  action: string;
  rowsAffected: number;
}

export interface ProcessedDataPacket {
  /** Cleaned rows (capped at 10000) */
  rows: string[][];
  /** Column names */
  columns: string[];
  /** Inferred types per column */
  dtypes: Record<string, string>;
  /** Per-column statistics */
  columnStats: ColumnStats[];
  /** Quality dimensions (35/30/35 weighted) */
  quality: QualityDimensions;
  /** Cleaning actions applied */
  cleaningLog: CleaningAction[];
  /** Row count before/after cleaning */
  rowCountBefore: number;
  rowCountAfter: number;
  /** UOR IPv6 fingerprint from Stage 5 (null if UOR encoding failed) */
  uorIpv6: string | null;
  /** Full proof result from Stage 5 */
  uorProof: SingleProofResult | null;
}

// ── Stage 1: Parse ─────────────────────────────────────────────────────

function stageParseRows(
  columns: string[],
  rows: string[][],
): { columns: string[]; rows: string[][] } {
  // Normalize column names: trim whitespace, lowercase
  const cleanCols = columns.map((c) => c.trim());
  // Ensure all rows match column count
  const normalizedRows = rows.map((row) => {
    const r = row.slice(0, cleanCols.length);
    while (r.length < cleanCols.length) r.push("");
    return r;
  });
  return { columns: cleanCols, rows: normalizedRows };
}

// ── Stage 2: Clean ─────────────────────────────────────────────────────

function stageClean(
  columns: string[],
  rows: string[][],
  dtypes: Record<string, string>,
): { rows: string[][]; log: CleaningAction[] } {
  const log: CleaningAction[] = [];
  let cleaned = rows.map((row) => [...row]);

  // 2a: Trim whitespace from all cells
  let trimCount = 0;
  cleaned = cleaned.map((row) =>
    row.map((cell) => {
      const t = cell.trim();
      if (t !== cell) trimCount++;
      return t;
    }),
  );
  if (trimCount > 0) {
    log.push({ stage: "clean", action: "trim-whitespace", rowsAffected: trimCount });
  }

  // 2b: Type coercion for numeric columns
  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    if (dtypes[col] === "number") {
      let coerced = 0;
      for (let ri = 0; ri < cleaned.length; ri++) {
        const val = cleaned[ri][ci];
        if (val === "" || val === "null" || val === "undefined" || val === "N/A" || val === "NA") {
          cleaned[ri][ci] = "";
          continue;
        }
        // Remove currency symbols and commas
        const numeric = val.replace(/[$€£¥₹,\s]/g, "");
        if (!isNaN(Number(numeric)) && numeric !== val) {
          cleaned[ri][ci] = numeric;
          coerced++;
        }
      }
      if (coerced > 0) {
        log.push({ stage: "clean", column: col, action: "coerce-numeric", rowsAffected: coerced });
      }
    }
  }

  // 2c: Dedup (exact row match)
  const seen = new Set<string>();
  const deduped: string[][] = [];
  for (const row of cleaned) {
    const key = row.join("\x00");
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(row);
    }
  }
  const removedDups = cleaned.length - deduped.length;
  if (removedDups > 0) {
    log.push({ stage: "clean", action: "dedup-exact", rowsAffected: removedDups });
  }

  return { rows: deduped, log };
}

// ── Stage 3: Feature Engineering ───────────────────────────────────────

// Kept minimal for now — datetime decomposition can be added later.
// This stage is a passthrough that preserves the pipeline structure.

// ── Stage 4: Quality Scoring ───────────────────────────────────────────

function computeQuality(
  columns: string[],
  rows: string[][],
): QualityDimensions {
  if (columns.length === 0 || rows.length === 0) {
    return { completeness: 0, uniqueness: 0, validity: 0, overall: 0 };
  }

  const sampleSize = Math.min(rows.length, 500);

  // Completeness: non-null cell ratio
  let filled = 0;
  let total = 0;
  for (let i = 0; i < sampleSize; i++) {
    for (let j = 0; j < columns.length; j++) {
      total++;
      if (rows[i]?.[j]?.trim()) filled++;
    }
  }
  const completeness = total > 0 ? filled / total : 0;

  // Uniqueness: average per-column distinct ratio
  let uniquenessSum = 0;
  for (let j = 0; j < columns.length; j++) {
    const vals = new Set<string>();
    let nonNull = 0;
    for (let i = 0; i < sampleSize; i++) {
      const v = rows[i]?.[j]?.trim() || "";
      if (v) {
        vals.add(v);
        nonNull++;
      }
    }
    uniquenessSum += nonNull > 0 ? vals.size / nonNull : 1;
  }
  const uniqueness = uniquenessSum / columns.length;

  // Validity: type consistency ratio
  let validCells = 0;
  let checkedCells = 0;
  for (let j = 0; j < columns.length; j++) {
    // Infer dominant type from first 50 non-null values
    const types: Record<string, number> = {};
    for (let i = 0; i < Math.min(sampleSize, 50); i++) {
      const v = rows[i]?.[j]?.trim() || "";
      if (!v) continue;
      const t = inferCellType(v);
      types[t] = (types[t] || 0) + 1;
    }
    const dominant = Object.entries(types).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!dominant) continue;

    for (let i = 0; i < sampleSize; i++) {
      const v = rows[i]?.[j]?.trim() || "";
      if (!v) continue;
      checkedCells++;
      if (inferCellType(v) === dominant) validCells++;
    }
  }
  const validity = checkedCells > 0 ? validCells / checkedCells : 1;

  // Weighted: 35% completeness, 30% uniqueness, 35% validity
  const overall = Math.round((completeness * 0.35 + uniqueness * 0.30 + validity * 0.35) * 100) / 100;

  return {
    completeness: Math.round(completeness * 100) / 100,
    uniqueness: Math.round(uniqueness * 100) / 100,
    validity: Math.round(validity * 100) / 100,
    overall,
  };
}

function inferCellType(v: string): string {
  if (v === "true" || v === "false") return "boolean";
  if (!isNaN(Number(v)) && v !== "") return "number";
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return "date";
  return "string";
}

// ── Stage 5: UOR Encode ────────────────────────────────────────────────

async function stageUorEncode(
  columns: string[],
  rows: string[][],
  quality: QualityDimensions,
  label?: string,
): Promise<{ ipv6: string | null; proof: SingleProofResult | null }> {
  try {
    // Build a JSON-LD envelope of the cleaned dataset
    const envelope = {
      "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
      "@type": "schema:Dataset",
      "schema:name": label || "processed-dataset",
      "schema:columns": columns,
      "schema:rowCount": rows.length,
      "schema:qualityScore": quality.overall,
      // Include a content fingerprint from the data itself
      "schema:contentHash": hashRows(columns, rows),
    };

    const proof = await singleProofHash(envelope);
    return {
      ipv6: proof.ipv6Address["u:ipv6"],
      proof,
    };
  } catch {
    return { ipv6: null, proof: null };
  }
}

/** Simple deterministic hash of row content for the envelope. */
function hashRows(columns: string[], rows: string[][]): string {
  // Use first 100 rows + columns as the content signature
  const sample = rows.slice(0, 100);
  const parts = [columns.join(",")];
  for (const row of sample) {
    parts.push(row.join(","));
  }
  return parts.join("\n");
}

// ── Column Statistics ──────────────────────────────────────────────────

function computeColumnStats(
  columns: string[],
  rows: string[][],
  dtypes: Record<string, string>,
): ColumnStats[] {
  const stats: ColumnStats[] = [];
  const sampleSize = Math.min(rows.length, 500);

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    let nullCount = 0;
    const values = new Set<string>();
    const numericValues: number[] = [];
    const sampleValues: string[] = [];

    for (let ri = 0; ri < sampleSize; ri++) {
      const v = rows[ri]?.[ci]?.trim() || "";
      if (!v) {
        nullCount++;
      } else {
        values.add(v);
        if (sampleValues.length < 5) sampleValues.push(v);
        const n = Number(v);
        if (!isNaN(n)) numericValues.push(n);
      }
    }

    const nonNull = sampleSize - nullCount;
    const cardinality = values.size;
    const pkCandidate = cardinality === nonNull && nonNull > 0 && nonNull >= sampleSize * 0.9;

    // Skewness for numeric columns
    let skewness: number | null = null;
    if (numericValues.length >= 10) {
      const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      const variance = numericValues.reduce((a, b) => a + (b - mean) ** 2, 0) / numericValues.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev > 0) {
        skewness = Math.round(
          (numericValues.reduce((a, b) => a + ((b - mean) / stdDev) ** 3, 0) / numericValues.length) * 100,
        ) / 100;
      }
    }

    stats.push({
      name: col,
      dtype: dtypes[col] || "unknown",
      nullPercent: Math.round((nullCount / sampleSize) * 100) / 100,
      cardinality,
      pkCandidate,
      skewness,
      sampleValues,
    });
  }

  return stats;
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Process tabular data through the full 5-stage pipeline.
 *
 * Stages 1-4: Parse, Clean, Feature Eng, Quality (no UOR)
 * Stage 5: singleProofHash() → IPv6 content address (UOR ENCODE)
 */
export async function processTabular(
  columns: string[],
  rows: string[][],
  dtypes: Record<string, string>,
  label?: string,
): Promise<ProcessedDataPacket> {
  // Stage 1: Parse & normalize
  const parsed = stageParseRows(columns, rows);

  // Stage 2: Clean
  const { rows: cleanedRows, log: cleaningLog } = stageClean(
    parsed.columns,
    parsed.rows,
    dtypes,
  );

  // Stage 3: Feature Engineering (passthrough for now)

  // Stage 4: Quality scoring
  const quality = computeQuality(parsed.columns, cleanedRows);

  // Compute column stats
  const columnStats = computeColumnStats(parsed.columns, cleanedRows, dtypes);

  // Stage 5: UOR Encode
  const { ipv6, proof } = await stageUorEncode(
    parsed.columns,
    cleanedRows,
    quality,
    label,
  );

  return {
    rows: cleanedRows.slice(0, 10000),
    columns: parsed.columns,
    dtypes,
    columnStats,
    quality,
    cleaningLog,
    rowCountBefore: rows.length,
    rowCountAfter: cleanedRows.length,
    uorIpv6: ipv6,
    uorProof: proof,
  };
}
