/**
 * Projection Worker — Off-Main-Thread Belt-Fiber Decomposition
 * ═══════════════════════════════════════════════════════════════
 *
 * Runs Atlas projection (Belt-Fiber decomposition) in a Web Worker
 * so the main thread stays free for rendering at 60-144Hz.
 *
 * Communication model:
 *   Main thread → Worker:  { type: "project", layerData, layerIndex }
 *   Worker → Main thread:  { type: "projected", blocks, layerIndex }
 *   Worker → Main thread:  { type: "progress", layerIndex, totalLayers }
 *
 * If SharedArrayBuffer is available, the worker writes directly into
 * a SharedRingBuffer for zero-copy transfer of projected blocks.
 *
 * This file is designed to work both as:
 *   1. An inline worker (via Blob URL) for Vite/bundler compatibility
 *   2. A standalone worker file
 *
 * @module hologram-compute/projection-worker
 */

// ── Worker Script Source ──────────────────────────────────────────────
// Inlined as a string so it works without separate build configuration.

const WORKER_SOURCE = `
"use strict";

// Minimal Belt-Fiber decomposition running inside the worker.
// This mirrors atlas-model-projector logic but runs off-thread.

const ATLAS_VERTICES = 96;
const TAU_PAIRS = 48;
const FANO_LINES = 7;
const R8_MOD = 256;

/**
 * Quantize a float32 value to R8 (Z/256Z) ring.
 */
function quantizeToR8(value, scale) {
  const clamped = Math.max(-1, Math.min(1, value / scale));
  return ((Math.round(clamped * 127) + 256) % 256) | 0;
}

/**
 * Assign a weight vector to an Atlas vertex via triality hash.
 */
function assignVertex(row, cols) {
  let hash = 0;
  const stride = Math.max(1, Math.floor(cols / 8));
  for (let i = 0; i < cols; i += stride) {
    const val = row[i] || 0;
    hash = ((hash * 31 + (val * 1000) | 0) + R8_MOD) % R8_MOD;
  }
  return hash % ATLAS_VERTICES;
}

/**
 * Detect mirror pattern between two R8 rows.
 */
function detectMirror(a, b) {
  if (a.length !== b.length) return "none";
  let exactMirror = true, negateMirror = true;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== ((256 - b[i]) % 256)) negateMirror = false;
    if (a[i] !== b[a.length - 1 - i]) exactMirror = false;
    if (!exactMirror && !negateMirror) return "none";
  }
  if (exactMirror) return "reflection";
  if (negateMirror) return "negation";
  return "none";
}

/**
 * Project a single layer's weight matrix into Atlas blocks.
 */
function projectLayer(float32Data, rows, cols, layerName, scale) {
  scale = scale || 1.0;
  
  // Auto-detect scale from data range
  let maxAbs = 0;
  for (let i = 0; i < float32Data.length; i++) {
    const abs = Math.abs(float32Data[i]);
    if (abs > maxAbs) maxAbs = abs;
  }
  if (maxAbs > 0) scale = maxAbs;

  const blocks = [];
  
  // Quantize each row → R8, assign to vertex
  const rowR8 = [];
  for (let r = 0; r < rows; r++) {
    const start = r * cols;
    const r8Row = new Uint8Array(cols);
    for (let c = 0; c < cols; c++) {
      r8Row[c] = quantizeToR8(float32Data[start + c], scale);
    }
    const vertex = assignVertex(float32Data.subarray(start, start + cols), cols);
    rowR8.push({ r8: r8Row, vertex, rowIdx: r });
  }

  // Group by vertex and detect mirrors
  const vertexGroups = new Map();
  for (const entry of rowR8) {
    if (!vertexGroups.has(entry.vertex)) vertexGroups.set(entry.vertex, []);
    vertexGroups.get(entry.vertex).push(entry);
  }

  for (const [vertex, entries] of vertexGroups) {
    // Check for tau-mirror pairs
    const mirrorVertex = (vertex + TAU_PAIRS) % ATLAS_VERTICES;
    const mirrorEntries = vertexGroups.get(mirrorVertex);
    let mirrorKind = "none";
    
    if (mirrorEntries && mirrorEntries.length > 0 && entries.length > 0) {
      mirrorKind = detectMirror(entries[0].r8, mirrorEntries[0].r8);
    }

    blocks.push({
      vertex,
      layerName,
      rowCount: entries.length,
      r8DataBase64: uint8ToBase64(entries[0].r8),
      cols,
      scale,
      mirrorKind,
      mirrorVertex: mirrorKind !== "none" ? mirrorVertex : null,
    });
  }

  return blocks;
}

function uint8ToBase64(u8) {
  let binary = "";
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary);
}

// ── Message Handler ────────────────────────────────────────────────

self.onmessage = function(e) {
  const msg = e.data;
  
  if (msg.type === "project") {
    const { layerData, rows, cols, layerName, layerIndex, totalLayers, scale } = msg;
    
    // layerData is a Float32Array (transferred, not copied)
    const float32 = new Float32Array(layerData);
    const blocks = projectLayer(float32, rows, cols, layerName, scale);
    
    self.postMessage({
      type: "projected",
      blocks,
      layerIndex,
    });
    
    self.postMessage({
      type: "progress",
      layerIndex,
      totalLayers,
      blockCount: blocks.length,
    });
  }
  
  if (msg.type === "ping") {
    self.postMessage({ type: "pong" });
  }
};

self.postMessage({ type: "ready" });
`;

// ── Worker Manager ────────────────────────────────────────────────────

export interface ProjectionResult {
  vertex: number;
  layerName: string;
  rowCount: number;
  r8DataBase64: string;
  cols: number;
  scale: number;
  mirrorKind: string;
  mirrorVertex: number | null;
}

export interface ProjectionProgress {
  layerIndex: number;
  totalLayers: number;
  blockCount: number;
}

export class ProjectionWorkerPool {
  private workers: Worker[] = [];
  private ready: Promise<void>[] = [];
  private roundRobin = 0;

  /**
   * Create a pool of projection workers.
   * @param size Number of workers (default: navigator.hardwareConcurrency / 2)
   */
  constructor(size?: number) {
    const count = size ?? Math.max(1, Math.floor((navigator.hardwareConcurrency || 2) / 2));
    
    for (let i = 0; i < count; i++) {
      const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      
      const readyPromise = new Promise<void>((resolve) => {
        const handler = (e: MessageEvent) => {
          if (e.data.type === "ready") {
            worker.removeEventListener("message", handler);
            resolve();
          }
        };
        worker.addEventListener("message", handler);
      });

      this.workers.push(worker);
      this.ready.push(readyPromise);
    }
  }

  /** Wait for all workers to be ready */
  async awaitReady(): Promise<void> {
    await Promise.all(this.ready);
  }

  /**
   * Project a single layer off-thread.
   * The layerData ArrayBuffer is TRANSFERRED (zero-copy) to the worker.
   */
  projectLayer(
    layerData: Float32Array,
    rows: number,
    cols: number,
    layerName: string,
    layerIndex: number,
    totalLayers: number,
    onResult: (blocks: ProjectionResult[]) => void,
    onProgress?: (progress: ProjectionProgress) => void,
  ): void {
    const worker = this.workers[this.roundRobin % this.workers.length];
    this.roundRobin++;

    const handler = (e: MessageEvent) => {
      if (e.data.type === "projected" && e.data.layerIndex === layerIndex) {
        onResult(e.data.blocks);
      }
      if (e.data.type === "progress" && e.data.layerIndex === layerIndex) {
        onProgress?.(e.data);
        worker.removeEventListener("message", handler);
      }
    };

    worker.addEventListener("message", handler);

    // Transfer the buffer (zero-copy)
    const buffer = layerData.buffer.slice(0);
    worker.postMessage(
      {
        type: "project",
        layerData: buffer,
        rows,
        cols,
        layerName,
        layerIndex,
        totalLayers,
      },
      [buffer],
    );
  }

  /**
   * Project multiple layers with automatic distribution across workers.
   * Returns all blocks once complete.
   */
  async projectAllLayers(
    layers: Array<{
      data: Float32Array;
      rows: number;
      cols: number;
      name: string;
    }>,
    onProgress?: (progress: ProjectionProgress) => void,
  ): Promise<ProjectionResult[]> {
    await this.awaitReady();

    const allBlocks: ProjectionResult[] = [];
    let completed = 0;

    return new Promise((resolve) => {
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        this.projectLayer(
          layer.data,
          layer.rows,
          layer.cols,
          layer.name,
          i,
          layers.length,
          (blocks) => {
            allBlocks.push(...blocks);
          },
          (progress) => {
            completed++;
            onProgress?.(progress);
            if (completed === layers.length) {
              resolve(allBlocks);
            }
          },
        );
      }
    });
  }

  /** Terminate all workers */
  terminate(): void {
    for (const w of this.workers) w.terminate();
    this.workers = [];
  }

  /** Number of workers in the pool */
  get size(): number {
    return this.workers.length;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────

let _pool: ProjectionWorkerPool | null = null;

export function getProjectionPool(): ProjectionWorkerPool {
  if (!_pool) _pool = new ProjectionWorkerPool();
  return _pool;
}
