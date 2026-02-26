/**
 * Triple-Graph Compression — Dictionary-Encoded Varint Format
 * ════════════════════════════════════════════════════════════
 *
 * Compresses UOR context triples into a compact binary format
 * using a shared dictionary of common predicates/prefixes and
 * unsigned varint encoding for references.
 *
 * v2 adds a third-tier Object Value Dictionary that deduplicates
 * repetitive object strings (enum tags, weights, booleans, zones)
 * via frequency-gated dictionary encoding.
 *
 * Wire format v2 (per triple):
 *   [predicate_varint] [subject_varint] [object_flag] ...
 *     flag=0 → [object_dict_id varint]         (dictionary hit)
 *     flag=1 → [object_len_varint] [object_utf8] (inline string)
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
  "schema:abstract",        // 29
  "schema:author",          // 30
] as const;

const PREDICATE_TO_ID = new Map<string, number>(
  PREDICATE_DICT.map((p, i) => [p, i])
);

// Magic bytes: "UGC1" (v1) / "UGC2" (v2 with object dict)
const MAGIC_V1 = new Uint8Array([0x55, 0x47, 0x43, 0x31]);
const MAGIC_V2 = new Uint8Array([0x55, 0x47, 0x43, 0x32]);
const FORMAT_VERSION = 2;

/** Minimum occurrences for an object value to enter the dictionary */
const OBJECT_DICT_THRESHOLD = 2;

// ── Varint Encoding (LEB128 unsigned) ───────────────────────────────────

function encodeVarint(value: number): Uint8Array {
  const bytes: number[] = [];
  let v = value >>> 0;
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
  /** Number of unique object values in the v2 object dictionary */
  objectDictSize: number;
  /** Number of triple objects resolved via dictionary (saved bytes) */
  objectDictHits: number;
}

// ── Compress (v2) ───────────────────────────────────────────────────────

/**
 * Compress an array of triples into the UGC2 binary format.
 *
 * Layout:
 *   [4 magic "UGC2"] [1 version]
 *   [tripleCount varint]
 *   [subjectDictSize varint] [subject_0 string] ...
 *   [unknownPredCount varint] [unknownPred_0 string] ...
 *   [objectDictSize varint] [objectVal_0 string] ...   ← NEW in v2
 *   For each triple:
 *     [predicate_flag varint] [subject_id varint]
 *     [object_flag: 0=dict 1=inline] ...
 */
export function compressTriples(triples: CompressibleTriple[]): { buffer: Uint8Array; stats: CompressionStats } {
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

  // Build object value dictionary (frequency-gated)
  const objectFreq = new Map<string, number>();
  for (const t of triples) {
    objectFreq.set(t.object, (objectFreq.get(t.object) ?? 0) + 1);
  }
  const objectDict: string[] = [];
  const objectToId = new Map<string, number>();
  for (const [val, freq] of objectFreq) {
    if (freq >= OBJECT_DICT_THRESHOLD) {
      objectToId.set(val, objectDict.length);
      objectDict.push(val);
    }
  }

  // Assemble chunks
  const chunks: Uint8Array[] = [];
  const push = (c: Uint8Array) => chunks.push(c);

  // Header
  push(MAGIC_V2);
  push(new Uint8Array([FORMAT_VERSION]));
  push(encodeVarint(triples.length));

  // Subject dictionary
  push(encodeVarint(subjectDict.length));
  for (const s of subjectDict) push(encodeString(s));

  // Unknown predicate dictionary
  push(encodeVarint(unknownPreds.length));
  for (const p of unknownPreds) push(encodeString(p));

  // Object value dictionary (v2)
  push(encodeVarint(objectDict.length));
  for (const o of objectDict) push(encodeString(o));

  // Triples
  let objectDictHits = 0;
  for (const t of triples) {
    const predId = PREDICATE_TO_ID.get(t.predicate);
    const flag = predId !== undefined
      ? predId
      : PREDICATE_DICT.length + (unknownPredToId.get(t.predicate) ?? 0);
    push(encodeVarint(flag));
    push(encodeVarint(subjectToId.get(t.subject) ?? 0));

    // Object: dictionary hit or inline
    const objDictId = objectToId.get(t.object);
    if (objDictId !== undefined) {
      push(new Uint8Array([0])); // flag=0 → dict ref
      push(encodeVarint(objDictId));
      objectDictHits++;
    } else {
      push(new Uint8Array([1])); // flag=1 → inline
      push(encodeString(t.object));
    }
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
      objectDictSize: objectDict.length,
      objectDictHits,
    },
  };
}

// ── Decompress (v1 + v2) ────────────────────────────────────────────────

/**
 * Decompress UGC1 or UGC2 binary back to triples.
 * Automatically detects format version from magic bytes.
 */
export function decompressTriples(data: Uint8Array): CompressibleTriple[] {
  let pos = 0;

  // Detect magic
  const isV2 =
    data[0] === MAGIC_V2[0] && data[1] === MAGIC_V2[1] &&
    data[2] === MAGIC_V2[2] && data[3] === MAGIC_V2[3];
  const isV1 =
    data[0] === MAGIC_V1[0] && data[1] === MAGIC_V1[1] &&
    data[2] === MAGIC_V1[2] && data[3] === MAGIC_V1[3];

  if (!isV1 && !isV2) throw new Error("Invalid UGC magic bytes");
  pos = 4;

  // Version byte
  const version = data[pos++];
  if (version !== 1 && version !== 2) throw new Error(`Unsupported UGC version: ${version}`);

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

  // Object value dictionary (v2 only)
  const objectDict: string[] = [];
  if (isV2 && version >= 2) {
    let objectDictSize: number;
    [objectDictSize, pos] = decodeVarint(data, pos);
    for (let i = 0; i < objectDictSize; i++) {
      let o: string;
      [o, pos] = decodeString(data, pos);
      objectDict.push(o);
    }
  }

  // Triples
  const triples: CompressibleTriple[] = [];
  for (let i = 0; i < tripleCount; i++) {
    let flag: number, subjectId: number;
    [flag, pos] = decodeVarint(data, pos);
    [subjectId, pos] = decodeVarint(data, pos);

    let object: string;
    if (isV2 && version >= 2) {
      // v2: read object flag
      const objFlag = data[pos++];
      if (objFlag === 0) {
        // Dictionary reference
        let dictId: number;
        [dictId, pos] = decodeVarint(data, pos);
        object = objectDict[dictId] ?? `unknown_obj:${dictId}`;
      } else {
        // Inline string
        [object, pos] = decodeString(data, pos);
      }
    } else {
      // v1: always inline
      [object, pos] = decodeString(data, pos);
    }

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
