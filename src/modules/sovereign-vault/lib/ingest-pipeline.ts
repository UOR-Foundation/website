/**
 * Universal Ingestion Pipeline
 * ════════════════════════════
 *
 * The ADEE-equivalent orchestrator connecting file input to UOR identity.
 * Every file, paste, or URL flows through this pipeline:
 *
 *   Input → Format Detection → UOR Content-Addressing → Structured Extraction → Quality Scoring
 *
 * Inspired by ANIMA's Adaptive Data Engineering Engine:
 *   - Format-aware parsing (CSV preserves columns, JSON preserves structure)
 *   - Quality scoring (completeness metric)
 *   - Processing lineage (audit trail of stages)
 *   - Content-addressing via universal-ingest → UOR CID
 *
 * The key insight: every piece of data, structured or unstructured,
 * gets the same UOR identity. Same content, same address, everywhere.
 */

import { ingest, type IngestResult as UorIngestResult, type ArtifactFormat } from "@/modules/uns/core/hologram/universal-ingest";
import { parseCSV, parseStructuredJSON, computeTextQuality, toSearchableText, type StructuredData } from "./structured-extractor";
import { extractText, extractFromUrl } from "./extract";

// ── Types ──────────────────────────────────────────────────────────────

export interface LineageEntry {
  stage: string;
  timestamp: string;
  detail?: string;
}

export interface PipelineResult {
  /** Extracted text (searchable representation) */
  text: string;
  /** UOR content address (hex) — same content = same address */
  uorAddress: string;
  /** UOR CID */
  uorCid: string;
  /** Detected artifact format */
  format: ArtifactFormat;
  /** Data quality score 0.0–1.0 */
  qualityScore: number;
  /** Structured data if tabular/JSON (columns, rows, dtypes) */
  structuredData?: StructuredData;
  /** Processing lineage */
  lineage: LineageEntry[];
  /** Original metadata */
  metadata: Record<string, string>;
}

// ── Large file threshold ───────────────────────────────────────────────

const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB

// ── Pipeline Orchestrator ──────────────────────────────────────────────

/**
 * Ingest a File through the full pipeline.
 *
 * 1. Extract text/structure based on format
 * 2. Route through universal-ingest for UOR CID
 * 3. Parse structured data if applicable
 * 4. Compute quality score
 * 5. Return unified PipelineResult
 */
export async function ingestFile(
  file: File,
  onProgress?: (stage: string, pct: number) => void,
): Promise<PipelineResult> {
  const lineage: LineageEntry[] = [];
  const addLineage = (stage: string, detail?: string) => {
    lineage.push({ stage, timestamp: new Date().toISOString(), detail });
  };

  addLineage("receive", `${file.name} (${file.size} bytes)`);
  onProgress?.("Detecting format…", 0.1);

  // 1. Extract text content via existing pipeline
  const { text: rawText, metadata } = await extractText(file);
  addLineage("extract", `${rawText.length} chars extracted`);
  onProgress?.("Extracting content…", 0.3);

  // 2. Route through universal-ingest for UOR identity
  let uorResult: UorIngestResult | null = null;
  let uorAddress = "";
  let uorCid = "";
  let format: ArtifactFormat = "text";

  try {
    // For large files, use a truncated sample for content-addressing
    const contentForUor = file.size > LARGE_FILE_THRESHOLD
      ? rawText.slice(0, LARGE_FILE_THRESHOLD)
      : rawText;

    uorResult = await ingest(contentForUor, {
      label: file.name,
      tags: [file.type || "unknown"],
    }) as UorIngestResult;

    uorAddress = uorResult.proof.hashHex;
    uorCid = uorResult.proof.cid;
    format = uorResult.envelope.format;
    addLineage("uor-identity", `CID: ${uorCid.slice(0, 16)}…`);
  } catch {
    // Fallback: compute simple SHA-256
    const bytes = new TextEncoder().encode(rawText);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    uorAddress = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    uorCid = uorAddress.slice(0, 32);
    format = detectFormatFromMime(file.type, file.name);
    addLineage("uor-identity-fallback", `SHA-256 hex`);
  }

  onProgress?.("Analyzing structure…", 0.6);

  // 3. Structured extraction for tabular/JSON formats
  let structuredData: StructuredData | undefined;
  let searchableText = rawText;
  let qualityScore = 0;

  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  if (isTabular(file.type, ext)) {
    // CSV/TSV
    const delimiter = ext === "tsv" ? "\t" : undefined;
    structuredData = parseCSV(rawText, delimiter);
    searchableText = toSearchableText(structuredData);
    qualityScore = structuredData.qualityScore;
    format = "csv";
    addLineage("structured-parse", `${structuredData.columns.length} columns, ${structuredData.rowCount} rows`);
  } else if (isJSON(file.type, ext)) {
    // JSON → try structured extraction
    const parsed = parseStructuredJSON(rawText);
    if (parsed) {
      structuredData = parsed;
      searchableText = toSearchableText(parsed) + "\n\n" + rawText.slice(0, 2000);
      qualityScore = parsed.qualityScore;
      format = "json";
      addLineage("structured-parse", `JSON: ${parsed.columns.length} fields, ${parsed.rowCount} entries`);
    } else {
      qualityScore = computeTextQuality(rawText);
      addLineage("text-quality", `score: ${qualityScore}`);
    }
  } else {
    qualityScore = computeTextQuality(rawText);
    addLineage("text-quality", `score: ${qualityScore}`);
  }

  onProgress?.("Complete", 1.0);
  addLineage("complete");

  return {
    text: searchableText,
    uorAddress,
    uorCid,
    format,
    qualityScore,
    structuredData,
    lineage,
    metadata,
  };
}

/**
 * Ingest pasted text through the pipeline.
 */
export async function ingestPaste(content: string, label?: string): Promise<PipelineResult> {
  const lineage: LineageEntry[] = [];
  lineage.push({ stage: "receive", timestamp: new Date().toISOString(), detail: `paste (${content.length} chars)` });

  // Try structured JSON
  let structuredData: StructuredData | undefined;
  let searchableText = content;
  let format: ArtifactFormat = "text";
  let qualityScore: number;

  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = parseStructuredJSON(content);
    if (parsed) {
      structuredData = parsed;
      searchableText = toSearchableText(parsed) + "\n\n" + content.slice(0, 2000);
      format = "json";
      qualityScore = parsed.qualityScore;
      lineage.push({ stage: "structured-parse", timestamp: new Date().toISOString() });
    } else {
      qualityScore = computeTextQuality(content);
    }
  } else {
    // Check if it looks like CSV
    const lines = content.split("\n").filter((l) => l.trim());
    if (lines.length >= 2) {
      const cols = lines[0].split(",").length;
      if (cols >= 2 && lines[1].split(",").length === cols) {
        structuredData = parseCSV(content);
        searchableText = toSearchableText(structuredData);
        format = "csv";
        qualityScore = structuredData.qualityScore;
        lineage.push({ stage: "structured-parse", timestamp: new Date().toISOString() });
      } else {
        qualityScore = computeTextQuality(content);
      }
    } else {
      qualityScore = computeTextQuality(content);
    }
  }

  // UOR identity
  let uorAddress = "";
  let uorCid = "";
  try {
    const result = await ingest(content, { label, format }) as UorIngestResult;
    uorAddress = result.proof.hashHex;
    uorCid = result.proof.cid;
  } catch {
    const bytes = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    uorAddress = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    uorCid = uorAddress.slice(0, 32);
  }

  lineage.push({ stage: "complete", timestamp: new Date().toISOString() });

  return {
    text: searchableText,
    uorAddress,
    uorCid,
    format,
    qualityScore,
    structuredData,
    lineage,
    metadata: { source: "paste", label: label || "" },
  };
}

/**
 * Ingest a URL through the pipeline.
 */
export async function ingestUrl(url: string): Promise<PipelineResult> {
  const lineage: LineageEntry[] = [];
  lineage.push({ stage: "receive", timestamp: new Date().toISOString(), detail: url });

  const { text, metadata } = await extractFromUrl(url);
  lineage.push({ stage: "extract", timestamp: new Date().toISOString(), detail: `${text.length} chars` });

  const qualityScore = computeTextQuality(text);

  let uorAddress = "";
  let uorCid = "";
  try {
    const result = await ingest(text, { label: metadata.title || url, tags: ["url"], format: "markdown" }) as UorIngestResult;
    uorAddress = result.proof.hashHex;
    uorCid = result.proof.cid;
  } catch {
    const bytes = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    uorAddress = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    uorCid = uorAddress.slice(0, 32);
  }

  lineage.push({ stage: "complete", timestamp: new Date().toISOString() });

  return {
    text,
    uorAddress,
    uorCid,
    format: "markdown",
    qualityScore,
    lineage,
    metadata,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

function isTabular(mimeType: string, ext: string): boolean {
  return (
    mimeType === "text/csv" ||
    mimeType === "text/tab-separated-values" ||
    ext === "csv" ||
    ext === "tsv"
  );
}

function isJSON(mimeType: string, ext: string): boolean {
  return (
    mimeType === "application/json" ||
    mimeType === "application/ld+json" ||
    ext === "json" ||
    ext === "jsonld"
  );
}

function detectFormatFromMime(mimeType: string, filename: string): ArtifactFormat {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (isTabular(mimeType, ext)) return "csv";
  if (isJSON(mimeType, ext)) return "json";
  if (ext === "md" || ext === "mdx") return "markdown";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/wasm") return "wasm";
  return "text";
}
