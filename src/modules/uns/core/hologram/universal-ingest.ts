/**
 * Universal Ingest — Any Digital Artifact → Content-Addressed UOR Object
 * ═══════════════════════════════════════════════════════════════════════
 *
 * The holographic principle applied to ingestion:
 *   Every digital artifact — WASM module, ELF binary, AI model weights,
 *   JSON document, image, PDF — is a hologram waiting to be projected.
 *
 * Ingest takes raw bytes and wraps them in a content-addressed JSON-LD
 * envelope, making them first-class UOR citizens that can be:
 *   - Identified (CID, DID, IPv6, ActivityPub…)
 *   - Processed (through Lens pipelines)
 *   - Executed (via ExecutableBlueprint + Engine)
 *   - Stored (dehydrate to canonical bytes)
 *   - Verified (round-trip through singleProofHash)
 *
 * Design: ONE function (`ingest`) with progressive disclosure.
 *   - Basic: ingest(bytes) → IngestResult (identity only)
 *   - With blueprint: ingest(bytes, { executable: true }) → spawnable
 *   - With engine: ingest(bytes, { engine }) → running process
 *
 * The key insight: singleProofHash already handles any object via
 * URDNA2015 wrapping. Universal Ingest adds only:
 *   1. Format detection (MIME type inference)
 *   2. Typed envelope (preserves format metadata)
 *   3. Blueprint generation (optional)
 *   4. Engine spawning (optional)
 *
 * Zero new identity primitives. Zero new hashing. Pure composition.
 *
 * @module uns/core/hologram/universal-ingest
 */

import { singleProofHash, type SingleProofResult } from "@/lib/uor-canonical";
import { project, type Hologram, type ProjectionInput } from "./index";
import {
  createExecutableBlueprint,
  type ExecutableBlueprint,
  STATIC_SCHEDULER,
} from "./executable-blueprint";
import type { HologramEngine } from "./engine";
import type { SchedulerSpec } from "./executable-blueprint";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Supported artifact formats.
 *
 * The ingest layer detects format from magic bytes or explicit declaration.
 * Each format maps to a MIME type and processing strategy.
 */
export type ArtifactFormat =
  | "wasm"          // WebAssembly module
  | "json"          // JSON document
  | "jsonld"        // JSON-LD document (has @context)
  | "text"          // Plain text / source code
  | "binary"        // Opaque binary blob
  | "image"         // Image data (PNG, JPEG, WebP, SVG)
  | "nquads"        // W3C URDNA2015 N-Quads
  | "csv"           // Tabular data
  | "markdown";     // Markdown document

/**
 * The content-addressed envelope wrapping any ingested artifact.
 *
 * This IS the JSON-LD document that enters singleProofHash.
 * Its identity is derived from the content, not the metadata.
 */
export interface IngestEnvelope {
  readonly "@type": "uor:IngestEnvelope";
  /** Detected or declared format. */
  readonly format: ArtifactFormat;
  /** MIME type. */
  readonly mimeType: string;
  /** Size in bytes of the original artifact. */
  readonly byteLength: number;
  /** SHA-256 hex of the raw bytes (pre-envelope). */
  readonly contentHash: string;
  /** The content payload — base64 for binary, raw for text/JSON. */
  readonly payload: string | Record<string, unknown>;
  /** Optional human-readable label. */
  readonly label?: string;
  /** Optional tags for searchability. */
  readonly tags?: readonly string[];
  /** Ingestion timestamp. */
  readonly ingestedAt: string;
}

/**
 * The result of ingesting an artifact.
 *
 * Contains the content-addressed identity, the envelope, and the
 * full hologram (all protocol projections).
 */
export interface IngestResult {
  /** The content-addressed proof (CID, hex, derivation ID, etc.). */
  readonly proof: SingleProofResult;
  /** The typed envelope. */
  readonly envelope: IngestEnvelope;
  /** The full hologram — all protocol projections. */
  readonly hologram: Hologram;
  /** Projection input for downstream use. */
  readonly identity: ProjectionInput;
}

/**
 * Extended result when an executable blueprint is generated.
 */
export interface IngestExecutableResult extends IngestResult {
  /** The generated ExecutableBlueprint. */
  readonly blueprint: ExecutableBlueprint;
}

/**
 * Extended result when the artifact is spawned in an engine.
 */
export interface IngestSpawnedResult extends IngestExecutableResult {
  /** The process ID in the engine. */
  readonly pid: string;
}

// ── Format Detection ───────────────────────────────────────────────────────

/** MIME type mapping for each format. */
const MIME_TYPES: Record<ArtifactFormat, string> = {
  wasm: "application/wasm",
  json: "application/json",
  jsonld: "application/ld+json",
  text: "text/plain",
  binary: "application/octet-stream",
  image: "image/png",
  nquads: "application/n-quads",
  csv: "text/csv",
  markdown: "text/markdown",
};

/**
 * Detect format from raw bytes using magic number signatures.
 */
function detectFormat(bytes: Uint8Array): ArtifactFormat {
  if (bytes.length < 4) return "binary";

  // WASM magic: \0asm
  if (bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d) {
    return "wasm";
  }

  // PNG magic: \x89PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image";
  }

  // JPEG magic: \xFF\xD8\xFF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image";
  }

  // Try to decode as UTF-8 text
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

    // JSON-LD (has @context)
    if (text.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(text);
        if (parsed["@context"]) return "jsonld";
        return "json";
      } catch {
        // Not valid JSON, fall through
      }
    }

    // N-Quads (lines with angle brackets and dots)
    if (text.includes("<") && text.includes("> .")) return "nquads";

    // CSV (comma-separated with consistent column count)
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length >= 2) {
      const cols = lines[0].split(",").length;
      if (cols >= 2 && lines[1].split(",").length === cols) return "csv";
    }

    // Markdown (starts with # or contains ## headers)
    if (text.startsWith("#") || text.includes("\n## ")) return "markdown";

    return "text";
  } catch {
    return "binary";
  }
}

// ── Core Ingest Function ───────────────────────────────────────────────────

/**
 * Ingest any digital artifact into the UOR framework.
 *
 * This is the universal entry point. Any bytes become a content-addressed
 * UOR object with a full hologram of protocol projections.
 *
 * Progressive disclosure:
 *   - ingest(bytes)                        → IngestResult (identity only)
 *   - ingest(bytes, { executable: true })  → IngestExecutableResult
 *   - ingest(bytes, { engine })            → IngestSpawnedResult
 *
 * @param input   Raw bytes, string, or structured object to ingest.
 * @param options Optional: format override, label, executable generation, engine spawning.
 */
export async function ingest(
  input: Uint8Array | string | Record<string, unknown>,
  options?: {
    /** Override auto-detected format. */
    format?: ArtifactFormat;
    /** Human-readable label. */
    label?: string;
    /** Tags for searchability. */
    tags?: string[];
    /** Generate an ExecutableBlueprint for this artifact. */
    executable?: boolean;
    /** Scheduler spec for the generated blueprint. */
    scheduler?: SchedulerSpec;
    /** Engine to spawn the artifact in (implies executable: true). */
    engine?: HologramEngine;
  },
): Promise<IngestResult | IngestExecutableResult | IngestSpawnedResult> {
  // 1. Normalize input to bytes
  const { bytes, payload, format } = normalizeInput(input, options?.format);

  // 2. Compute raw content hash
  const rawHashBytes = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes) as unknown as ArrayBuffer);
  const contentHash = Array.from(new Uint8Array(rawHashBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // 3. Build the envelope
  const envelope: IngestEnvelope = {
    "@type": "uor:IngestEnvelope",
    format,
    mimeType: MIME_TYPES[format],
    byteLength: bytes.byteLength,
    contentHash,
    payload,
    label: options?.label,
    tags: options?.tags,
    ingestedAt: new Date().toISOString(),
  };

  // 4. Content-address the envelope through singleProofHash
  const proof = await singleProofHash(envelope);
  const identity: ProjectionInput = {
    hashBytes: proof.hashBytes,
    cid: proof.cid,
    hex: proof.hashHex,
  };
  const hologram = project(identity);

  const baseResult: IngestResult = { proof, envelope, hologram, identity };

  // 5. Generate ExecutableBlueprint if requested
  if (options?.executable || options?.engine) {
    const blueprint = createIngestBlueprint(envelope, proof, options?.scheduler);
    const execResult: IngestExecutableResult = { ...baseResult, blueprint };

    // 6. Spawn in engine if provided
    if (options?.engine) {
      const pid = await options.engine.spawn(blueprint);
      return { ...execResult, pid } as IngestSpawnedResult;
    }

    return execResult;
  }

  return baseResult;
}

// ── Input Normalization ────────────────────────────────────────────────────

function normalizeInput(
  input: Uint8Array | string | Record<string, unknown>,
  formatOverride?: ArtifactFormat,
): { bytes: Uint8Array; payload: string | Record<string, unknown>; format: ArtifactFormat } {
  if (input instanceof Uint8Array) {
    const format = formatOverride ?? detectFormat(input);
    // Text-like formats: decode to string payload
    if (["json", "jsonld", "text", "nquads", "csv", "markdown"].includes(format)) {
      const text = new TextDecoder().decode(input);
      if (format === "json" || format === "jsonld") {
        try {
          return { bytes: input, payload: JSON.parse(text), format };
        } catch {
          return { bytes: input, payload: text, format: "text" };
        }
      }
      return { bytes: input, payload: text, format };
    }
    // Binary formats: base64 encode
    return { bytes: input, payload: uint8ToBase64(input), format };
  }

  if (typeof input === "string") {
    const bytes = new TextEncoder().encode(input);
    const format = formatOverride ?? detectFormat(bytes);
    return { bytes, payload: input, format };
  }

  // Structured object
  const json = JSON.stringify(input);
  const bytes = new TextEncoder().encode(json);
  const format = formatOverride ?? (input["@context"] ? "jsonld" : "json");
  return { bytes, payload: input, format };
}

function uint8ToBase64(bytes: Uint8Array): string {
  const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join("");
  return btoa(binary);
}

// ── Blueprint Generation ───────────────────────────────────────────────────

/**
 * Create an ExecutableBlueprint that processes the ingested artifact.
 *
 * The blueprint uses a passthrough lens (the artifact IS the data)
 * with an identity element that echoes the envelope's proof.
 */
function createIngestBlueprint(
  envelope: IngestEnvelope,
  proof: SingleProofResult,
  scheduler?: SchedulerSpec,
): ExecutableBlueprint {
  return createExecutableBlueprint({
    name: envelope.label ?? `ingest:${envelope.format}:${proof.cid.slice(0, 12)}`,
    description: `Ingested ${envelope.format} artifact (${envelope.byteLength} bytes)`,
    tags: [...(envelope.tags ?? []), `format:${envelope.format}`, "ingested"],
    elements: [
      {
        id: "identity",
        kind: "identity",
        config: {},
      },
    ],
    scheduler: scheduler ?? STATIC_SCHEDULER,
  });
}

// ── Convenience Functions ──────────────────────────────────────────────────

/**
 * Ingest a JSON document.
 */
export async function ingestJson(
  data: Record<string, unknown>,
  options?: { label?: string; tags?: string[] },
): Promise<IngestResult> {
  return ingest(data, { format: "json", ...options }) as Promise<IngestResult>;
}

/**
 * Ingest a JSON-LD document (preserves @context).
 */
export async function ingestJsonLd(
  data: Record<string, unknown>,
  options?: { label?: string; tags?: string[] },
): Promise<IngestResult> {
  return ingest(data, { format: "jsonld", ...options }) as Promise<IngestResult>;
}

/**
 * Ingest raw text (source code, markdown, plain text).
 */
export async function ingestText(
  text: string,
  options?: { format?: "text" | "markdown" | "csv" | "nquads"; label?: string; tags?: string[] },
): Promise<IngestResult> {
  return ingest(text, { format: options?.format ?? "text", ...options }) as Promise<IngestResult>;
}

/**
 * Ingest binary data (WASM, images, arbitrary blobs).
 */
export async function ingestBinary(
  bytes: Uint8Array,
  options?: { format?: ArtifactFormat; label?: string; tags?: string[] },
): Promise<IngestResult> {
  return ingest(bytes, { ...options }) as Promise<IngestResult>;
}

/**
 * Ingest and immediately spawn in an engine.
 *
 * The most direct path from raw bytes to running process:
 *   bytes → envelope → blueprint → engine.spawn() → PID
 */
export async function ingestAndSpawn(
  engine: HologramEngine,
  input: Uint8Array | string | Record<string, unknown>,
  options?: {
    format?: ArtifactFormat;
    label?: string;
    tags?: string[];
    scheduler?: SchedulerSpec;
  },
): Promise<IngestSpawnedResult> {
  return ingest(input, {
    ...options,
    executable: true,
    engine,
  }) as Promise<IngestSpawnedResult>;
}
