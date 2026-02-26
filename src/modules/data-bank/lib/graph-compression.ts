/**
 * Triple-Graph Compression — Dictionary-Encoded Varint Format
 * ════════════════════════════════════════════════════════════
 *
 * Compresses UOR context triples into a compact binary format
 * using a shared dictionary of common predicates/prefixes and
 * unsigned varint encoding for references.
 *
 * Wire format (per triple):
 *   [predicate_varint] [subject_varint] [object_len_varint] [object_utf8]
 *
 * Subjects are dictionary-indexed (first occurrence assigns an ID).
 * Predicates use a static dictionary of known UOR predicates.
 * Objects are length-prefixed UTF-8 strings (weights, tags, domains).
 *
 * Achieves 10-20x compression vs raw JSON for typical context graphs.
 *
 * @module data-bank/lib/graph-compression
 */

// ── Static Predicate Dictionary ─────────────────────────────────────────

const PREDICATE_DICT: readonly string[] = [
  "uor:interestedIn",       // 0
  "uor:activeTask",         // 1
  "uor:visitedDomain",      // 2
  "uor:phaseAffinity",      // 3
  "uor:interactedWith",     // 4
  "uor:hasRole",            // 5
  "uor:createdAt",          // 6
  "uor:updatedAt",          // 7
  "uor:memberOf",           // 8
  "uor:derivedFrom",        // 9
  "uor:certifiedBy",        // 10
  "uor:observes",           // 11
  "uor:focusSession",       // 12
  "uor:searchedFor",        // 13
  "uor:bookmarked",         // 14
  "uor:dismissed",          // 15
  "rdf:type",               // 16
  "schema:name",            // 17
  "schema:description",     // 18
  "schema:url",             // 19
  "delta:set",              // 20
  "delta:delete",           // 21
  "delta:base",             // 22
  "delta:snapshot",         // 23
  "delta:sequence",         // 24
  "delta:zone",             // 25
  "delta:hScore",           // 26
  "delta:phi",              // 27
  "delta:memCount",         // 28
] as const;

const PREDICATE_TO_ID = new Map<string, number>(
  PREDICATE_DICT.map((p, i) => [p, i])
);

// Magic bytes: "UGC1" (UOR Graph Compressed v1)
const MAGIC = new Uint8Array([0x55, 0x47, 0x43, 0x31]);
const FORMAT_VERSION = 1;

// ── Varint Encoding (LEB128 unsigned) ───────────────────────────────────

function encodeVarint(value: number): Uint8Array {
  const bytes: number[] = [];
  let v = value >>> 0; // ensure unsigned
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v > 0) byte |= 0x80;
    bytes.push(byte);
  } while (v > 0);
  return new Uint8Array(bytes);
}

function decodeVarint(data: Uint8Array, offset: number): [number, number] {
  let result = 0;
  let shift = 0;
  let pos = offset;
  while (pos < data.length) {
    const byte = data[pos];
    result |= (byte & 0x7f) << shift;
    pos++;
    if ((byte & 0x80) === 0) break;
    shift += 7;
    if (shift > 28) throw new Error("Varint too large");
  }
  return [result, pos];
}

// ── String encoding helpers ─────────────────────────────────────────────

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeString(s: string): Uint8Array {
  const bytes = encoder.encode(s);
  const lenVarint = encodeVarint(bytes.length);
  const out = new Uint8Array(lenVarint.length + bytes.length);
  out.set(lenVarint, 0);
  out.set(bytes, lenVarint.length);
  return out;
}

function decodeString(data: Uint8Array, offset: number): [string, number] {
  const [len, pos] = decodeVarint(data, offset);
  const str = decoder.decode(data.slice(pos, pos + len));
  return [str, pos + len];
}

// ── Triple type ─────────────────────────────────────────────────────────

export interface CompressibleTriple {
  subject: string;
  predicate: string;
  object: string;
}

export interface CompressionStats {
  tripleCount: number;
  rawBytes: number;
  compressedBytes: number;
  ratio: number;
  subjectDictSize: number;
  unknownPredicates: number;
}

// ── Compress ────────────────────────────────────────────────────────────

/**
 * Compress an array of triples into the UGC1 binary format.
 *
 * Layout:
 *   [4 magic] [1 version] [tripleCount varint]
 *   [subjectDictSize varint] [subject_0 string] [subject_1 string] ...
 *   [unknownPredCount varint] [unknownPred_0 string] ...
 *   For each triple:
 *     [predicate_flag_varint] [subject_id_varint] [object string]
 *
 *   predicate_flag: if < PREDICATE_DICT.length → static dict ID
 *                   else → (PREDICATE_DICT.length + unknownPredIndex)
 */
export function compressTriples(triples: CompressibleTriple[]): { buffer: Uint8Array; stats: CompressionStats } {
  // Measure raw size
  const rawJson = JSON.stringify(triples);
  const rawBytes = encoder.encode(rawJson).length;

  // Build subject dictionary
  const subjectDict: string[] = [];
  const subjectToId = new Map<string, number>();
  for (const t of triples) {
    if (!subjectToId.has(t.subject)) {
      subjectToId.set(t.subject, subjectDict.length);
      subjectDict.push(t.subject);
    }
  }

  // Collect unknown predicates
  const unknownPreds: string[] = [];
  const unknownPredToId = new Map<string, number>();
  for (const t of triples) {
    if (!PREDICATE_TO_ID.has(t.predicate) && !unknownPredToId.has(t.predicate)) {
      unknownPredToId.set(t.predicate, unknownPreds.length);
      unknownPreds.push(t.predicate);
    }
  }

  // Assemble chunks
  const chunks: Uint8Array[] = [];
  const push = (c: Uint8Array) => chunks.push(c);

  // Header
  push(MAGIC);
  push(new Uint8Array([FORMAT_VERSION]));
  push(encodeVarint(triples.length));

  // Subject dictionary
  push(encodeVarint(subjectDict.length));
  for (const s of subjectDict) push(encodeString(s));

  // Unknown predicate dictionary
  push(encodeVarint(unknownPreds.length));
  for (const p of unknownPreds) push(encodeString(p));

  // Triples
  for (const t of triples) {
    const predId = PREDICATE_TO_ID.get(t.predicate);
    const flag = predId !== undefined
      ? predId
      : PREDICATE_DICT.length + (unknownPredToId.get(t.predicate) ?? 0);
    push(encodeVarint(flag));
    push(encodeVarint(subjectToId.get(t.subject) ?? 0));
    push(encodeString(t.object));
  }

  // Concatenate
  const totalLen = chunks.reduce((a, c) => a + c.length, 0);
  const buffer = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    buffer.set(c, offset);
    offset += c.length;
  }

  return {
    buffer,
    stats: {
      tripleCount: triples.length,
      rawBytes,
      compressedBytes: buffer.length,
      ratio: rawBytes / buffer.length,
      subjectDictSize: subjectDict.length,
      unknownPredicates: unknownPreds.length,
    },
  };
}

// ── Decompress ──────────────────────────────────────────────────────────

/**
 * Decompress UGC1 binary back to triples.
 */
export function decompressTriples(data: Uint8Array): CompressibleTriple[] {
  let pos = 0;

  // Verify magic
  for (let i = 0; i < 4; i++) {
    if (data[pos++] !== MAGIC[i]) throw new Error("Invalid UGC1 magic bytes");
  }

  // Version
  const version = data[pos++];
  if (version !== FORMAT_VERSION) throw new Error(`Unsupported UGC1 version: ${version}`);

  // Triple count
  let tripleCount: number;
  [tripleCount, pos] = decodeVarint(data, pos);

  // Subject dictionary
  let subjectDictSize: number;
  [subjectDictSize, pos] = decodeVarint(data, pos);
  const subjectDict: string[] = [];
  for (let i = 0; i < subjectDictSize; i++) {
    let s: string;
    [s, pos] = decodeString(data, pos);
    subjectDict.push(s);
  }

  // Unknown predicate dictionary
  let unknownPredCount: number;
  [unknownPredCount, pos] = decodeVarint(data, pos);
  const unknownPreds: string[] = [];
  for (let i = 0; i < unknownPredCount; i++) {
    let p: string;
    [p, pos] = decodeString(data, pos);
    unknownPreds.push(p);
  }

  // Triples
  const triples: CompressibleTriple[] = [];
  for (let i = 0; i < tripleCount; i++) {
    let flag: number, subjectId: number, object: string;
    [flag, pos] = decodeVarint(data, pos);
    [subjectId, pos] = decodeVarint(data, pos);
    [object, pos] = decodeString(data, pos);

    const predicate = flag < PREDICATE_DICT.length
      ? PREDICATE_DICT[flag]
      : unknownPreds[flag - PREDICATE_DICT.length] ?? `unknown:${flag}`;

    triples.push({
      subject: subjectDict[subjectId] ?? `unknown:${subjectId}`,
      predicate,
      object,
    });
  }

  return triples;
}

// ── Base64 round-trip for storage in Data Bank slots ────────────────────

export function compressToBase64(triples: CompressibleTriple[]): { encoded: string; stats: CompressionStats } {
  const { buffer, stats } = compressTriples(triples);
  let binary = "";
  for (const b of buffer) binary += String.fromCharCode(b);
  return { encoded: btoa(binary), stats };
}

export function decompressFromBase64(b64: string): CompressibleTriple[] {
  const binary = atob(b64);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
  return decompressTriples(data);
}
