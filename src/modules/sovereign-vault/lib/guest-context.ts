/**
 * Guest Context Store — Ephemeral in-memory context for unauthenticated users.
 * Items are lost on page refresh (by design).
 *
 * Now routes through the Universal Ingestion Pipeline for UOR identity,
 * structured data extraction, and quality scoring.
 */

import { ingestFile, ingestPaste, ingestUrl, type PipelineResult, type LineageEntry } from "./ingest-pipeline";
import type { ArtifactFormat } from "@/modules/uns/core/hologram/universal-ingest";
import type { StructuredData } from "./structured-extractor";
import { ingestBridge } from "@/modules/knowledge-graph";
import type { GuestContextItem } from "./guest-context";

/** Fire-and-forget KG population */
function addToKnowledgeGraph(item: GuestContextItem): void {
  ingestBridge.addToGraph(item).catch(() => {});
}

export interface GuestContextItem {
  id: string;
  filename: string;
  text: string;
  mimeType: string;
  addedAt: string;
  createdAt: number;
  size: number;
  source: "file" | "paste" | "url" | "workspace" | "folder";
  /** UOR content address (hex) — same content = same address */
  uorAddress?: string;
  /** UOR CID */
  uorCid?: string;
  /** Detected artifact format */
  format?: ArtifactFormat;
  /** Data quality score 0.0–1.0 */
  qualityScore?: number;
  /** Structured data for tabular/JSON (columns, rows, dtypes) */
  structuredData?: StructuredData;
  /** Processing lineage */
  lineage?: LineageEntry[];
}

let items: GuestContextItem[] = [];
let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((fn) => fn());
}

function makeId(): string {
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function byteLength(str: string): number {
  try { return new TextEncoder().encode(str).byteLength; } catch { return str.length; }
}

export const guestContext = {
  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },

  getAll(): GuestContextItem[] {
    return [...items];
  },

  /**
   * Check if an item with the same UOR address already exists (duplicate detection).
   */
  findByUorAddress(address: string): GuestContextItem | undefined {
    return items.find((i) => i.uorAddress === address);
  },

  async addFile(file: File): Promise<GuestContextItem> {
    // Route through Universal Ingestion Pipeline
    let pipeline: PipelineResult | null = null;
    try {
      pipeline = await ingestFile(file);
    } catch {
      // Fallback: direct text read
    }

    const now = Date.now();
    const text = pipeline?.text || "";
    const item: GuestContextItem = {
      id: makeId(),
      filename: file.name,
      text,
      mimeType: file.type || "text/plain",
      addedAt: new Date(now).toISOString(),
      createdAt: now,
      size: file.size || byteLength(text),
      source: "file",
      uorAddress: pipeline?.uorAddress,
      uorCid: pipeline?.uorCid,
      format: pipeline?.format,
      qualityScore: pipeline?.qualityScore,
      structuredData: pipeline?.structuredData,
      lineage: pipeline?.lineage,
    };
    items = [...items, item];
    emit();

    // Populate Knowledge Graph (fire-and-forget)
    addToKnowledgeGraph(item);

    return item;
  },

  addPaste(content: string, label?: string): GuestContextItem {
    const now = Date.now();
    const item: GuestContextItem = {
      id: makeId(),
      filename: label || `Pasted text (${new Date(now).toLocaleTimeString()})`,
      text: content,
      mimeType: "text/plain",
      addedAt: new Date(now).toISOString(),
      createdAt: now,
      size: byteLength(content),
      source: "paste",
    };
    items = [...items, item];
    emit();

    // Run pipeline async to enrich with UOR identity
    ingestPaste(content, label).then((result) => {
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const enriched = { ...items[idx], uorAddress: result.uorAddress, uorCid: result.uorCid, format: result.format, qualityScore: result.qualityScore, structuredData: result.structuredData, lineage: result.lineage, text: result.text };
        items = items.map((i) => i.id === item.id ? enriched : i);
        emit();
        // Populate KG with enriched item
        addToKnowledgeGraph(enriched);
      }
    }).catch(() => {});

    return item;
  },

  async addUrl(url: string): Promise<GuestContextItem> {
    let pipeline: PipelineResult | null = null;
    try {
      pipeline = await ingestUrl(url);
    } catch {
      // Fallback
    }

    const now = Date.now();
    const text = pipeline?.text || `[Could not fetch: ${url}]`;
    const item: GuestContextItem = {
      id: makeId(),
      filename: pipeline?.metadata?.title || url,
      text,
      mimeType: "text/html",
      addedAt: new Date(now).toISOString(),
      createdAt: now,
      size: byteLength(text),
      source: "url",
      uorAddress: pipeline?.uorAddress,
      uorCid: pipeline?.uorCid,
      format: pipeline?.format,
      qualityScore: pipeline?.qualityScore,
      lineage: pipeline?.lineage,
    };
    items = [...items, item];
    emit();

    // Populate Knowledge Graph
    addToKnowledgeGraph(item);

    return item;
  },

  remove(id: string) {
    items = items.filter((i) => i.id !== id);
    emit();
  },

  addWorkspace(name: string): GuestContextItem {
    const now = Date.now();
    const text = JSON.stringify({ "@type": "vault:Workspace", name, createdAt: new Date(now).toISOString() });
    const item: GuestContextItem = {
      id: makeId(),
      filename: name || "Untitled Workspace",
      text,
      mimeType: "application/json",
      addedAt: new Date(now).toISOString(),
      createdAt: now,
      size: byteLength(text),
      source: "workspace",
    };
    items = [...items, item];
    emit();
    return item;
  },

  addFolder(name: string): GuestContextItem {
    const now = Date.now();
    const text = JSON.stringify({ "@type": "vault:Folder", name, createdAt: new Date(now).toISOString() });
    const item: GuestContextItem = {
      id: makeId(),
      filename: name || "Untitled Folder",
      text,
      mimeType: "application/json",
      addedAt: new Date(now).toISOString(),
      createdAt: now,
      size: byteLength(text),
      source: "folder",
    };
    items = [...items, item];
    emit();
    return item;
  },

  clear() {
    items = [];
    emit();
  },
};
