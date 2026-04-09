/**
 * Universal Ingestion Pipeline
 * ════════════════════════════
 *
 * The orchestrator connecting file input to UOR identity.
 * Every file, paste, or URL flows through this pipeline:
 *
 *   Input → Raw Audit → Format Detection → UOR Content-Addressing →
 *   Structured Extraction → Quality Scoring → Knowledge Graph
 *
 * Key improvements over baseline:
 *   - Full-content SHA-256 hashing (no truncation for large files)
 *   - Immutable raw-bytes audit via rawStore (before any processing)
 *   - Expanded format support: CSV, TSV, JSON, YAML, XML, Markdown tables
 *   - Binary file ingestion (metadata-only KG nodes)
 *   - Processing lineage preserved for KG derivations
 *
 * Same content, same address, everywhere.
 */

import { ingest, type IngestResult as UorIngestResult, type ArtifactFormat } from "@/modules/uns/core/hologram/universal-ingest";
import {
  parseCSV, parseTSV, parseStructuredJSON, parseYAML, parseXML,
  parseMarkdownTable, parseAnyStructured,
  computeTextQuality, toSearchableText,
  type StructuredData,
} from "./structured-extractor";
import { extractText, extractFromUrl } from "./extract";
import { rawStore } from "@/modules/knowledge-graph/raw-store";

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

// ── Helpers ────────────────────────────────────────────────────────────

/** SHA-256 hex digest of an ArrayBuffer (streaming-compatible). */
async function sha256ArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 hex digest of a string. */
async function sha256String(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  return sha256ArrayBuffer(bytes.buffer as ArrayBuffer);
}

function addLineage(lineage: LineageEntry[], stage: string, detail?: string) {
  lineage.push({ stage, timestamp: new Date().toISOString(), detail });
}

// ── Pipeline Orchestrator ──────────────────────────────────────────────

/**
 * Ingest a File through the full pipeline.
 * No truncation — full content is hashed regardless of file size.
 */
export async function ingestFile(
  file: File,
  onProgress?: (stage: string, pct: number) => void,
): Promise<PipelineResult> {
  const lineage: LineageEntry[] = [];
  addLineage(lineage, "receive", `${file.name} (${file.size} bytes)`);
  onProgress?.("Detecting format…", 0.1);

  // 1. Read full ArrayBuffer for content-addressing (no truncation)
  const arrayBuffer = await file.arrayBuffer();
  const fullHash = await sha256ArrayBuffer(arrayBuffer);
  addLineage(lineage, "hash", `SHA-256 of ${file.size} bytes`);

  // 2. Extract text content
  const { text: rawText, metadata } = await extractText(file);
  addLineage(lineage, "extract", `${rawText.length} chars extracted`);
  onProgress?.("Extracting content…", 0.3);

  // 3. Record immutable audit BEFORE any processing
  try {
    await rawStore.putRawBinary({
      uorAddress: fullHash,
      buffer: arrayBuffer,
      mimeType: file.type || "application/octet-stream",
      filename: file.name,
      source: "file",
    });
    addLineage(lineage, "audit", "raw bytes recorded");
  } catch {
    addLineage(lineage, "audit-skip", "audit store unavailable");
  }

  // 4. Route through universal-ingest for UOR identity
  let uorAddress = fullHash;
  let uorCid = fullHash.slice(0, 32);
  let format: ArtifactFormat = "text";

  try {
    const uorResult = await ingest(rawText, {
      label: file.name,
      tags: [file.type || "unknown"],
    }) as UorIngestResult;

    uorAddress = uorResult.proof.hashHex;
    uorCid = uorResult.proof.cid;
    format = uorResult.envelope.format;
    addLineage(lineage, "uor-identity", `CID: ${uorCid.slice(0, 16)}…`);
  } catch {
    format = detectFormatFromMime(file.type, file.name);
    addLineage(lineage, "uor-identity-fallback", `SHA-256 full-content hash`);
  }

  onProgress?.("Analyzing structure…", 0.6);

  // 5. Structured extraction — try all supported formats
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  let structuredData: StructuredData | undefined;
  let searchableText = rawText;
  let qualityScore = 0;

  if (isTabular(file.type, ext)) {
    structuredData = ext === "tsv" ? parseTSV(rawText) : parseCSV(rawText);
    searchableText = toSearchableText(structuredData);
    qualityScore = structuredData.qualityScore;
    format = "csv";
    addLineage(lineage, "structured-parse", `${structuredData.columns.length} columns, ${structuredData.rowCount} rows`);
  } else if (isJSON(file.type, ext)) {
    const parsed = parseStructuredJSON(rawText);
    if (parsed) {
      structuredData = parsed;
      searchableText = toSearchableText(parsed) + "\n\n" + rawText.slice(0, 2000);
      qualityScore = parsed.qualityScore;
      format = "json";
      addLineage(lineage, "structured-parse", `JSON: ${parsed.columns.length} fields, ${parsed.rowCount} entries`);
    } else {
      qualityScore = computeTextQuality(rawText);
      addLineage(lineage, "text-quality", `score: ${qualityScore}`);
    }
  } else if (isYAML(file.type, ext)) {
    const parsed = parseYAML(rawText);
    if (parsed) {
      structuredData = parsed;
      searchableText = toSearchableText(parsed) + "\n\n" + rawText.slice(0, 2000);
      qualityScore = parsed.qualityScore;
      addLineage(lineage, "structured-parse", `YAML: ${parsed.rowCount} entries`);
    } else {
      qualityScore = computeTextQuality(rawText);
    }
  } else if (isXML(file.type, ext)) {
    const parsed = parseXML(rawText);
    if (parsed) {
      structuredData = parsed;
      searchableText = toSearchableText(parsed) + "\n\n" + rawText.slice(0, 2000);
      qualityScore = parsed.qualityScore;
      addLineage(lineage, "structured-parse", `XML: ${parsed.columns.length} fields, ${parsed.rowCount} rows`);
    } else {
      qualityScore = computeTextQuality(rawText);
    }
  } else if (isMarkdown(file.type, ext)) {
    // Try to extract tables from Markdown
    const parsed = parseMarkdownTable(rawText);
    if (parsed) {
      structuredData = parsed;
      searchableText = rawText + "\n\n" + toSearchableText(parsed);
      qualityScore = Math.max(parsed.qualityScore, computeTextQuality(rawText));
      addLineage(lineage, "structured-parse", `Markdown table: ${parsed.columns.length} columns`);
    } else {
      qualityScore = computeTextQuality(rawText);
    }
    format = "markdown";
  } else {
    // Attempt auto-detection for unknown formats
    const autoParsed = parseAnyStructured(rawText);
    if (autoParsed) {
      structuredData = autoParsed;
      searchableText = toSearchableText(autoParsed) + "\n\n" + rawText.slice(0, 2000);
      qualityScore = autoParsed.qualityScore;
      addLineage(lineage, "structured-parse", `Auto-detected: ${autoParsed.meta?.format || "unknown"}`);
    } else {
      qualityScore = computeTextQuality(rawText);
      addLineage(lineage, "text-quality", `score: ${qualityScore}`);
    }
  }

  onProgress?.("Complete", 1.0);
  addLineage(lineage, "complete");

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
 * Ingest a binary file that cannot be text-extracted.
 * Creates a metadata-only KG node with full UOR identity.
 */
export async function ingestBinary(
  file: File,
  onProgress?: (stage: string, pct: number) => void,
): Promise<PipelineResult> {
  const lineage: LineageEntry[] = [];
  addLineage(lineage, "receive", `binary: ${file.name} (${file.size} bytes)`);
  onProgress?.("Hashing binary content…", 0.3);

  const arrayBuffer = await file.arrayBuffer();
  const fullHash = await sha256ArrayBuffer(arrayBuffer);

  // Record audit
  try {
    await rawStore.putRawBinary({
      uorAddress: fullHash,
      buffer: arrayBuffer,
      mimeType: file.type || "application/octet-stream",
      filename: file.name,
      source: "file",
    });
    addLineage(lineage, "audit", "raw bytes recorded");
  } catch {
    addLineage(lineage, "audit-skip", "audit store unavailable");
  }

  let uorAddress = fullHash;
  let uorCid = fullHash.slice(0, 32);

  try {
    const uorResult = await ingest(`[binary:${file.name}:${file.size}:${fullHash}]`, {
      label: file.name,
      tags: [file.type || "binary"],
    }) as UorIngestResult;
    uorAddress = uorResult.proof.hashHex;
    uorCid = uorResult.proof.cid;
    addLineage(lineage, "uor-identity", `CID: ${uorCid.slice(0, 16)}…`);
  } catch {
    addLineage(lineage, "uor-identity-fallback", "SHA-256 full binary hash");
  }

  onProgress?.("Complete", 1.0);
  addLineage(lineage, "complete");

  const metaText = `Binary file: ${file.name}\nType: ${file.type}\nSize: ${file.size} bytes\nSHA-256: ${fullHash}`;

  return {
    text: metaText,
    uorAddress,
    uorCid,
    format: detectFormatFromMime(file.type, file.name),
    qualityScore: 0.5, // Binary files get a baseline score
    lineage,
    metadata: {
      filename: file.name,
      mimeType: file.type,
      size: String(file.size),
      sha256: fullHash,
    },
  };
}

/**
 * Ingest pasted text through the pipeline.
 */
export async function ingestPaste(content: string, label?: string): Promise<PipelineResult> {
  const lineage: LineageEntry[] = [];
  addLineage(lineage, "receive", `paste (${content.length} chars)`);

  // Audit record
  try {
    await rawStore.putRaw({
      uorAddress: await sha256String(content),
      rawText: content,
      size: new TextEncoder().encode(content).byteLength,
      mimeType: "text/plain",
      source: "paste",
    });
    addLineage(lineage, "audit", "raw text recorded");
  } catch {
    addLineage(lineage, "audit-skip", "audit store unavailable");
  }

  // Try all structured formats via auto-detection
  let structuredData: StructuredData | undefined;
  let searchableText = content;
  let format: ArtifactFormat = "text";
  let qualityScore: number;

  const autoParsed = parseAnyStructured(content);
  if (autoParsed) {
    structuredData = autoParsed;
    searchableText = toSearchableText(autoParsed) + "\n\n" + content.slice(0, 2000);
    format = (autoParsed.meta?.format as ArtifactFormat) || "text";
    qualityScore = autoParsed.qualityScore;
    addLineage(lineage, "structured-parse", `Auto: ${autoParsed.meta?.format || "detected"}`);
  } else {
    qualityScore = computeTextQuality(content);
    addLineage(lineage, "text-quality", `score: ${qualityScore}`);
  }

  // UOR identity
  let uorAddress = "";
  let uorCid = "";
  try {
    const result = await ingest(content, { label, format }) as UorIngestResult;
    uorAddress = result.proof.hashHex;
    uorCid = result.proof.cid;
    addLineage(lineage, "uor-identity", `CID: ${uorCid.slice(0, 16)}…`);
  } catch {
    uorAddress = await sha256String(content);
    uorCid = uorAddress.slice(0, 32);
    addLineage(lineage, "uor-identity-fallback", "SHA-256 hex");
  }

  addLineage(lineage, "complete");

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
  addLineage(lineage, "receive", url);

  const { text, metadata } = await extractFromUrl(url);
  addLineage(lineage, "extract", `${text.length} chars`);

  // Audit record
  try {
    await rawStore.putRaw({
      uorAddress: await sha256String(text),
      rawText: text,
      size: new TextEncoder().encode(text).byteLength,
      mimeType: "text/html",
      source: "url",
    });
    addLineage(lineage, "audit", "raw text recorded");
  } catch {
    addLineage(lineage, "audit-skip", "audit store unavailable");
  }

  // Try structured extraction on URL content
  let structuredData: StructuredData | undefined;
  let searchableText = text;
  const autoParsed = parseAnyStructured(text);
  if (autoParsed) {
    structuredData = autoParsed;
    searchableText = text + "\n\n" + toSearchableText(autoParsed);
    addLineage(lineage, "structured-parse", `URL content: ${autoParsed.meta?.format || "detected"}`);
  }

  const qualityScore = computeTextQuality(text);

  let uorAddress = "";
  let uorCid = "";
  try {
    const result = await ingest(text, { label: metadata.title || url, tags: ["url"], format: "markdown" }) as UorIngestResult;
    uorAddress = result.proof.hashHex;
    uorCid = result.proof.cid;
    addLineage(lineage, "uor-identity", `CID: ${uorCid.slice(0, 16)}…`);
  } catch {
    uorAddress = await sha256String(text);
    uorCid = uorAddress.slice(0, 32);
    addLineage(lineage, "uor-identity-fallback", "SHA-256 hex");
  }

  addLineage(lineage, "complete");

  return {
    text: searchableText,
    uorAddress,
    uorCid,
    format: "markdown",
    qualityScore,
    structuredData,
    lineage,
    metadata,
  };
}

// ── Format Detection Helpers ──────────────────────────────────────────

function isTabular(mimeType: string, ext: string): boolean {
  return mimeType === "text/csv" || mimeType === "text/tab-separated-values" || ext === "csv" || ext === "tsv";
}

function isJSON(mimeType: string, ext: string): boolean {
  return mimeType === "application/json" || mimeType === "application/ld+json" || ext === "json" || ext === "jsonld";
}

function isYAML(mimeType: string, ext: string): boolean {
  return mimeType === "text/yaml" || mimeType === "application/x-yaml" || ext === "yaml" || ext === "yml";
}

function isXML(mimeType: string, ext: string): boolean {
  return mimeType === "text/xml" || mimeType === "application/xml" || ext === "xml";
}

function isMarkdown(mimeType: string, ext: string): boolean {
  return mimeType === "text/markdown" || ext === "md" || ext === "mdx";
}

function detectFormatFromMime(mimeType: string, filename: string): ArtifactFormat {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (isTabular(mimeType, ext)) return "csv";
  if (isJSON(mimeType, ext)) return "json";
  if (isMarkdown(mimeType, ext)) return "markdown";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/wasm") return "wasm";
  return "text";
}
