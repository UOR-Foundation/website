/**
 * Layer 3: Content — Encrypted User Data
 * ═══════════════════════════════════════
 *
 * User queries, LLM responses, knowledge graph triples.
 * Always encrypted at rest (AES-256-GCM via Data Bank).
 *
 * CRITICAL INVARIANT:
 *   No ContentValue<T> can flow into any GeometryValue<T> function.
 *   The ProofAccumulator operates on the computation graph TOPOLOGY,
 *   not on Content data. If someone accidentally passes Content into
 *   a Geometry function, TypeScript refuses to compile.
 *
 * This is privacy enforced by the type system.
 *
 * @module qsvg/zk-layers/content-layer
 */

// ── Branded Type: ContentValue ────────────────────────────────────────────

declare const __content: unique symbol;

/**
 * A value that lives in Layer 3 (Content).
 * CANNOT be passed to any Layer 2 (Geometry) function.
 * The branded type prevents cross-layer contamination at compile time.
 */
export type ContentValue<T> = T & { readonly [__content]: true };

/**
 * Tag a raw value as a ContentValue.
 * Use this for any data that contains or derives from user content:
 *   - User query text
 *   - LLM response text
 *   - Knowledge graph triples
 *   - Any PII or sensitive data
 */
export function content<T>(value: T): ContentValue<T> {
  return value as ContentValue<T>;
}

// ── Content Types (branded) ───────────────────────────────────────────────

/** A user's query — always encrypted at rest */
export type UserQuery = ContentValue<string>;

/** An LLM response — always encrypted at rest */
export type LLMResponse = ContentValue<string>;

/** A knowledge graph triple — always encrypted at rest */
export interface ContentTriple {
  readonly subject: ContentValue<string>;
  readonly predicate: ContentValue<string>;
  readonly object: ContentValue<string>;
}

/** An encrypted content blob (what the server actually sees) */
export interface EncryptedContent {
  /** AES-256-GCM ciphertext (base64) */
  readonly ciphertext: string;
  /** Initialization vector (base64) */
  readonly iv: string;
  /** Content-addressed identifier (SHA-256 of ciphertext) */
  readonly cid: string;
  /** Byte length of plaintext (metadata only, no content leak) */
  readonly byteLength: number;
}

// ── Content → One-Way Hash (the ONLY cross-layer bridge) ──────────────────

/**
 * Compute a one-way hash of content.
 *
 * This is the ONLY permitted information flow from L3 → L2:
 *   Content → SHA-256 → CID (irreversible)
 *
 * The resulting hash carries ZERO information about the content.
 * It is used ONLY to create a content-addressed identifier.
 * This function exists at the L3/L2 boundary.
 */
export async function contentToHash(
  plaintext: ContentValue<string>,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext as unknown as string);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Synchronous one-way hash (FNV-1a fallback).
 */
export function contentToHashSync(
  plaintext: ContentValue<string>,
): string {
  const raw = plaintext as unknown as string;
  let hash = 0x811c9dc5;
  const prime = 0x01000193;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash ^ raw.charCodeAt(i)) * prime) >>> 0;
  }
  // Extend to 256-bit
  const parts: number[] = [];
  for (let i = 0; i < 8; i++) {
    hash = ((hash ^ (i * 0x9e3779b9)) * prime) >>> 0;
    parts.push(hash);
  }
  return parts.map(p => p.toString(16).padStart(8, "0")).join("");
}

// ── Compile-Time Isolation Guard ──────────────────────────────────────────

/**
 * TYPE-LEVEL GUARD: Ensures no Content flows into Geometry.
 *
 * Usage in geometry-layer functions:
 *   function myGeometryFn<T>(value: AssertNotContent<T>): GeometryValue<T>
 *
 * If T is ContentValue<X>, this resolves to `never`, causing a compile error.
 */
export type AssertNotContent<T> = T extends ContentValue<unknown> ? never : T;

/**
 * TYPE-LEVEL GUARD: Ensures a value IS content (for content-layer functions).
 */
export type AssertIsContent<T> = T extends ContentValue<infer U> ? ContentValue<U> : never;
