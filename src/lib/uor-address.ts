/**
 * Browser-compatible UOR content-addressing library.
 * Ports the core functions from supabase/functions/uor-api/lib/store.ts
 * to run in the browser using the Web Crypto API.
 *
 * Pure functions, zero dependencies.
 */

// ── Canonical JSON-LD serialisation ─────────────────────────────────────────

/** Deterministic JSON-LD serialization with recursively sorted keys. */
export function canonicalJsonLd(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj))
    return "[" + obj.map(canonicalJsonLd).join(",") + "]";
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  return (
    "{" +
    sorted
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          canonicalJsonLd((obj as Record<string, unknown>)[k])
      )
      .join(",") +
    "}"
  );
}

// ── Base32-lower encoding ───────────────────────────────────────────────────

function encodeBase32Lower(bytes: Uint8Array): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let result = "";
  let buffer = 0;
  let bitsLeft = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += alphabet[(buffer >> bitsLeft) & 31];
    }
  }
  if (bitsLeft > 0) {
    result += alphabet[(buffer << (5 - bitsLeft)) & 31];
  }
  return result;
}

// ── CID computation — CIDv1 / dag-json / sha2-256 / base32lower ────────────

/**
 * Compute a CIDv1 string from canonical JSON-LD bytes.
 * CIDv1 / dag-json (0x0129) / sha2-256
 */
export async function computeCid(canonicalBytes: Uint8Array): Promise<string> {
  const ab = new ArrayBuffer(canonicalBytes.byteLength);
  new Uint8Array(ab).set(canonicalBytes);
  const digestBuffer = await crypto.subtle.digest("SHA-256", ab);
  const digest = new Uint8Array(digestBuffer);

  const multihash = new Uint8Array(2 + digest.length);
  multihash[0] = 0x12; // sha2-256
  multihash[1] = 0x20; // 32 bytes
  multihash.set(digest, 2);

  const cidBinary = new Uint8Array(1 + 2 + multihash.length);
  cidBinary[0] = 0x01; // CIDv1 version
  cidBinary[1] = 0xa9; // dag-json 0x0129 varint low byte
  cidBinary[2] = 0x02; // dag-json 0x0129 varint high byte
  cidBinary.set(multihash, 3);

  return "b" + encodeBase32Lower(cidBinary);
}

// ── Braille bijection — UOR address ─────────────────────────────────────────

function encodeGlyph(b: number): string {
  return String.fromCodePoint(0x2800 + b);
}

/** Compute the UOR address (Braille bijection) from raw bytes. */
export function computeUorAddress(bytes: Uint8Array): {
  "u:glyph": string;
  "u:length": number;
} {
  const glyph = Array.from(bytes).map(encodeGlyph).join("");
  return { "u:glyph": glyph, "u:length": bytes.length };
}

// ── Self-referential field stripping ────────────────────────────────────────

/** Strip identity fields before recomputing CID for verification. */
export function stripSelfReferentialFields(
  parsed: Record<string, unknown>
): Record<string, unknown> {
  const round1 = { ...parsed };
  delete round1["store:cid"];
  delete round1["store:cidScope"];
  delete round1["store:uorAddress"];
  return round1;
}

// ── High-level: compute full identity for a manifest ────────────────────────

export interface ModuleIdentity {
  cid: string;
  uorAddress: { "u:glyph": string; "u:length": number };
  canonicalBytes: Uint8Array;
}

/**
 * Takes a manifest object, strips any existing identity fields,
 * canonicalizes it, and returns { cid, uorAddress, canonicalBytes }.
 */
export async function computeModuleIdentity(
  manifest: Record<string, unknown>
): Promise<ModuleIdentity> {
  const clean = stripSelfReferentialFields(manifest);
  const canonical = canonicalJsonLd(clean);
  const canonicalBytes = new TextEncoder().encode(canonical);
  const cid = await computeCid(canonicalBytes);
  const uorAddress = computeUorAddress(canonicalBytes);
  return { cid, uorAddress, canonicalBytes };
}
