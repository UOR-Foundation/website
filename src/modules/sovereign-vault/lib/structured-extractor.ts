/**
 * Structured Data Extractor
 * ═════════════════════════
 *
 * Parses structured formats (CSV, TSV, JSON, Markdown tables, YAML, XML)
 * into a unified tabular representation, preserving column schemas,
 * data types, and quality metrics.
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

/** Explicit TSV parser (first-class support). */
export function parseTSV(text: string): StructuredData {
  return parseCSV(text, "\t");
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

// ── Markdown Table Parser ──────────────────────────────────────────────

/**
 * Extract the first table from Markdown (pipe-delimited syntax).
 * Returns null if no valid Markdown table is found.
 */
export function parseMarkdownTable(text: string): StructuredData | null {
  const lines = text.split("\n");
  const tableLines: string[] = [];
  let inTable = false;
  let separatorIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (inTable) break; // end of table
      continue;
    }

    // A line with pipes is a potential table row
    if (line.includes("|")) {
      // Check if it's a separator row (| --- | --- |)
      if (/^\|?\s*[-:]+[-|\s:]+\s*\|?$/.test(line)) {
        if (tableLines.length === 1) {
          separatorIdx = tableLines.length;
          tableLines.push(line);
          inTable = true;
          continue;
        }
      }
      tableLines.push(line);
      if (separatorIdx === -1 && tableLines.length === 1) continue;
      if (inTable) continue;
    } else if (inTable) {
      break;
    }
  }

  if (separatorIdx === -1 || tableLines.length < 3) return null;

  const parsePipeRow = (line: string): string[] =>
    line.split("|").map((c) => c.trim()).filter((_, i, arr) =>
      // Remove empty first/last from leading/trailing pipes
      !(i === 0 && arr[0] === "") && !(i === arr.length - 1 && arr[arr.length - 1] === "")
    );

  const columns = parsePipeRow(tableLines[0]);
  const dataRows = tableLines.slice(2).map(parsePipeRow);
  // Normalize row lengths to match columns
  const normalizedRows = dataRows.map((row) => {
    while (row.length < columns.length) row.push("");
    return row.slice(0, columns.length);
  });

  const previewRows = normalizedRows.slice(0, 100);
  const dtypes = inferColumnTypes(columns, normalizedRows);
  const qualityScore = computeTabularQuality(columns, normalizedRows);

  return {
    columns,
    rows: previewRows,
    rowCount: normalizedRows.length,
    dtypes,
    qualityScore,
    meta: { format: "markdown-table" },
  };
}

// ── YAML Parser (lightweight, zero-dependency) ─────────────────────────

/**
 * Parse simple YAML into structured key-value data.
 * Handles flat key: value pairs and simple lists.
 * Does NOT handle nested YAML beyond one level (keeps it dependency-free).
 */
export function parseYAML(text: string): StructuredData | null {
  const lines = text.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (lines.length === 0) return null;

  const entries: [string, string][] = [];
  let currentKey = "";

  for (const line of lines) {
    // Skip document markers
    if (line.trim() === "---" || line.trim() === "...") continue;

    // key: value
    const kvMatch = line.match(/^(\s*)([^:\s][^:]*?):\s*(.*)$/);
    if (kvMatch) {
      const indent = kvMatch[1].length;
      const key = kvMatch[2].trim();
      const value = kvMatch[3].trim();

      if (indent === 0) {
        currentKey = key;
        if (value) {
          // Strip quotes
          const cleanVal = value.replace(/^["']|["']$/g, "");
          entries.push([key, cleanVal]);
        }
      } else if (currentKey) {
        const cleanVal = value.replace(/^["']|["']$/g, "");
        entries.push([`${currentKey}.${key}`, cleanVal]);
      }
      continue;
    }

    // List item: - value
    const listMatch = line.match(/^(\s*)-\s+(.+)$/);
    if (listMatch && currentKey) {
      entries.push([`${currentKey}[]`, listMatch[2].trim()]);
    }
  }

  if (entries.length === 0) return null;

  const columns = ["key", "value"];
  const rows = entries.map(([k, v]) => [k, v]);

  return {
    columns,
    rows: rows.slice(0, 100),
    rowCount: rows.length,
    dtypes: { key: "string", value: "mixed" },
    qualityScore: computeTabularQuality(columns, rows),
    meta: { format: "yaml" },
  };
}

// ── XML Parser (browser-native DOMParser) ──────────────────────────────

/**
 * Parse XML into structured tabular data using browser-native DOMParser.
 * Treats repeated child elements as rows and their tag names as columns.
 */
export function parseXML(text: string): StructuredData | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "application/xml");

    // Check for parse errors
    const errorNode = doc.querySelector("parsererror");
    if (errorNode) return null;

    const root = doc.documentElement;
    if (!root) return null;

    // Strategy: find the most-repeated child element type → those are rows
    const childCounts = new Map<string, number>();
    for (const child of Array.from(root.children)) {
      childCounts.set(child.tagName, (childCounts.get(child.tagName) || 0) + 1);
    }

    // If no repeated children, try one level deeper
    let rowParent: Element = root;
    let rowTag = "";
    let maxCount = 0;
    for (const [tag, count] of childCounts) {
      if (count > maxCount) {
        maxCount = count;
        rowTag = tag;
      }
    }

    // If root has only one child type with count=1, go deeper
    if (maxCount === 1 && root.children.length === 1) {
      const inner = root.children[0];
      const innerCounts = new Map<string, number>();
      for (const child of Array.from(inner.children)) {
        innerCounts.set(child.tagName, (innerCounts.get(child.tagName) || 0) + 1);
      }
      for (const [tag, count] of innerCounts) {
        if (count > maxCount) {
          maxCount = count;
          rowTag = tag;
          rowParent = inner;
        }
      }
    }

    if (maxCount < 2) {
      // Fallback: treat root attributes + children as key-value
      const entries: [string, string][] = [];
      for (const attr of Array.from(root.attributes)) {
        entries.push([`@${attr.name}`, attr.value]);
      }
      const extractKV = (el: Element, prefix: string) => {
        for (const child of Array.from(el.children)) {
          const key = prefix ? `${prefix}.${child.tagName}` : child.tagName;
          if (child.children.length === 0) {
            entries.push([key, child.textContent?.trim() || ""]);
          } else {
            extractKV(child, key);
          }
        }
      };
      extractKV(root, "");

      if (entries.length === 0) return null;

      return {
        columns: ["key", "value"],
        rows: entries.slice(0, 100),
        rowCount: entries.length,
        dtypes: { key: "string", value: "mixed" },
        qualityScore: computeTabularQuality(["key", "value"], entries),
        meta: { format: "xml", rootTag: root.tagName },
      };
    }

    // Extract columns from row elements
    const rowElements = Array.from(rowParent.getElementsByTagName(rowTag));
    const allColumns = new Set<string>();
    for (const row of rowElements.slice(0, 100)) {
      for (const attr of Array.from(row.attributes)) {
        allColumns.add(`@${attr.name}`);
      }
      for (const child of Array.from(row.children)) {
        allColumns.add(child.tagName);
      }
    }

    const columns = Array.from(allColumns);
    const dataRows = rowElements.map((row) =>
      columns.map((col) => {
        if (col.startsWith("@")) {
          return row.getAttribute(col.slice(1)) || "";
        }
        const child = row.getElementsByTagName(col)[0];
        return child?.textContent?.trim() || "";
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
      meta: { format: "xml", rootTag: root.tagName, rowTag },
    };
  } catch {
    return null;
  }
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
 * Preserves column names + sample values + data type summaries
 * so full-text search works across the knowledge graph.
 */
export function toSearchableText(data: StructuredData): string {
  const parts: string[] = [];

  // Column names
  parts.push(`Columns: ${data.columns.join(", ")}`);
  parts.push(`${data.rowCount} rows`);

  // Data types summary
  const typeEntries = Object.entries(data.dtypes)
    .filter(([, t]) => t !== "null")
    .map(([k, t]) => `${k}(${t})`);
  if (typeEntries.length > 0) {
    parts.push(`Types: ${typeEntries.join(", ")}`);
  }

  // Sample data (first 5 rows)
  const sampleRows = data.rows.slice(0, 5);
  for (const row of sampleRows) {
    const pairs = data.columns.map((col, i) => `${col}: ${row[i] || ""}`);
    parts.push(pairs.join(" | "));
  }

  // Format metadata
  if (data.meta?.format) {
    parts.push(`Format: ${data.meta.format}`);
  }

  return parts.join("\n");
}

// ── Unified Format Detection ───────────────────────────────────────────

/**
 * Attempt structured parsing across all supported formats.
 * Returns the first successful parse, or null.
 */
export function parseAnyStructured(text: string, mimeType?: string, ext?: string): StructuredData | null {
  // Try by MIME type first
  if (mimeType === "text/csv" || ext === "csv") return parseCSV(text);
  if (mimeType === "text/tab-separated-values" || ext === "tsv") return parseTSV(text);
  if (mimeType === "application/json" || mimeType === "application/ld+json" || ext === "json" || ext === "jsonld") {
    return parseStructuredJSON(text);
  }
  if (mimeType === "text/yaml" || mimeType === "application/x-yaml" || ext === "yaml" || ext === "yml") {
    return parseYAML(text);
  }
  if (mimeType === "text/xml" || mimeType === "application/xml" || ext === "xml") {
    return parseXML(text);
  }

  // Try content-based detection
  const trimmed = text.trim();

  // JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const r = parseStructuredJSON(text);
    if (r) return r;
  }

  // XML
  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) {
    const r = parseXML(text);
    if (r) return r;
  }

  // Markdown table
  if (trimmed.includes("|") && trimmed.includes("---")) {
    const r = parseMarkdownTable(text);
    if (r) return r;
  }

  // YAML (heuristic: multiple key: value lines)
  if (/^[a-zA-Z_][a-zA-Z0-9_]*:\s/m.test(trimmed)) {
    const r = parseYAML(text);
    if (r && r.rowCount >= 2) return r;
  }

  // CSV (heuristic)
  const lines = trimmed.split("\n").filter((l) => l.trim());
  if (lines.length >= 2) {
    const cols = lines[0].split(",").length;
    if (cols >= 2 && lines[1].split(",").length === cols) {
      return parseCSV(text);
    }
  }

  return null;
}
