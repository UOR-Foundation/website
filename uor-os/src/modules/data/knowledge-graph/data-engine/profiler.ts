/**
 * AutoProfiler — Statistical Learning for Data Sources.
 *
 * Accumulates samples per source pattern (filename, MIME type),
 * learns optimal processing parameters, and persists profiles
 * in IndexedDB for reuse on returning sources.
 *
 * No UOR involvement — this is pure statistical learning.
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface ProcessingProfile {
  /** Source pattern key (e.g., "csv:sales-*.csv") */
  sourceKey: string;
  /** Number of files seen with this pattern */
  sampleCount: number;
  /** Learned column schema */
  expectedColumns: string[];
  /** Dominant data types per column */
  expectedDtypes: Record<string, string>;
  /** Null handling strategy */
  nullStrategy: "drop" | "mean" | "median" | "mode" | "empty";
  /** Outlier detection method */
  outlierMethod: "iqr" | "zscore" | "none";
  /** Whether to deduplicate rows */
  dedup: boolean;
  /** Type coercion confidence threshold */
  coercionThreshold: number;
  /** Average quality score from past ingestions */
  avgQuality: number;
  /** Last updated */
  updatedAt: number;
}

// ── IndexedDB Store ────────────────────────────────────────────────────

const DB_NAME = "uor-kg-profiles";
const DB_VERSION = 1;
const STORE_NAME = "profiles";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "sourceKey" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Source Key Generation ──────────────────────────────────────────────

/**
 * Generate a source key from filename and MIME type.
 * Groups similar files together (e.g., "csv:report-*.csv").
 */
export function deriveSourceKey(filename: string, mimeType: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "unknown";
  // Strip numeric suffixes for pattern matching
  const base = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]\d+$/, "")
    .replace(/\(\d+\)$/, "")
    .trim();
  return `${ext}:${base}`;
}

// ── Column Stats Accumulation ──────────────────────────────────────────

interface ColumnSample {
  nullPercent: number;
  cardinality: number;
  dtype: string;
}

function inferNullStrategy(
  columns: Map<string, ColumnSample[]>,
): "drop" | "mean" | "median" | "mode" | "empty" {
  let avgNullPercent = 0;
  let numericCount = 0;
  let total = 0;

  for (const [, samples] of columns) {
    for (const s of samples) {
      avgNullPercent += s.nullPercent;
      total++;
      if (s.dtype === "number") numericCount++;
    }
  }

  if (total === 0) return "empty";
  avgNullPercent /= total;

  // High nulls → drop rows, Low nulls with numerics → mean
  if (avgNullPercent > 0.3) return "drop";
  if (numericCount > total * 0.5) return "mean";
  return "mode";
}

// ── Public API ─────────────────────────────────────────────────────────

export const autoProfiler = {
  /**
   * Record a new data sample and update the profile.
   */
  async recordSample(
    filename: string,
    mimeType: string,
    columns: string[],
    dtypes: Record<string, string>,
    qualityScore: number,
    columnStats?: Array<{ name: string; nullPercent: number; cardinality: number }>,
  ): Promise<ProcessingProfile> {
    const sourceKey = deriveSourceKey(filename, mimeType);
    const db = await openDB();

    // Get existing profile
    const t = db.transaction(STORE_NAME, "readwrite");
    const store = t.objectStore(STORE_NAME);
    const existing: ProcessingProfile | undefined = await req(store.get(sourceKey));

    const sampleCount = (existing?.sampleCount || 0) + 1;

    // Build column samples for null strategy inference
    const colSamples = new Map<string, ColumnSample[]>();
    for (const col of columns) {
      const stat = columnStats?.find((s) => s.name === col);
      const sample: ColumnSample = {
        nullPercent: stat?.nullPercent || 0,
        cardinality: stat?.cardinality || 0,
        dtype: dtypes[col] || "string",
      };
      const prev = existing ? (colSamples.get(col) || []) : [];
      prev.push(sample);
      colSamples.set(col, prev);
    }

    const profile: ProcessingProfile = {
      sourceKey,
      sampleCount,
      expectedColumns: columns,
      expectedDtypes: dtypes,
      nullStrategy: inferNullStrategy(colSamples),
      outlierMethod: sampleCount >= 3 ? "iqr" : "none",
      dedup: true,
      coercionThreshold: 0.8,
      avgQuality: existing
        ? (existing.avgQuality * (sampleCount - 1) + qualityScore) / sampleCount
        : qualityScore,
      updatedAt: Date.now(),
    };

    await req(store.put(profile));
    return profile;
  },

  /**
   * Look up an existing profile for a source.
   */
  async getProfile(filename: string, mimeType: string): Promise<ProcessingProfile | undefined> {
    const sourceKey = deriveSourceKey(filename, mimeType);
    const db = await openDB();
    const t = db.transaction(STORE_NAME, "readonly");
    const store = t.objectStore(STORE_NAME);
    return req(store.get(sourceKey));
  },

  /**
   * List all stored profiles.
   */
  async getAllProfiles(): Promise<ProcessingProfile[]> {
    const db = await openDB();
    const t = db.transaction(STORE_NAME, "readonly");
    const store = t.objectStore(STORE_NAME);
    return req(store.getAll());
  },
};
