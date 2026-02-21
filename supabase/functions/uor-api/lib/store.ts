// UOR Store — Shared pure functions for use by both index.ts and tests.

// ── Kernel-space types: NEVER storable on IPFS ──────────────────────────────
export const KERNEL_SPACE_TYPES: ReadonlySet<string> = new Set([
  "https://uor.foundation/u/Address",    "u:Address",
  "https://uor.foundation/u/Glyph",      "u:Glyph",
  "https://uor.foundation/schema/Datum",  "schema:Datum",
  "https://uor.foundation/schema/Term",   "schema:Term",
  "https://uor.foundation/schema/Literal","schema:Literal",
  "https://uor.foundation/schema/Application","schema:Application",
  "https://uor.foundation/schema/Ring",   "schema:Ring",
  "https://uor.foundation/op/Operation",  "op:Operation",
  "https://uor.foundation/op/UnaryOp",    "op:UnaryOp",
  "https://uor.foundation/op/BinaryOp",   "op:BinaryOp",
  "https://uor.foundation/op/Involution", "op:Involution",
  "https://uor.foundation/op/Group",      "op:Group",
  "https://uor.foundation/op/DihedralGroup","op:DihedralGroup",
]);

/**
 * Guard: reject kernel-space types from storage.
 * Throws if the type is forbidden.
 */
export function validateStorableType(objectType: string | string[]): void {
  const types = Array.isArray(objectType) ? objectType : [objectType];
  for (const t of types) {
    if (KERNEL_SPACE_TYPES.has(t)) {
      throw new Error(
        `Kernel-space type "${t}" cannot be stored on IPFS. ` +
        `Kernel objects (u:, schema:, op: namespaces) are compiled into the ` +
        `UOR runtime and recomputed on demand. Only User-space and Bridge-space ` +
        `objects may be persisted.`
      );
    }
  }
}

// ── Full inline @context for stored objects ──────────────────────────────────
export const UOR_JSONLD_CONTEXT = {
  "cert": "https://uor.foundation/cert/",
  "derivation": "https://uor.foundation/derivation/",
  "morphism": "https://uor.foundation/morphism/",
  "observable": "https://uor.foundation/observable/",
  "op": "https://uor.foundation/op/",
  "owl": "http://www.w3.org/2002/07/owl#",
  "partition": "https://uor.foundation/partition/",
  "proof": "https://uor.foundation/proof/",
  "resolver": "https://uor.foundation/resolver/",
  "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  "schema": "https://uor.foundation/schema/",
  "state": "https://uor.foundation/state/",
  "store": "https://uor.foundation/store/",
  "trace": "https://uor.foundation/trace/",
  "type": "https://uor.foundation/type/",
  "u": "https://uor.foundation/u/",
  "xsd": "http://www.w3.org/2001/XMLSchema#",
};

// ── Content Addressing — Braille Bijection ──────────────────────────────────
function encodeGlyph(b: number): string { return String.fromCodePoint(0x2800 + b); }

/**
 * Compute the u:Address (Braille bijection) from raw bytes.
 */
export function computeUorAddress(bytes: Uint8Array): { glyph: string; length: number } {
  const glyph = Array.from(bytes).map(encodeGlyph).join('');
  return { glyph, length: bytes.length };
}

// ── Canonical JSON-LD serialisation ─────────────────────────────────────────
export function canonicalJsonLd(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalJsonLd).join(',') + ']';
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + sorted.map(k => JSON.stringify(k) + ':' + canonicalJsonLd((obj as Record<string, unknown>)[k])).join(',') + '}';
}

// ── CID computation — CIDv1 / dag-json / sha2-256 / base32lower ────────────
function encodeBase32Lower(bytes: Uint8Array): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  let result = '';
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

/**
 * Compute a CIDv1 string from canonical JSON-LD bytes.
 * CIDv1 / dag-json (0x0129) / sha2-256
 */
export async function computeCid(canonicalBytes: Uint8Array): Promise<string> {
  const digestBuffer = await crypto.subtle.digest('SHA-256', canonicalBytes);
  const digest = new Uint8Array(digestBuffer);

  const multihash = new Uint8Array(2 + digest.length);
  multihash[0] = 0x12; // sha2-256
  multihash[1] = 0x20; // 32 bytes
  multihash.set(digest, 2);

  const cidBinary = new Uint8Array(1 + 2 + multihash.length);
  cidBinary[0] = 0x01;   // CIDv1 version
  cidBinary[1] = 0xa9;   // dag-json 0x0129 varint low byte
  cidBinary[2] = 0x02;   // dag-json 0x0129 varint high byte
  cidBinary.set(multihash, 3);

  return 'b' + encodeBase32Lower(cidBinary);
}
