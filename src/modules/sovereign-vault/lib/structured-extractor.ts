/**
 * Structured Data Extractor
 * ═════════════════════════
 *
 * Parses structured formats (CSV, TSV, JSON) into a unified tabular
 * representation, preserving column schemas, data types, and quality
 * metrics. Inspired by ANIMA's AutoProfiler.
 *
 * Key insight: structured data should NEVER be flattened to plain text.
 * Instead we extract schema + sample rows + quality score, and generate
 * a searchable text representation that preserves column semantics.
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface StructuredData {
  /** Column/field names */
  columns: string[];
  /** First N rows for preview (max 100) */
  rows: string[][];
  /** Total row count */
  rowCount: number;
  /** Inferred data types per column */
  dtypes: Record<string, DataType>;
  /** Data quality score 0.0–1.0 */
  qualityScore: number;
  /** Format-specific metadata */
  meta?: Record<string, string | number>;
}

export type DataType = "string" | "number" | "boolean" | "date" | "null" | "mixed";

// ── CSV/TSV Parser ─────────────────────────────────────────────────────

/**
 * Parse CSV/TSV text into structured data.
 * Handles quoted fields, embedded commas, and newlines within quotes.
 */
export function parseCSV(text: string, delimiter?: string): StructuredData {
  const det = delimiter ?? detectDelimiter(text);
  const allRows = parseCSVRows(text, det);

  if (allRows.length === 0) {
    return { columns: [], rows: [], rowCount: 0, dtypes: {}, qualityScore: 0 };
  }

  const columns = allRows[0].map((c) => c.trim());
  const dataRows = allRows.slice(1);
  const previewRows = dataRows.slice(0, 100);
  const dtypes = inferColumnTypes(columns, dataRows);
  const qualityScore = computeTabularQuality(columns, dataRows);

  return {
    columns,
    rows: previewRows,
    rowCount: dataRows.length,
    dtypes,
    qualityScore,
    meta: { delimiter: det, headerRow: "true" },
  };
}

function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0] || "";
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  if (tabCount > commaCount && tabCount > semiCount) return "\t";
  if (semiCount > commaCount) return ";";
  return ",";
}

function parseCSVRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        current.push(field);
        field = "";
      } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        current.push(field);
        field = "";
        if (current.some((c) => c.trim())) rows.push(current);
        current = [];
        if (ch === "\r") i++;
      } else {
        field += ch;
      }
    }
  }
  // Last field
  current.push(field);
  if (current.some((c) => c.trim())) rows.push(current);

  return rows;
}

// ── JSON Structured Extraction ─────────────────────────────────────────

/**
 * Parse JSON into structured data.
 * - Array of objects → tabular (keys = columns)
 * - Single object → key-value pairs
 * - Other → flatten key paths
 */
export function parseStructuredJSON(text: string): StructuredData | null {
  try {
    const parsed = JSON.parse(text);

    // Array of objects → tabular
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object" && parsed[0] !== null) {
      const allKeys = new Set<string>();
      for (const obj of parsed.slice(0, 500)) {
        if (typeof obj === "object" && obj !== null) {
          Object.keys(obj).forEach((k) => allKeys.add(k));
        }
      }
      const columns = Array.from(allKeys);
      const dataRows = parsed.map((obj) =>
        columns.map((k) => {
          const v = (obj as Record<string, unknown>)?.[k];
          return v === null || v === undefined ? "" : String(v);
        })
      );
      const previewRows = dataRows.slice(0, 100);
      const dtypes = inferColumnTypes(columns, dataRows);
      const qualityScore = computeTabularQuality(columns, dataRows);

      return {
        columns,
        rows: previewRows,
        rowCount: dataRows.length,
        dtypes,
        qualityScore,
        meta: { jsonType: "array-of-objects" },
      };
    }

    // Single object → key-value
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const entries = flattenObject(parsed as Record<string, unknown>);
      const columns = ["key", "value"];
      const rows = entries.map(([k, v]) => [k, v]);
      return {
        columns,
        rows: rows.slice(0, 100),
        rowCount: rows.length,
        dtypes: { key: "string", value: "mixed" },
        qualityScore: computeTabularQuality(columns, rows),
        meta: { jsonType: "object" },
      };
    }

    return null;
  } catch {
    return null;
  }
}

function flattenObject(obj: Record<string, unknown>, prefix = ""): [string, string][] {
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      entries.push(...flattenObject(value as Record<string, unknown>, path));
    } else {
      entries.push([path, value === null || value === undefined ? "" : String(value)]);
    }
  }
  return entries;
}

// ── Type Inference ─────────────────────────────────────────────────────

function inferColumnTypes(columns: string[], rows: string[][]): Record<string, DataType> {
  const dtypes: Record<string, DataType> = {};
  const sampleSize = Math.min(rows.length, 50);

  for (let col = 0; col < columns.length; col++) {
    const types = new Set<DataType>();
    for (let row = 0; row < sampleSize; row++) {
      const val = rows[row]?.[col]?.trim() ?? "";
      if (val === "") { types.add("null"); continue; }
      if (val === "true" || val === "false") { types.add("boolean"); continue; }
      if (!isNaN(Number(val)) && val !== "") { types.add("number"); continue; }
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) { types.add("date"); continue; }
      types.add("string");
    }

    types.delete("null");
    if (types.size === 0) dtypes[columns[col]] = "null";
    else if (types.size === 1) dtypes[columns[col]] = types.values().next().value!;
    else dtypes[columns[col]] = "mixed";
  }

  return dtypes;
}

// ── Quality Scoring ────────────────────────────────────────────────────

function computeTabularQuality(columns: string[], rows: string[][]): number {
  if (columns.length === 0 || rows.length === 0) return 0;

  let totalCells = 0;
  let filledCells = 0;
  const sampleSize = Math.min(rows.length, 200);

  for (let i = 0; i < sampleSize; i++) {
    for (let j = 0; j < columns.length; j++) {
      totalCells++;
      const val = rows[i]?.[j]?.trim() ?? "";
      if (val !== "") filledCells++;
    }
  }

  return totalCells > 0 ? Math.round((filledCells / totalCells) * 100) / 100 : 0;
}

/**
 * Compute quality score for unstructured text.
 * Based on: non-empty length, sentence count, word variety.
 */
export function computeTextQuality(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;

  // Length factor: >100 words = full marks
  const lengthScore = Math.min(words.length / 100, 1);
  // Variety: unique words / total words
  const unique = new Set(words.map((w) => w.toLowerCase()));
  const varietyScore = Math.min(unique.size / Math.max(words.length * 0.3, 1), 1);
  // Sentence structure: has punctuation
  const hasSentences = /[.!?]/.test(text) ? 1 : 0.7;

  return Math.round(((lengthScore * 0.4 + varietyScore * 0.4 + hasSentences * 0.2)) * 100) / 100;
}

// ── Searchable Text ────────────────────────────────────────────────────

/**
 * Generate a searchable text representation from structured data.
 * Preserves column names + sample values so full-text search works.
 */
export function toSearchableText(data: StructuredData): string {
  const parts: string[] = [];

  // Column names
  parts.push(`Columns: ${data.columns.join(", ")}`);
  parts.push(`${data.rowCount} rows`);

  // Sample data (first 5 rows)
  const sampleRows = data.rows.slice(0, 5);
  for (const row of sampleRows) {
    const pairs = data.columns.map((col, i) => `${col}: ${row[i] || ""}`);
    parts.push(pairs.join(" | "));
  }

  // Data types
  const typeEntries = Object.entries(data.dtypes)
    .filter(([, t]) => t !== "null")
    .map(([k, t]) => `${k}(${t})`);
  if (typeEntries.length > 0) {
    parts.push(`Types: ${typeEntries.join(", ")}`);
  }

  return parts.join("\n");
}
