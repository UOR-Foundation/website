/**
 * UOR Single Proof Hashing Standard — URDNA2015 Canonicalization.
 *
 * THE FUNDAMENTAL CONTRACT:
 *   nquads = URDNA2015(jsonld.canonize(obj))
 *   hash   = SHA-256(UTF-8(nquads))
 *
 *   derivation_id  = "urn:uor:derivation:sha256:" + hex(hash)
 *   store:uorCid   = CIDv1(dag-json, sha2-256, nquadsBytes)
 *   u:address      = toGlyph(hash[0..N])
 *
 * One input. One hash. Three derived forms.
 * W3C URDNA2015 ensures any agent in any language reproduces identical results.
 *
 * Pure functions. Single dependency: jsonld.js (W3C reference implementation).
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — jsonld v8 types may not resolve perfectly in all configurations
import jsonld from "jsonld";
import { computeCid, computeUorAddress, canonicalJsonLd, computeIpv6Address } from "./uor-address";

// ── UOR inline context for wrapping non-JSON-LD objects ─────────────────────
// Inline to avoid network dependency — any agent can reproduce this locally.

const UOR_WRAP_CONTEXT: Record<string, unknown> = {
  store: "https://uor.foundation/store/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  serialisation: {
    "@id": "https://uor.foundation/store/serialisation",
    "@type": "xsd:string",
  },
};

// ── UOR v1 context (inlined for offline canonicalization) ───────────────────

const UOR_V1_CONTEXT_URL = "https://uor.foundation/contexts/uor-v1.jsonld";

// Inline context matching public/contexts/uor-v1.jsonld — avoids network fetch.
const UOR_V1_INLINE_CONTEXT: Record<string, unknown> = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  skos: "http://www.w3.org/2004/02/skos/core#",
  dcterms: "http://purl.org/dc/terms/",
  foaf: "http://xmlns.com/foaf/0.1/",
  prov: "http://www.w3.org/ns/prov#",
  sdo: "https://schema.org/",

  u: "https://uor.foundation/u/",
  schema: "https://uor.foundation/schema/",
  op: "https://uor.foundation/op/",
  query: "https://uor.foundation/query/",
  resolver: "https://uor.foundation/resolver/",
  type: "https://uor.foundation/type/",
  partition: "https://uor.foundation/partition/",
  observable: "https://uor.foundation/observable/",
  proof: "https://uor.foundation/proof/",
  derivation: "https://uor.foundation/derivation/",
  trace: "https://uor.foundation/trace/",
  cert: "https://uor.foundation/cert/",
  morphism: "https://uor.foundation/morphism/",
  state: "https://uor.foundation/state/",
  store: "https://uor.foundation/store/",
  sobridge: "https://uor.foundation/sobridge/",
};

// ── Custom document loader (offline-first) ──────────────────────────────────

/**
 * Custom document loader that serves the UOR v1 context locally
 * and falls back to the default loader for other URLs.
 */
function createDocumentLoader() {
  // Use the built-in XHR/fetch loader for remote contexts (e.g. schema.org)
  const defaultLoader =
    typeof window !== "undefined"
      ? (jsonld as any).documentLoaders?.xhr?.()
      : (jsonld as any).documentLoaders?.node?.();

  return async (url: string) => {
    // Serve UOR context locally — no network dependency
    if (
      url === UOR_V1_CONTEXT_URL ||
      url === UOR_V1_CONTEXT_URL.replace("https://", "http://")
    ) {
      return {
        contextUrl: null,
        documentUrl: url,
        document: { "@context": UOR_V1_INLINE_CONTEXT },
      };
    }

    // Fall back to default loader for external contexts
    if (defaultLoader) {
      return defaultLoader(url);
    }

    throw new Error(
      `[UOR Canonical] Cannot load remote context: ${url}. ` +
        `Provide an inline @context for offline canonicalization.`
    );
  };
}

// ── URDNA2015 Canonicalization ──────────────────────────────────────────────

/**
 * Check if an object appears to be JSON-LD (has @context).
 */
function isJsonLd(obj: unknown): obj is Record<string, unknown> {
  return (
    obj !== null &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    "@context" in (obj as Record<string, unknown>)
  );
}

/**
 * Wrap a non-JSON-LD object as JSON-LD using the UOR store context.
 * The payload is pre-canonicalized via sorted-key JSON to ensure determinism
 * across all systems that use the same wrapping convention.
 */
function wrapAsJsonLd(obj: unknown): Record<string, unknown> {
  return {
    "@context": UOR_WRAP_CONTEXT,
    "@type": "store:StoredObject",
    serialisation: canonicalJsonLd(obj),
  };
}

/**
 * Canonicalize any object to W3C URDNA2015 N-Quads.
 *
 * - JSON-LD objects (with @context): canonized directly.
 * - Plain objects: wrapped in a UOR store envelope, then canonized.
 *
 * The result is a deterministic string that any W3C-compliant implementation
 * (Python rdflib, Java Titanium, Rust sophia) will produce identically.
 */
export async function canonicalizeToNQuads(obj: unknown): Promise<string> {
  const doc = isJsonLd(obj) ? obj : wrapAsJsonLd(obj);
  const nquads: string = await (jsonld as any).canonize(doc, {
    algorithm: "URDNA2015",
    format: "application/n-quads",
    documentLoader: createDocumentLoader(),
    safe: false,
  });
  return nquads;
}

// ── SHA-256 helpers ─────────────────────────────────────────────────────────

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", ab);
  return new Uint8Array(digest);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Single Proof Hash ──────────────────────────────────────────────────────

export interface SingleProofResult {
  /** The W3C URDNA2015 canonical N-Quads string. */
  nquads: string;
  /** The canonical N-Quads encoded as UTF-8 bytes — THE single input. */
  canonicalBytes: Uint8Array;
  /** Raw SHA-256 digest of canonical bytes (32 bytes). */
  hashBytes: Uint8Array;
  /** SHA-256 hex string. */
  hashHex: string;
  /** Deterministic derivation ID: urn:uor:derivation:sha256:{hex} */
  derivationId: string;
  /** CIDv1 / dag-json / sha2-256 / base32lower — from canonical bytes. */
  cid: string;
  /** UOR Braille bijection address — from hash bytes (32 bytes). */
  uorAddress: { "u:glyph": string; "u:length": number };
  /** UOR content-addressed IPv6 (ULA fd00:75:6f72::/48) — from hash bytes. */
  ipv6Address: {
    "u:ipv6": string;
    "u:ipv6Prefix": string;
    "u:ipv6PrefixLength": number;
    "u:contentBits": number;
  };
}

/**
 * THE SINGLE PROOF HASH.
 *
 * Takes any object (JSON-LD or plain), canonicalizes via URDNA2015,
 * computes one SHA-256 hash, and derives all four identity forms.
 *
 * Same object → same nquads → same hash → same {derivation_id, cid, u:address, u:ipv6}.
 * On every system. At any time. Forever. No registries. No DNS.
 *
 * @param obj  Any JSON-LD object or plain JavaScript object.
 * @returns    SingleProofResult with all four derived identity forms.
 */
export async function singleProofHash(
  obj: unknown
): Promise<SingleProofResult> {
  // Step 1: URDNA2015 canonical N-Quads
  const nquads = await canonicalizeToNQuads(obj);

  // Step 2: UTF-8 encode — THE single canonical byte sequence
  const canonicalBytes = new TextEncoder().encode(nquads);

  // Step 3: SHA-256 — THE single hash
  const hashBytes = await sha256(canonicalBytes);
  const hashHex = bytesToHex(hashBytes);

  // Step 4: Derive all four identity forms from ONE hash
  //   derivation_id — from hex
  //   store:uorCid  — CIDv1 wrapping the SHA-256 of canonical bytes
  //   u:address     — Braille bijection of hash bytes
  //   u:ipv6        — Content-addressed IPv6 ULA from hash bytes
  const derivationId = `urn:uor:derivation:sha256:${hashHex}`;
  const cid = await computeCid(canonicalBytes);
  const uorAddress = computeUorAddress(hashBytes);
  const ipv6Address = computeIpv6Address(hashBytes);

  return {
    nquads,
    canonicalBytes,
    hashBytes,
    hashHex,
    derivationId,
    cid,
    uorAddress,
    ipv6Address,
  };
}

/**
 * Verify a derivation ID by recomputing the single proof hash.
 * Returns true iff the recomputed derivation_id matches the given one.
 *
 * Any agent, anywhere, can call this to verify identity — no trusted third party.
 */
export async function verifySingleProof(
  obj: unknown,
  expectedDerivationId: string
): Promise<boolean> {
  const proof = await singleProofHash(obj);
  return proof.derivationId === expectedDerivationId;
}
