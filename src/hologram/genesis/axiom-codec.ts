/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  AXIOM-CODEC  —  Minimal DAG-JSON Encoder/Decoder       ║
 * ║                                                          ║
 * ║  The kernel needs to serialize and deserialize its own   ║
 * ║  state. This provides deterministic JSON encoding with   ║
 * ║  sorted keys (canonical form) so that identical objects  ║
 * ║  always produce identical bytes → identical CIDs.        ║
 * ║                                                          ║
 * ║  Imports only axiom-ring. No JSON library overrides.     ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { type ByteTuple, encodeUtf8, decodeUtf8 } from "./axiom-ring";

// ── Canonical JSON: deterministic key ordering ────────────

/**
 * Encodes a value to canonical JSON bytes.
 *
 * Rules (subset of RFC 8785 — JSON Canonicalization Scheme):
 * 1. Object keys are sorted lexicographically.
 * 2. No whitespace between tokens.
 * 3. Strings use minimal escaping.
 * 4. Numbers use shortest representation.
 *
 * This ensures: canonicalEncode(x) === canonicalEncode(deepClone(x))
 * which means: CID(x) is stable regardless of insertion order.
 */
export function canonicalEncode(value: unknown): ByteTuple {
  return encodeUtf8(canonicalStringify(value));
}

/**
 * Canonical JSON string (sorted keys, no whitespace).
 */
export function canonicalStringify(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "null";

  const t = typeof value;

  if (t === "boolean") return value ? "true" : "false";
  if (t === "number") {
    if (!isFinite(value as number)) return "null";
    return Object.is(value, -0) ? "0" : String(value);
  }
  if (t === "string") return escapeString(value as string);

  if (Array.isArray(value)) {
    const items = value.map((v) => canonicalStringify(v));
    return "[" + items.join(",") + "]";
  }

  if (value instanceof Uint8Array) {
    // Encode byte arrays as {"/":{bytes:"<base64>"}}  (DAG-JSON convention)
    return '{"/":{' + escapeString("bytes") + ":" + escapeString(toBase64(value)) + "}}";
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(
      (k) => escapeString(k) + ":" + canonicalStringify(obj[k])
    );
    return "{" + pairs.join(",") + "}";
  }

  return "null";
}

/**
 * Decode canonical JSON bytes back to a value.
 */
export function canonicalDecode(bytes: ByteTuple): unknown {
  return JSON.parse(decodeUtf8(bytes));
}

// ── String escaping ───────────────────────────────────────

function escapeString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x22) out += '\\"';       // "
    else if (c === 0x5c) out += "\\\\"; // \
    else if (c === 0x08) out += "\\b";
    else if (c === 0x0c) out += "\\f";
    else if (c === 0x0a) out += "\\n";
    else if (c === 0x0d) out += "\\r";
    else if (c === 0x09) out += "\\t";
    else if (c < 0x20) {
      out += "\\u" + c.toString(16).padStart(4, "0");
    } else {
      out += s[i];
    }
  }
  return out + '"';
}

// ── Base64 (ring-native, no btoa) ─────────────────────────

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function toBase64(bytes: ByteTuple): string {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++] ?? 0;
    const b1 = i < bytes.length ? bytes[i++] : -1;
    const b2 = i < bytes.length ? bytes[i++] : -1;

    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 >= 0 ? b1 >> 4 : 0)];
    out += b1 >= 0 ? B64[((b1 & 15) << 2) | (b2 >= 0 ? b2 >> 6 : 0)] : "=";
    out += b2 >= 0 ? B64[b2 & 63] : "=";
  }
  return out;
}
