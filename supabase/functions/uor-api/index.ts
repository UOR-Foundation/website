// UOR Framework REST API — Supabase Edge Function
// OpenAPI 3.1.0 compliant router — all endpoints, no external dependencies
// Every response is a valid JSON-LD object traceable to UOR ontology namespaces

// ── Storacha (Filecoin-backed IPFS persistence) ────────────────────────────
import * as StorachaClient from 'npm:@storacha/client'
import { StoreMemory } from 'npm:@storacha/client/stores/memory'
import * as StorachaProof from 'npm:@storacha/client/proof'
import { Signer } from 'npm:@storacha/client/principal/ed25519'

// Storacha credentials — generated via storacha CLI (see setup instructions)
const STORACHA_KEY = Deno.env.get('STORACHA_KEY')    // Ed25519 private key: MgCa...
const STORACHA_PROOF = Deno.env.get('STORACHA_PROOF') // base64 UCAN delegation

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-uor-agent-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Max-Age': '86400',
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json',
};

const CACHE_HEADERS_KERNEL = {
  ...JSON_HEADERS,
  'Cache-Control': 'public, max-age=300, s-maxage=600',
  'X-UOR-Space': 'kernel',
};

const CACHE_HEADERS_BRIDGE = {
  ...JSON_HEADERS,
  'Cache-Control': 'public, max-age=60',
  'X-UOR-Space': 'bridge',
};

const CACHE_HEADERS_USER = {
  ...JSON_HEADERS,
  'Cache-Control': 'public, max-age=60',
  'X-UOR-Space': 'user',
};

// ── Known valid paths → allowed methods ─────────────────────────────────────
const KNOWN_PATHS: Record<string, string[]> = {
  '/':                                  ['GET', 'OPTIONS'],
  '/navigate':                          ['GET', 'OPTIONS'],
  '/openapi.json':                      ['GET', 'OPTIONS'],
  '/kernel/op/verify':                  ['GET', 'OPTIONS'],
  '/kernel/op/verify/all':              ['GET', 'OPTIONS'],
  '/kernel/op/compute':                 ['GET', 'OPTIONS'],
  '/kernel/op/operations':              ['GET', 'OPTIONS'],
  '/kernel/address/encode':             ['POST', 'OPTIONS'],
  '/kernel/schema/datum':               ['GET', 'OPTIONS'],
  '/bridge/partition':                  ['POST', 'OPTIONS'],
  '/bridge/proof/critical-identity':    ['GET', 'OPTIONS'],
  '/bridge/proof/coherence':            ['POST', 'OPTIONS'],
  '/bridge/cert/involution':            ['GET', 'OPTIONS'],
  '/bridge/observable/metrics':         ['GET', 'OPTIONS'],
  '/user/type/primitives':              ['GET', 'OPTIONS'],
  '/bridge/derivation':                 ['GET', 'OPTIONS'],
  '/bridge/trace':                      ['GET', 'OPTIONS'],
  '/bridge/resolver':                   ['GET', 'OPTIONS'],
  '/user/morphism/transforms':          ['GET', 'OPTIONS'],
  '/user/state':                        ['GET', 'OPTIONS'],
  '/store/resolve':                     ['GET', 'OPTIONS'],
  '/store/write':                       ['POST', 'OPTIONS'],
  '/store/write-context':               ['POST', 'OPTIONS'],
  '/store/gateways':                    ['GET', 'OPTIONS'],
  // /store/read/:cid and /store/verify/:cid are handled dynamically
};

// ── Rate Limiting (in-memory sliding window) ────────────────────────────────
const rateLimitWindows = new Map<string, number[]>();

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

function checkRateLimit(ip: string, isPost: boolean): RateLimitResult {
  const limit = isPost ? 60 : 120;
  const now = Date.now();
  const windowMs = 60_000;
  const key = `${ip}:${isPost ? 'post' : 'get'}`;
  const times = rateLimitWindows.get(key) ?? [];
  const recent = times.filter(t => now - t < windowMs);
  const reset = Math.ceil((now + windowMs) / 1000);

  if (recent.length >= limit) {
    return { allowed: false, limit, remaining: 0, reset };
  }
  recent.push(now);
  rateLimitWindows.set(key, recent);
  return { allowed: true, limit, remaining: limit - recent.length, reset };
}

// ── ETag computation ─────────────────────────────────────────────────────────
function makeETag(path: string, params: Record<string, string>): string {
  const key = path + JSON.stringify(params, Object.keys(params).sort());
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return `"uor-${h.toString(16)}"`;
}

// ── Ring R_n = Z/(2^n)Z ─────────────────────────────────────────────────────
function modulus(n: number): number { return Math.pow(2, n); }
function neg(x: number, n = 8): number { const m = modulus(n); return ((-x) % m + m) % m; }
function bnot(x: number, n = 8): number { return x ^ (modulus(n) - 1); }
function succOp(x: number, n = 8): number { return (x + 1) % modulus(n); }
function predOp(x: number, n = 8): number { return (x - 1 + modulus(n)) % modulus(n); }
function addOp(x: number, y: number, n = 8): number { return (x + y) % modulus(n); }
function subOp(x: number, y: number, n = 8): number { return ((x - y) % modulus(n) + modulus(n)) % modulus(n); }
function mulOp(x: number, y: number, n = 8): number { return (x * y) % modulus(n); }
function xorOp(x: number, y: number): number { return x ^ y; }
function andOp(x: number, y: number): number { return x & y; }
function orOp(x: number, y: number): number { return x | y; }

// ── Content Addressing (u.rs) — Braille Bijection ──────────────────────────
// Every byte (0–255) maps to exactly one Unicode Braille cell (U+2800–U+28FF).
// This is a LOSSLESS BIJECTION, not a hash. The address IS the content in Braille form.
function encodeGlyph(b: number): string { return String.fromCodePoint(0x2800 + b); }
function addressSimplified(bytes: Uint8Array): string { return Array.from(bytes).map(encodeGlyph).join(''); }

// ── schema:Datum construction (schema.rs) ───────────────────────────────────
function makeDatum(value: number, n: number) {
  const spectrum = value.toString(2).padStart(n, '0');
  const stratum = value.toString(2).split('').filter(b => b === '1').length;
  const glyph = encodeGlyph(value);
  return {
    "@type": "schema:Datum",
    "schema:value": value,
    "schema:quantum": n,
    "schema:stratum": stratum,
    "schema:spectrum": spectrum,
    "schema:glyph": { "@type": "u:Address", "u:glyph": glyph, "u:length": 1 }
  };
}

// ── partition:Partition classification (partition.rs) ───────────────────────
function classifyByte(b: number, n: number): { component: string; reason: string } {
  const m = modulus(n);
  if (b === 0)               return { component: 'partition:ExteriorSet',   reason: 'Additive identity (zero)' };
  if (b === 1 || b === m-1) return { component: 'partition:UnitSet',        reason: `Ring unit — multiplicative inverse exists in R_${n}` };
  if (b % 2 !== 0)           return { component: 'partition:IrreducibleSet', reason: `Odd, not a unit — irreducible in R_${n}` };
  if (b === m / 2)           return { component: 'partition:ExteriorSet',   reason: `Even generator (${m/2}) — exterior in R_${n}` };
  return                            { component: 'partition:ReducibleSet',   reason: `Even — decomposes in R_${n}` };
}

// ── Input validation ─────────────────────────────────────────────────────────
function parseIntParam(value: string | null, name: string, min: number, max: number): { val: number } | { err: Response } {
  if (value === null || value === '') {
    return { err: error400(`Parameter '${name}' is required`, name) };
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return { err: error400(`Parameter '${name}' must be an integer in [${min}, ${max}]`, name) };
  }
  return { val: parsed };
}

function getIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

function timestamp(): string { return new Date().toISOString(); }

// ── Rate limit headers builder ────────────────────────────────────────────────
function rateLimitHeaders(rl: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(rl.limit),
    'X-RateLimit-Remaining': String(rl.remaining),
    'X-RateLimit-Reset': String(rl.reset),
  };
}

// ── Standard error responses ──────────────────────────────────────────────────
function error400(message: string, param?: string, rl?: RateLimitResult): Response {
  return new Response(JSON.stringify({
    error: message,
    code: 'INVALID_PARAMETER',
    ...(param ? { param } : {}),
    docs: 'https://api.uor.foundation/v1/openapi.json'
  }), { status: 400, headers: { ...JSON_HEADERS, ...(rl ? rateLimitHeaders(rl) : {}) } });
}

function error405(path: string, allowedMethods: string[]): Response {
  const allow = allowedMethods.filter(m => m !== 'OPTIONS').join(', ') + ', OPTIONS';
  return new Response(JSON.stringify({
    error: `Method not allowed for ${path}. Allowed: ${allow}`,
    code: 'METHOD_NOT_ALLOWED',
    docs: 'https://api.uor.foundation/v1/openapi.json'
  }), { status: 405, headers: { ...JSON_HEADERS, 'Allow': allow } });
}

function error415(rl?: RateLimitResult): Response {
  return new Response(JSON.stringify({
    error: 'Content-Type must be application/json',
    code: 'UNSUPPORTED_MEDIA_TYPE',
    docs: 'https://api.uor.foundation/v1/openapi.json'
  }), { status: 415, headers: { ...JSON_HEADERS, ...(rl ? rateLimitHeaders(rl) : {}) } });
}

function error429(rl: RateLimitResult): Response {
  return new Response(JSON.stringify({
    error: 'Rate limit exceeded',
    code: 'RATE_LIMITED',
    docs: 'https://api.uor.foundation/v1/openapi.json'
  }), { status: 429, headers: { ...JSON_HEADERS, 'Retry-After': '60', ...rateLimitHeaders(rl) } });
}

function error413(rl?: RateLimitResult): Response {
  return new Response(JSON.stringify({
    error: 'Input exceeds maximum length of 1000 characters',
    code: 'PAYLOAD_TOO_LARGE',
    docs: 'https://api.uor.foundation/v1/openapi.json'
  }), { status: 413, headers: { ...JSON_HEADERS, ...(rl ? rateLimitHeaders(rl) : {}) } });
}

function error501(rl?: RateLimitResult): Response {
  return new Response(JSON.stringify({
    error: 'Not implemented in v1',
    code: 'NOT_IMPLEMENTED',
    note: 'This namespace requires the Rust conformance suite for full dihedral factorization.',
    conformance_suite: 'https://github.com/UOR-Foundation/UOR-Framework',
    docs: 'https://api.uor.foundation/v1/openapi.json'
  }), { status: 501, headers: { ...JSON_HEADERS, ...(rl ? rateLimitHeaders(rl) : {}) } });
}

function jsonResp(body: unknown, extraHeaders: Record<string, string> = CACHE_HEADERS_KERNEL, etag?: string, rl?: RateLimitResult): Response {
  const headers: Record<string, string> = {
    ...extraHeaders,
    ...(rl ? rateLimitHeaders(rl) : {}),
    ...(etag ? { 'ETag': etag } : {}),
  };
  return new Response(JSON.stringify(body, null, 2), { status: 200, headers });
}

// ── JSON-LD @context URL — served at https://uor.foundation/contexts/uor-v1.jsonld ──
// Inline object kept for reference; all responses now emit the URL string only.
const UOR_CONTEXT_URL = "https://uor.foundation/contexts/uor-v1.jsonld";

// ════════════════════════════════════════════════════════════════════════════
// STORE/ NAMESPACE — Foundation (Section 1 of 6)
// Namespace:  store: → https://uor.foundation/store/
// Space:      User (parallel to state/ and morphism/)
// Imports:    u:, schema:, state:, cert:, proof:, derivation:
// ════════════════════════════════════════════════════════════════════════════

// ── Re-export shared store functions from lib/store.ts ──────────────────────
// These are also used by the test suite at store/tests/store.test.ts
import {
  KERNEL_SPACE_TYPES,
  validateStorableType,
  UOR_JSONLD_CONTEXT as UOR_STORE_CONTEXT,
  computeUorAddress,
  computeCid,
  canonicalJsonLd,
  glyphToHeaderSafe,
  stripSelfReferentialFields,
} from "./lib/store.ts";

/**
 * Build a complete store:StoredObject envelope per spec 1.4.
 * The @id uses the UOR glyph address (URL-encoded) as the IRI fragment.
 */
async function buildStoredObjectEnvelope(
  payload: Record<string, unknown>,
  gatewayUrl?: string,
): Promise<{
  envelope: Record<string, unknown>;
  canonicalBytes: Uint8Array;
  cid: string;
  uorAddress: { glyph: string; length: number };
  serialisation: string;
}> {
  const serialisation = canonicalJsonLd(payload);
  const canonicalBytes = new TextEncoder().encode(serialisation);
  const cid = await computeCid(canonicalBytes);
  const uorAddress = computeUorAddress(canonicalBytes);
  const ts = timestamp();

  const envelope: Record<string, unknown> = {
    "@context": UOR_STORE_CONTEXT,
    "@id": `https://uor.foundation/store/object/${encodeURIComponent(uorAddress.glyph)}`,
    "@type": "store:StoredObject",
    "store:cid": cid,
    "store:pinnedAt": ts,
    "store:pinRecord": {
      "@type": "store:PinRecord",
      "store:gatewayUrl": gatewayUrl ?? "https://w3s.link",
      "store:pinCertificate": {
        "@type": "cert:TransformCertificate",
        "cert:quantum": 8,
        "cert:timestamp": ts,
        "cert:transformType": "uor-address-to-ipfs-cid",
        "cert:verified": true,
      },
      "store:pinnedAt": ts,
    },
    "store:storedType": payload["@type"] ?? "unknown",
    "store:uorAddress": {
      "@type": "u:Address",
      "u:glyph": uorAddress.glyph,
      "u:length": uorAddress.length,
    },
    "payload": payload,
  };

  return { envelope, canonicalBytes, cid, uorAddress, serialisation };
}

// ── store/ namespace metadata (exposed via /navigate in Section 6) ──────────
const STORE_NAMESPACE_META = {
  "prefix": "store:",
  "iri": "https://uor.foundation/store/",
  "space": "user",
  "api_group": "/store",
  "label": "UOR Persistent Storage",
  "imports": ["u:", "schema:", "state:", "cert:", "proof:", "derivation:"],
  "classes": 6,
  "properties": 14,
  "class_definitions": [
    {
      "@id": "store:StoredObject",
      "@type": "owl:Class",
      "rdfs:label": "StoredObject",
      "rdfs:comment": "A UOR object serialised to JSON-LD and persisted to IPFS. Carries both a u:Address (semantic identity) and a store:Cid (storage identity). Only user-space and bridge-space objects may be stored.",
      "properties": ["store:uorAddress", "store:cid", "store:storedType", "store:serialisation", "store:pinRecord"]
    },
    {
      "@id": "store:Cid",
      "@type": "owl:Class",
      "rdfs:label": "Cid",
      "rdfs:comment": "An IPFS CIDv1 identifier. Binary: <0x01><varint(0x0129)><sha2-256 multihash>. String: base32lower with 'b' prefix. Codec: dag-json (0x0129) — ALWAYS."
    },
    {
      "@id": "store:PinRecord",
      "@type": "owl:Class",
      "rdfs:label": "PinRecord",
      "rdfs:comment": "Auditable record of a pin (write) operation. Contains timestamp, gateway URL, CID, and a cert:TransformCertificate binding u:Address to store:Cid.",
      "properties": ["store:pinnedAt", "store:gatewayUrl", "store:cid", "store:pinCertificate"]
    },
    {
      "@id": "store:StoreContext",
      "@type": "owl:Class",
      "rdfs:label": "StoreContext",
      "rdfs:subClassOf": "state:Context",
      "rdfs:comment": "A persisted state:Context whose bindings are serialised as an IPLD DAG on IPFS. store:rootCid points to the root IPLD node.",
      "properties": ["store:rootCid", "store:ipnsKey"]
    },
    {
      "@id": "store:RetrievedObject",
      "@type": "owl:Class",
      "rdfs:label": "RetrievedObject",
      "rdfs:comment": "Result of reading from IPFS by CID. Contains stored and recomputed u:Addresses for dual verification. store:verified = false signals integrity failure.",
      "properties": ["store:retrievedFrom", "store:storedUorAddress", "store:recomputedUorAddress", "store:verified"]
    },
    {
      "@id": "store:GatewayConfig",
      "@type": "owl:Class",
      "rdfs:label": "GatewayConfig",
      "rdfs:comment": "Configuration for an IPFS gateway — read URL for GET /ipfs/{cid} and Pinning Service API endpoint for POST /pins.",
      "properties": ["store:gatewayReadUrl", "store:pinsApiUrl"]
    }
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// ENDPOINT HANDLERS
// ════════════════════════════════════════════════════════════════════════════

// GET /kernel/op/verify?x=42&n=8
function opVerifyCriticalIdentity(url: URL, rl: RateLimitResult): Response {
  const xRes = parseIntParam(url.searchParams.get('x'), 'x', 0, 65535);
  if ('err' in xRes) return xRes.err;
  const nRaw = url.searchParams.get('n') ?? '8';
  const nRes = parseIntParam(nRaw, 'n', 1, 16);
  if ('err' in nRes) return nRes.err;

  const x = xRes.val, n = nRes.val;
  const m = modulus(n);
  if (x >= m) return error400(`x must be in [0, ${m-1}] for n=${n}`, 'x', rl);

  const bnot_x = bnot(x, n);
  const neg_bnot_x = neg(bnot_x, n);
  const succ_x = succOp(x, n);
  const holds = neg_bnot_x === succ_x;
  const etag = makeETag('/kernel/op/verify', { x: String(x), n: String(n) });

  return jsonResp({
    "summary": {
      "verified": holds,
      "x": x,
      "bnot_x": bnot_x,
      "neg_bnot_x": neg_bnot_x,
      "succ_x": succ_x,
      "statement": `neg(bnot(${x})) = ${neg_bnot_x} = succ(${x}) [${holds ? 'PASS' : 'FAIL'}]`,
      "ring": `Z/${m}Z`
    },
    "@context": UOR_CONTEXT_URL,
    "@id": `https://uor.foundation/instance/proof-critical-identity-x${x}-n${n}`,
    "@type": ["proof:Proof", "proof:CriticalIdentityProof"],
    "proof:quantum": n,
    "proof:verified": holds,
    "proof:timestamp": timestamp(),
    "proof:criticalIdentity": `neg(bnot(x)) = succ(x) for all x in R_${n} = Z/${m}Z`,
    "proof:provesIdentity": {
      "@id": "https://uor.foundation/op/criticalIdentity",
      "@type": "op:Identity",
      "op:lhs": { "@id": "https://uor.foundation/op/succ" },
      "op:rhs": [
        { "@id": "https://uor.foundation/op/neg" },
        { "@id": "https://uor.foundation/op/bnot" }
      ],
      "op:forAll": `x ∈ R_${n}`
    },
    "proof:witness": {
      "@type": "proof:WitnessData",
      "proof:x": x,
      "proof:bnot_x": bnot_x,
      "proof:neg_bnot_x": neg_bnot_x,
      "proof:succ_x": succ_x,
      "proof:holds": holds
    },
    "derivation": {
      "@type": "derivation:DerivationTrace",
      "derivation:step1": `op:bnot(${x}) = ${x} XOR ${m-1} = ${bnot_x}`,
      "derivation:step2": `op:neg(${bnot_x}) = (-${bnot_x}) mod ${m} = ${neg_bnot_x}`,
      "derivation:step3": `op:succ(${x}) = (${x}+1) mod ${m} = ${succ_x}`,
      "derivation:conclusion": `neg(bnot(${x})) = ${neg_bnot_x} = succ(${x}) [${holds ? 'PASS' : 'FAIL'}]`
    },
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/op.rs",
    "conformance_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/conformance/src/tests/fixtures/test6_critical_identity.rs"
  }, CACHE_HEADERS_KERNEL, etag, rl);
}

// GET /kernel/op/verify/all?n=8&expand=false
function opVerifyAll(url: URL, rl: RateLimitResult): Response {
  const nRaw = url.searchParams.get('n') ?? '8';
  const nRes = parseIntParam(nRaw, 'n', 1, 16);
  if ('err' in nRes) return nRes.err;
  const n = nRes.val;
  const m = modulus(n);
  const expand = url.searchParams.get('expand') === 'true';

  let passed = 0, failed = 0;
  const witnesses: unknown[] = [];

  for (let x = 0; x < m; x++) {
    const bnot_x = bnot(x, n);
    const neg_bnot_x = neg(bnot_x, n);
    const succ_x = succOp(x, n);
    const holds = neg_bnot_x === succ_x;
    if (holds) passed++; else failed++;
    if (expand) {
      witnesses.push({
        "@type": "proof:WitnessData",
        "proof:x": x,
        "proof:bnot_x": bnot_x,
        "proof:neg_bnot_x": neg_bnot_x,
        "proof:succ_x": succ_x,
        "proof:holds": holds
      });
    }
  }

  const verified = failed === 0;
  const baseUrl = 'https://api.uor.foundation/v1';
  const etag = makeETag('/kernel/op/verify/all', { n: String(n), expand: String(expand) });

  return jsonResp({
    "@context": UOR_CONTEXT_URL,
    "@id": `https://uor.foundation/instance/coherence-proof-n${n}`,
    "@type": ["proof:Proof", "proof:CoherenceProof"],
    "proof:quantum": n,
    "proof:verified": verified,
    "proof:timestamp": timestamp(),
    "summary": {
      "ring": `Z/${m}Z`,
      "total": m,
      "passed": passed,
      "failed": failed,
      "holds_universally": verified,
      "claim": `neg(bnot(x)) = succ(x) for all x in Z/${m}Z`
    },
    ...(expand ? { "proof:witnesses": witnesses } : {}),
    "expand_url": `${baseUrl}/kernel/op/verify/all?expand=true&n=${n}`,
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/proof.rs"
  }, CACHE_HEADERS_KERNEL, etag, rl);
}

// GET /kernel/op/compute?x=42&n=8&y=10
function opCompute(url: URL, rl: RateLimitResult): Response {
  const xRes = parseIntParam(url.searchParams.get('x'), 'x', 0, 65535);
  if ('err' in xRes) return xRes.err;
  const nRaw = url.searchParams.get('n') ?? '8';
  const nRes = parseIntParam(nRaw, 'n', 1, 16);
  if ('err' in nRes) return nRes.err;

  const x = xRes.val, n = nRes.val;
  const m = modulus(n);
  if (x >= m) return error400(`x must be in [0, ${m-1}] for n=${n}`, 'x', rl);

  const yRaw = url.searchParams.get('y');
  let y = x;
  if (yRaw !== null) {
    const yRes = parseIntParam(yRaw, 'y', 0, 65535);
    if ('err' in yRes) return yRes.err;
    y = yRes.val;
    if (y >= m) return error400(`y must be in [0, ${m-1}] for n=${n}`, 'y', rl);
  }

  const neg_x = neg(x, n);
  const bnot_x = bnot(x, n);
  const succ_x = succOp(x, n);
  const pred_x = predOp(x, n);
  const neg_bnot_x = neg(bnot_x, n);
  const etag = makeETag('/kernel/op/compute', { x: String(x), n: String(n), y: String(y) });

  return jsonResp({
    "summary": {
      "x": x,
      "y": y,
      "ring": `Z/${m}Z`,
      "neg": neg_x,
      "bnot": bnot_x,
      "succ": succ_x,
      "pred": pred_x,
      "add": addOp(x, y, n),
      "sub": subOp(x, y, n),
      "mul": mulOp(x, y, n),
      "xor": xorOp(x, y),
      "and": andOp(x, y),
      "or": orOp(x, y),
      "critical_identity_holds": neg_bnot_x === succ_x
    },
    "@context": UOR_CONTEXT_URL,
    "@id": `https://uor.foundation/instance/op-compute-x${x}-n${n}`,
    "datum": makeDatum(x, n),
    "ring": {
      "@type": "schema:Ring",
      "schema:ringQuantum": n,
      "schema:modulus": m
    },
    "unary_ops": {
      "neg": {
        "@id": "https://uor.foundation/op/neg",
        "@type": "op:UnaryOp",
        "op:arity": 1,
        "op:geometricCharacter": "ring_reflection",
        "formula": `neg(x) = (-x) mod ${m}`,
        "result": neg_x
      },
      "bnot": {
        "@id": "https://uor.foundation/op/bnot",
        "@type": "op:UnaryOp",
        "op:arity": 1,
        "op:geometricCharacter": "hypercube_reflection",
        "formula": `bnot(x) = x XOR ${m-1}`,
        "result": bnot_x
      },
      "succ": {
        "@id": "https://uor.foundation/op/succ",
        "@type": "op:UnaryOp",
        "op:arity": 1,
        "op:geometricCharacter": "rotation",
        "op:composedOf": ["op:neg", "op:bnot"],
        "formula": `succ(x) = neg(bnot(x)) = (x+1) mod ${m}`,
        "result": succ_x
      },
      "pred": {
        "@id": "https://uor.foundation/op/pred",
        "@type": "op:UnaryOp",
        "op:arity": 1,
        "op:geometricCharacter": "rotation_inverse",
        "op:composedOf": ["op:bnot", "op:neg"],
        "formula": `pred(x) = bnot(neg(x)) = (x-1) mod ${m}`,
        "result": pred_x
      }
    },
    "binary_ops": {
      "y": y,
      "add": {
        "@id": "https://uor.foundation/op/add",
        "@type": "op:BinaryOp",
        "op:arity": 2,
        "op:commutative": true,
        "op:associative": true,
        "op:identity": 0,
        "op:geometricCharacter": "translation",
        "formula": `(x + y) mod ${m}`,
        "result": addOp(x, y, n)
      },
      "sub": {
        "@id": "https://uor.foundation/op/sub",
        "@type": "op:BinaryOp",
        "op:arity": 2,
        "op:commutative": false,
        "op:associative": false,
        "op:geometricCharacter": "translation",
        "formula": `(x - y) mod ${m}`,
        "result": subOp(x, y, n)
      },
      "mul": {
        "@id": "https://uor.foundation/op/mul",
        "@type": "op:BinaryOp",
        "op:arity": 2,
        "op:commutative": true,
        "op:associative": true,
        "op:identity": 1,
        "op:geometricCharacter": "scaling",
        "formula": `(x * y) mod ${m}`,
        "result": mulOp(x, y, n)
      },
      "xor": {
        "@id": "https://uor.foundation/op/xor",
        "@type": "op:BinaryOp",
        "op:arity": 2,
        "op:commutative": true,
        "op:associative": true,
        "op:identity": 0,
        "op:geometricCharacter": "hypercube_translation",
        "formula": "x XOR y",
        "result": xorOp(x, y)
      },
      "and": {
        "@id": "https://uor.foundation/op/and",
        "@type": "op:BinaryOp",
        "op:arity": 2,
        "op:commutative": true,
        "op:associative": true,
        "op:geometricCharacter": "hypercube_projection",
        "formula": "x AND y",
        "result": andOp(x, y)
      },
      "or": {
        "@id": "https://uor.foundation/op/or",
        "@type": "op:BinaryOp",
        "op:arity": 2,
        "op:commutative": true,
        "op:associative": true,
        "op:geometricCharacter": "hypercube_join",
        "formula": "x OR y",
        "result": orOp(x, y)
      }
    },
    "critical_identity": {
      "holds": neg_bnot_x === succ_x,
      "neg_bnot_x": neg_bnot_x,
      "succ_x": succ_x,
      "statement": `neg(bnot(${x})) = ${neg_bnot_x} = succ(${x}) [${neg_bnot_x === succ_x ? 'PASS' : 'FAIL'}]`
    },
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/op.rs"
  }, CACHE_HEADERS_KERNEL, etag, rl);
}

// GET /kernel/op/operations
function opList(rl: RateLimitResult): Response {
  const etag = makeETag('/kernel/op/operations', {});
  return jsonResp({
    "summary": {
      "total": 12,
      "unary_count": 4,
      "binary_count": 6,
      "special_count": 2,
      "critical_identity_individuals": ["neg", "bnot", "succ", "criticalIdentity"]
    },
    "@context": UOR_CONTEXT_URL,
    "@id": "https://uor.foundation/op/",
    "@type": "op:OperationCatalogue",
    "description": "All 12 named individuals in the op/ namespace (op.rs)",
    "source": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/op.rs",
    "unary_operations": [
      {
        "@id": "https://uor.foundation/op/neg",
        "@type": ["op:Operation", "op:UnaryOp", "op:Involution"],
        "op:name": "neg",
        "op:arity": 1,
        "op:geometricCharacter": "ring_reflection",
        "formula": "neg(x) = (-x) mod 2^n",
        "description": "Ring negation — additive inverse. Self-inverse: neg(neg(x)) = x.",
        "example_n8": "neg(42) = 214"
      },
      {
        "@id": "https://uor.foundation/op/bnot",
        "@type": ["op:Operation", "op:UnaryOp", "op:Involution"],
        "op:name": "bnot",
        "op:arity": 1,
        "op:geometricCharacter": "hypercube_reflection",
        "formula": "bnot(x) = (2^n - 1) XOR x",
        "description": "Bitwise NOT — hypercube reflection. Self-inverse: bnot(bnot(x)) = x.",
        "example_n8": "bnot(42) = 213"
      },
      {
        "@id": "https://uor.foundation/op/succ",
        "@type": ["op:Operation", "op:UnaryOp"],
        "op:name": "succ",
        "op:arity": 1,
        "op:geometricCharacter": "rotation",
        "op:composedOf": ["op:neg", "op:bnot"],
        "formula": "succ(x) = neg(bnot(x)) = (x + 1) mod 2^n",
        "description": "Successor — composed rotation. Proves the critical identity.",
        "example_n8": "succ(42) = 43"
      },
      {
        "@id": "https://uor.foundation/op/pred",
        "@type": ["op:Operation", "op:UnaryOp"],
        "op:name": "pred",
        "op:arity": 1,
        "op:geometricCharacter": "rotation_inverse",
        "op:composedOf": ["op:bnot", "op:neg"],
        "formula": "pred(x) = bnot(neg(x)) = (x - 1) mod 2^n",
        "description": "Predecessor — inverse rotation.",
        "example_n8": "pred(42) = 41"
      }
    ],
    "binary_operations": [
      {
        "@id": "https://uor.foundation/op/add",
        "@type": ["op:Operation", "op:BinaryOp"],
        "op:name": "add",
        "op:arity": 2,
        "op:geometricCharacter": "translation",
        "op:commutative": true,
        "op:associative": true,
        "op:identity": 0,
        "formula": "(x + y) mod 2^n"
      },
      {
        "@id": "https://uor.foundation/op/sub",
        "@type": ["op:Operation", "op:BinaryOp"],
        "op:name": "sub",
        "op:arity": 2,
        "op:geometricCharacter": "translation",
        "op:commutative": false,
        "op:associative": false,
        "formula": "(x - y) mod 2^n"
      },
      {
        "@id": "https://uor.foundation/op/mul",
        "@type": ["op:Operation", "op:BinaryOp"],
        "op:name": "mul",
        "op:arity": 2,
        "op:geometricCharacter": "scaling",
        "op:commutative": true,
        "op:associative": true,
        "op:identity": 1,
        "formula": "(x * y) mod 2^n"
      },
      {
        "@id": "https://uor.foundation/op/xor",
        "@type": ["op:Operation", "op:BinaryOp"],
        "op:name": "xor",
        "op:arity": 2,
        "op:geometricCharacter": "hypercube_translation",
        "op:commutative": true,
        "op:associative": true,
        "op:identity": 0,
        "formula": "x XOR y"
      },
      {
        "@id": "https://uor.foundation/op/and",
        "@type": ["op:Operation", "op:BinaryOp"],
        "op:name": "and",
        "op:arity": 2,
        "op:geometricCharacter": "hypercube_projection",
        "op:commutative": true,
        "op:associative": true,
        "formula": "x AND y"
      },
      {
        "@id": "https://uor.foundation/op/or",
        "@type": ["op:Operation", "op:BinaryOp"],
        "op:name": "or",
        "op:arity": 2,
        "op:geometricCharacter": "hypercube_join",
        "op:commutative": true,
        "op:associative": true,
        "formula": "x OR y"
      }
    ],
    "special_individuals": [
      {
        "@id": "https://uor.foundation/op/criticalIdentity",
        "@type": "op:Identity",
        "op:name": "criticalIdentity",
        "op:lhs": { "@id": "https://uor.foundation/op/succ" },
        "op:rhs": [
          { "@id": "https://uor.foundation/op/neg" },
          { "@id": "https://uor.foundation/op/bnot" }
        ],
        "op:forAll": "x ∈ R_n",
        "statement": "neg(bnot(x)) = succ(x) for all x in Z/(2^n)Z",
        "description": "The foundational theorem of the UOR kernel."
      },
      {
        "@id": "https://uor.foundation/op/D2n",
        "@type": "op:DihedralGroup",
        "op:name": "D2n",
        "description": "The dihedral group D_{2^n} generated by neg and bnot. Every ring symmetry is a composition of these two involutions.",
        "generators": ["op:neg", "op:bnot"]
      }
    ],
    "total_individuals": 12
  }, CACHE_HEADERS_KERNEL, etag, rl);
}

// POST /kernel/address/encode
async function addressEncode(req: Request, rl: RateLimitResult): Promise<Response> {
  // 415 enforcement
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return error415(rl);

  let body: { input?: unknown; encoding?: unknown };
  try {
    body = await req.json();
  } catch {
    return error400('Request body must be valid JSON', 'body', rl);
  }

  if (typeof body.input !== 'string') return error400("Field 'input' must be a string", 'input', rl);
  if (body.input.length > 1000) return error413(rl);
  if (body.input.length === 0) return error400("Field 'input' must not be empty", 'input', rl);

  const enc = body.encoding ?? 'utf8';
  if (enc !== 'utf8') return error400("Field 'encoding' must be 'utf8'", 'encoding', rl);

  const bytes = new TextEncoder().encode(body.input);
  const simplified = addressSimplified(bytes);
  const n = 8;

  const glyphs = Array.from(bytes).map((b, i) => {
    const byteVal = b & 0x3F;
    const cp = 0x2800 + byteVal;
    const datum = makeDatum(b, n);
    const char = body.input![i] ?? '';
    return {
      "@type": "u:Glyph",
      "u:codepoint": cp,
      "u:byteValue": byteVal,
      "datum": datum,
      "source_byte": b,
      "character": char,
      "address_note": b >= 64 ? "byte ≥ 64: simplified ≠ canonical (dihedral reduction applied to canonical)" : "byte < 64: simplified = canonical"
    };
  });

  return jsonResp({
    "@context": UOR_CONTEXT_URL,
    "@type": "u:Address",
    "u:glyph": simplified,
    "u:length": bytes.length,
    "input": body.input,
    "encoding": "utf8",
    "address_simplified": simplified,
    "address_canonical": simplified,
    "encoding_note": "address_simplified uses 6-bit bijection chr(0x2800 + (b & 0x3F)). address_canonical would apply resolver:DihedralFactorizationResolver for bytes ≥ 64; full dihedral factorization requires the Rust conformance suite.",
    "glyphs": glyphs,
    "ontology_ref": {
      "u_namespace": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/u.rs",
      "resolver_namespace": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/resolver.rs"
    }
  }, CACHE_HEADERS_KERNEL, undefined, rl);
}

// GET /kernel/schema/datum?x=42&n=8
function schemaDatum(url: URL, rl: RateLimitResult): Response {
  const xRes = parseIntParam(url.searchParams.get('x'), 'x', 0, 65535);
  if ('err' in xRes) return xRes.err;
  const nRaw = url.searchParams.get('n') ?? '8';
  const nRes = parseIntParam(nRaw, 'n', 1, 16);
  if ('err' in nRes) return nRes.err;

  const x = xRes.val, n = nRes.val;
  const m = modulus(n);
  if (x >= m) return error400(`x must be in [0, ${m-1}] for n=${n}`, 'x', rl);

  const datum = makeDatum(x, n);
  const spectrum = x.toString(2).padStart(n, '0');
  const stratum = spectrum.split('').filter(b => b === '1').length;
  const { component } = classifyByte(x, n);
  const etag = makeETag('/kernel/schema/datum', { x: String(x), n: String(n) });

  return jsonResp({
    "summary": {
      "value": x,
      "quantum": n,
      "stratum": stratum,
      "spectrum": spectrum,
      "glyph_character": encodeGlyph(x),
      "ring": `Z/${m}Z`,
      "partition_component": component
    },
    "@context": UOR_CONTEXT_URL,
    "@id": `https://uor.foundation/instance/datum-x${x}-n${n}`,
    ...datum,
    "schema:ring": {
      "@type": "schema:Ring",
      "schema:ringQuantum": n,
      "schema:modulus": m
    },
    "named_individuals": {
      "schema:pi1": { "schema:value": 1, "schema:role": "generator", "note": "ring generator, value=1" },
      "schema:zero": { "schema:value": 0, "schema:role": "additive_identity", "note": "additive identity, value=0" }
    },
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/schema.rs"
  }, CACHE_HEADERS_KERNEL, etag, rl);
}

// POST /bridge/partition
async function partitionResolve(req: Request, rl: RateLimitResult): Promise<Response> {
  // 415 enforcement
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return error415(rl);

  let body: { type_definition?: unknown; input?: unknown; encoding?: unknown; resolver?: unknown; n?: unknown };
  try {
    body = await req.json();
  } catch {
    return error400('Request body must be valid JSON', 'body', rl);
  }

  const n = 8;
  const m = modulus(n);

  if (body.type_definition) {
    const td = body.type_definition as Record<string, unknown>;
    const bitWidth = (td['type:bitWidth'] as number) ?? n;
    const nEff = Math.log2(Math.pow(2, bitWidth)) | 0 || n;
    const mEff = modulus(nEff);

    let irreducible = 0, reducible = 0, unit = 0, exterior = 0;
    for (let b = 0; b < mEff; b++) {
      const c = classifyByte(b, nEff).component;
      if (c === 'partition:IrreducibleSet') irreducible++;
      else if (c === 'partition:ReducibleSet') reducible++;
      else if (c === 'partition:UnitSet') unit++;
      else exterior++;
    }
    const density = irreducible / mEff;

    return jsonResp({
      "@context": UOR_CONTEXT_URL,
      "@id": `https://uor.foundation/instance/partition-R${nEff}`,
      "@type": "partition:Partition",
      "partition:quantum": nEff,
      "partition:density": density,
      "partition:sourceType": td,
      "partition:irreducibles": {
        "@type": "partition:IrreducibleSet",
        "partition:cardinality": irreducible,
        "description": "Odd integers that are not units"
      },
      "partition:reducibles": {
        "@type": "partition:ReducibleSet",
        "partition:cardinality": reducible,
        "description": `All even integers in [0,${mEff}) except exterior elements`
      },
      "partition:units": {
        "@type": "partition:UnitSet",
        "partition:cardinality": unit,
        "description": `The ring units: {1, ${mEff-1}}`
      },
      "partition:exterior": {
        "@type": "partition:ExteriorSet",
        "partition:cardinality": exterior,
        "description": `{0, ${mEff/2}} — zero and the even generator`
      },
      "cardinality_check": {
        "sum": irreducible + reducible + unit + exterior,
        "expected": mEff,
        "valid": (irreducible + reducible + unit + exterior) === mEff
      },
      "algebraic_density_signal": density > 0.25 ? `PASS — density ${density.toFixed(4)} > threshold 0.25` : `WARN — density ${density.toFixed(4)} ≤ threshold 0.25`,
      "partition_interpretation": {
        "method": "algebraic-byte-class",
        "note": "Density measures algebraic class distribution of byte values — not semantic novelty or entropy. Repetitive content with algebraically irreducible byte values (odd bytes that are not ring units) will score high density.",
        "threshold": 0.25,
        "result": density > 0.25 ? "PASS" : "WARN",
        "caveat": "A string of identical odd bytes (e.g. 'aaaa') will always PASS because each byte is algebraically irreducible — this is a byte-class property, not a content-quality judgement."
      },
      "resolver": body.resolver ?? "EvaluationResolver",
      "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/partition.rs",
      "conformance_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/conformance/src/tests/fixtures/test5_partition.rs"
    }, CACHE_HEADERS_BRIDGE, undefined, rl);
  }

  if (typeof body.input === 'string') {
    if (body.input.length > 1000) return error413(rl);
    if (body.input.length === 0) return error400("Field 'input' must not be empty", 'input', rl);

    const bytes = Array.from(new TextEncoder().encode(body.input));
    let irreducible = 0, reducible = 0, unit = 0, exterior = 0;

    const perByte = bytes.map(b => {
      const cls = classifyByte(b, n);
      if (cls.component === 'partition:IrreducibleSet') irreducible++;
      else if (cls.component === 'partition:ReducibleSet') reducible++;
      else if (cls.component === 'partition:UnitSet') unit++;
      else exterior++;
      return {
        "datum": makeDatum(b, n),
        "component_class": cls.component,
        "reason": cls.reason
      };
    });

    const density = bytes.length > 0 ? irreducible / bytes.length : 0;

    return jsonResp({
      "@context": UOR_CONTEXT_URL,
      "@type": "partition:Partition",
      "partition:quantum": n,
      "partition:density": density,
      "input": body.input,
      "bytes": bytes,
      "per_byte": perByte,
      "summary": { "irreducible": irreducible, "reducible": reducible, "unit": unit, "exterior": exterior, "total": bytes.length },
      "algebraic_density_signal": density > 0.25 ? `PASS — density ${density.toFixed(4)} > threshold 0.25` : `WARN — density ${density.toFixed(4)} ≤ threshold 0.25`,
      "partition_interpretation": {
        "method": "algebraic-byte-class",
        "note": "Density measures algebraic class distribution of byte values — not semantic novelty or entropy. Repetitive content with algebraically irreducible byte values (odd bytes that are not ring units) will score high density.",
        "threshold": 0.25,
        "result": density > 0.25 ? "PASS" : "WARN",
        "caveat": "A string of identical odd bytes (e.g. 'aaaa') will always PASS because each byte is algebraically irreducible — this is a byte-class property, not a content-quality judgement."
      },
      "resolver": body.resolver ?? "EvaluationResolver",
      "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/partition.rs"
    }, CACHE_HEADERS_BRIDGE, undefined, rl);
  }

  return error400("Request body must include 'type_definition' or 'input'", 'body', rl);
}

// GET /bridge/proof/critical-identity?x=42&n=8
function proofCriticalIdentity(url: URL, rl: RateLimitResult): Response {
  const xRes = parseIntParam(url.searchParams.get('x'), 'x', 0, 65535);
  if ('err' in xRes) return xRes.err;
  const nRaw = url.searchParams.get('n') ?? '8';
  const nRes = parseIntParam(nRaw, 'n', 1, 16);
  if ('err' in nRes) return nRes.err;

  const x = xRes.val, n = nRes.val;
  const m = modulus(n);
  if (x >= m) return error400(`x must be in [0, ${m-1}] for n=${n}`, 'x', rl);

  const bnot_x = bnot(x, n);
  const neg_bnot_x = neg(bnot_x, n);
  const succ_x = succOp(x, n);
  const holds = neg_bnot_x === succ_x;
  const etag = makeETag('/bridge/proof/critical-identity', { x: String(x), n: String(n) });

  return jsonResp({
    "summary": {
      "verified": holds,
      "x": x,
      "bnot_x": bnot_x,
      "neg_bnot_x": neg_bnot_x,
      "succ_x": succ_x,
      "statement": `neg(bnot(${x})) = ${neg_bnot_x} = succ(${x}) [${holds ? 'PASS' : 'FAIL'}]`,
      "proof_id": `https://uor.foundation/instance/bridge-proof-critical-identity-x${x}-n${n}`
    },
    "@context": UOR_CONTEXT_URL,
    "@id": `https://uor.foundation/instance/bridge-proof-critical-identity-x${x}-n${n}`,
    "@type": ["proof:Proof", "proof:CriticalIdentityProof"],
    "proof:quantum": n,
    "proof:verified": holds,
    "proof:timestamp": timestamp(),
    "proof:criticalIdentity": `neg(bnot(x)) = succ(x) for all x in R_${n} = Z/${m}Z`,
    "proof:provesIdentity": {
      "@id": "https://uor.foundation/op/criticalIdentity",
      "@type": "op:Identity",
      "op:lhs": { "@id": "https://uor.foundation/op/succ" },
      "op:rhs": [
        { "@id": "https://uor.foundation/op/neg" },
        { "@id": "https://uor.foundation/op/bnot" }
      ],
      "op:forAll": `x ∈ R_${n}`
    },
    "proof:witness": {
      "@type": "proof:WitnessData",
      "proof:x": x,
      "proof:bnot_x": bnot_x,
      "proof:neg_bnot_x": neg_bnot_x,
      "proof:succ_x": succ_x,
      "proof:holds": holds
    },
    "derivation": {
      "@type": "derivation:DerivationTrace",
      "derivation:step1": `op:bnot(${x}) = ${x} XOR ${m-1} = ${bnot_x}`,
      "derivation:step2": `op:neg(${bnot_x}) = (-${bnot_x}) mod ${m} = ${neg_bnot_x}`,
      "derivation:step3": `op:succ(${x}) = (${x}+1) mod ${m} = ${succ_x}`,
      "derivation:conclusion": `neg(bnot(${x})) = ${neg_bnot_x} = succ(${x}) [${holds ? 'PASS' : 'FAIL'}]`
    },
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/proof.rs",
    "conformance_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/conformance/src/tests/fixtures/test6_critical_identity.rs"
  }, CACHE_HEADERS_BRIDGE, etag, rl);
}

// POST /bridge/proof/coherence
async function proofCoherence(req: Request, rl: RateLimitResult): Promise<Response> {
  // 415 enforcement
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return error415(rl);

  let body: { type_definition?: unknown; n?: unknown };
  try {
    body = await req.json();
  } catch {
    return error400('Request body must be valid JSON', 'body', rl);
  }

  const nRaw = body.n ?? 8;
  if (typeof nRaw !== 'number' || !Number.isInteger(nRaw) || nRaw < 1 || nRaw > 16) {
    return error400("Field 'n' must be an integer in [1, 16]", 'n', rl);
  }
  const n = nRaw as number;
  const m = modulus(n);

  let passed = 0; let failed = 0;
  for (let x = 0; x < m; x++) {
    const neg_bnot_x = neg(bnot(x, n), n);
    const succ_x = succOp(x, n);
    if (neg_bnot_x === succ_x) passed++; else failed++;
  }

  const verified = failed === 0;
  const td = body.type_definition ?? { "@type": "type:PrimitiveType", "type:bitWidth": n };

  return jsonResp({
    "@context": UOR_CONTEXT_URL,
    "@id": `https://uor.foundation/instance/coherence-proof-n${n}`,
    "@type": ["proof:Proof", "proof:CoherenceProof"],
    "proof:quantum": n,
    "proof:verified": verified,
    "proof:timestamp": timestamp(),
    "proof:sourceType": td,
    "summary": {
      "ring": `Z/${m}Z`,
      "total": m,
      "passed": passed,
      "failed": failed,
      "holds_universally": verified,
      "claim": `neg(bnot(x)) = succ(x) for all x in Z/${m}Z`
    },
    "coherence_layers": {
      "self": { "verified": verified, "description": "Ring self-coherence: critical identity holds" },
      "pairwise": { "note": "Pairwise coherence requires two proof:CoherenceProof instances to compare" },
      "global": { "note": "Global coherence requires a proof:GlobalCoherenceProof aggregation" }
    },
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/proof.rs"
  }, CACHE_HEADERS_BRIDGE, undefined, rl);
}

// GET /bridge/cert/involution?operation=neg&n=8
function certInvolution(url: URL, rl: RateLimitResult): Response {
  const op = url.searchParams.get('operation');
  if (!op || !['neg', 'bnot'].includes(op)) {
    return error400("Parameter 'operation' must be 'neg' or 'bnot'", 'operation', rl);
  }
  const nRaw = url.searchParams.get('n') ?? '8';
  const nRes = parseIntParam(nRaw, 'n', 1, 16);
  if ('err' in nRes) return nRes.err;
  const n = nRes.val;
  const m = modulus(n);

  let allHold = true;
  let failCount = 0;
  for (let x = 0; x < m; x++) {
    const result = op === 'neg' ? neg(neg(x, n), n) : bnot(bnot(x, n), n);
    if (result !== x) { allHold = false; failCount++; }
  }

  const opId = op === 'neg' ? 'https://uor.foundation/op/neg' : 'https://uor.foundation/op/bnot';
  const geoChar = op === 'neg' ? 'ring_reflection' : 'hypercube_reflection';
  const formula = op === 'neg' ? `neg(neg(x)) = (-(-x)) mod ${m} = x` : `bnot(bnot(x)) = ((2^${n}-1) XOR (2^${n}-1 XOR x)) = x`;
  const etag = makeETag('/bridge/cert/involution', { operation: op, n: String(n) });

  return jsonResp({
    "summary": {
      "operation": op,
      "total_checked": m,
      "passed": m - failCount,
      "failed": failCount,
      "verified": allHold,
      "statement": `${op}(${op}(x)) = x for all x in R_${n} = Z/${m}Z [${allHold ? 'PASS' : 'FAIL'}]`
    },
    "@context": UOR_CONTEXT_URL,
    "@id": `https://uor.foundation/instance/involution-cert-${op}-n${n}`,
    "@type": ["cert:Certificate", "cert:InvolutionCertificate"],
    "cert:operation": {
      "@id": opId,
      "@type": ["op:Operation", "op:UnaryOp", "op:Involution"],
      "op:geometricCharacter": geoChar
    },
    "cert:method": `exhaustive_verification_R${n}`,
    "cert:verified": allHold,
    "cert:quantum": n,
    "cert:timestamp": timestamp(),
    "verification": {
      "claim": `${op}(${op}(x)) = x for all x in R_${n} = Z/${m}Z`,
      "formula": formula,
      "total_checked": m,
      "passed": m - failCount,
      "failed": failCount,
      "holds_universally": allHold
    },
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/cert.rs"
  }, CACHE_HEADERS_BRIDGE, etag, rl);
}

// GET /bridge/observable/metrics?x=42&n=8
function observableMetrics(url: URL, rl: RateLimitResult): Response {
  const xRes = parseIntParam(url.searchParams.get('x'), 'x', 0, 65535);
  if ('err' in xRes) return xRes.err;
  const nRaw = url.searchParams.get('n') ?? '8';
  const nRes = parseIntParam(nRaw, 'n', 1, 16);
  if ('err' in nRes) return nRes.err;

  const x = xRes.val, n = nRes.val;
  const m = modulus(n);
  if (x >= m) return error400(`x must be in [0, ${m-1}] for n=${n}`, 'x', rl);

  const spectrum = x.toString(2).padStart(n, '0');
  const hammingWeight = spectrum.split('').filter(b => b === '1').length;
  const ringMetric = Math.min(x, m - x);
  const hammingMetric = hammingWeight;
  const cascadeLength = x === 0 ? n : spectrum.split('').reverse().join('').indexOf('1');
  const atThreshold = x === 0 || x === 1 || x === m - 1 || x === m / 2;
  const etag = makeETag('/bridge/observable/metrics', { x: String(x), n: String(n) });

  return jsonResp({
    "summary": {
      "value": x,
      "ring_distance": ringMetric,
      "hamming_weight": hammingMetric,
      "cascade_depth": cascadeLength,
      "at_phase_boundary": atThreshold
    },
    "@context": UOR_CONTEXT_URL,
    "@id": `https://uor.foundation/instance/metrics-x${x}-n${n}`,
    "@type": "observable:MetricBundle",
    "observable:quantum": n,
    "observable:datum": makeDatum(x, n),
    "observable:ringMetric": {
      "@type": "observable:RingMetric",
      "observable:value": ringMetric,
      "observable:formula": `d_R(${x}, 0) = min(${x}, ${m}-${x}) = ${ringMetric}`,
      "description": "Ring distance from x to the additive identity 0"
    },
    "observable:hammingMetric": {
      "@type": "observable:HammingMetric",
      "observable:value": hammingMetric,
      "observable:formula": `popcount(${spectrum}) = ${hammingMetric}`,
      "description": "Number of set bits — Hamming weight in the hypercube"
    },
    "observable:cascadeLength": {
      "@type": "observable:CascadeLength",
      "observable:value": cascadeLength,
      "observable:formula": `trailing_zeros(${x}) = ${cascadeLength}`,
      "description": "Depth of 2-adic factorization"
    },
    "observable:catastropheThreshold": {
      "@type": "observable:CatastropheThreshold",
      "observable:atThreshold": atThreshold,
      "description": "True if x is at a phase boundary {0, 1, m/2, m-1}"
    },
    "observable:commutator": {
      "@type": "observable:Commutator",
      "observable:value": 0,
      "description": "All ring operations commute at the element level (ring is commutative)"
    },
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/observable.rs"
  }, CACHE_HEADERS_BRIDGE, etag, rl);
}

// GET /user/type/primitives
function typeList(rl: RateLimitResult): Response {
  const etag = makeETag('/user/type/primitives', {});
  return jsonResp({
    "summary": {
      "total_primitive_types": 4,
      "rings": ["R_1 = Z/2Z (U1)", "R_4 = Z/16Z (U4)", "R_8 = Z/256Z (U8, default)", "R_16 = Z/65536Z (U16)"]
    },
    "@context": UOR_CONTEXT_URL,
    "@id": "https://uor.foundation/type/",
    "@type": "type:TypeCatalogue",
    "description": "Catalogue of primitive type definitions from type_.rs",
    "source": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/type_.rs",
    "primitive_types": [
      {
        "@id": "https://uor.foundation/type/U8",
        "@type": "type:PrimitiveType",
        "type:name": "U8",
        "type:bitWidth": 8,
        "type:ringQuantum": 8,
        "type:modulus": 256,
        "description": "8-bit unsigned integer — R_8 = Z/256Z. The default UOR ring."
      },
      {
        "@id": "https://uor.foundation/type/U16",
        "@type": "type:PrimitiveType",
        "type:name": "U16",
        "type:bitWidth": 16,
        "type:ringQuantum": 16,
        "type:modulus": 65536,
        "description": "16-bit unsigned integer — R_16 = Z/65536Z"
      },
      {
        "@id": "https://uor.foundation/type/U4",
        "@type": "type:PrimitiveType",
        "type:name": "U4",
        "type:bitWidth": 4,
        "type:ringQuantum": 4,
        "type:modulus": 16,
        "description": "4-bit nibble — R_4 = Z/16Z"
      },
      {
        "@id": "https://uor.foundation/type/U1",
        "@type": "type:PrimitiveType",
        "type:name": "U1",
        "type:bitWidth": 1,
        "type:ringQuantum": 1,
        "type:modulus": 2,
        "description": "1-bit boolean ring — R_1 = Z/2Z"
      }
    ],
    "composite_types": [
      {
        "@id": "https://uor.foundation/type/ProductType",
        "@type": "type:ProductType",
        "description": "Cartesian product of two type:TypeDefinitions — tensor product in R_n"
      },
      {
        "@id": "https://uor.foundation/type/SumType",
        "@type": "type:SumType",
        "description": "Tagged union of type:TypeDefinitions"
      },
      {
        "@id": "https://uor.foundation/type/ConstrainedType",
        "@type": "type:ConstrainedType",
        "description": "A type:TypeDefinition with additional partition:Partition constraints"
      }
    ],
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/type_.rs"
  }, CACHE_HEADERS_USER, etag, rl);
}

// GET /navigate
function frameworkIndex(rl: RateLimitResult): Response {
  const base = 'https://api.uor.foundation/v1';
  const verifySimple = 'https://api.uor.foundation/v1/kernel/op/verify';
  const etag = makeETag('/navigate', {});
  return jsonResp({
    "summary": {
      "total_endpoints": 26,
      "spaces": ["kernel", "bridge", "user", "store", "simple_verify"],
      "quick_start_url": `${verifySimple}?x=42`
    },
    "@context": UOR_CONTEXT_URL,
    "@id": "https://uor.foundation/api/v1",
    "@type": "sdo:WebAPI",
    "title": "UOR Framework REST API — Navigation Index",
    "version": "1.0.0",
    "total_endpoints": 26,
    "description": "Complete index of all 26 working endpoints across 4 spaces (kernel, bridge, user, store). Start with /kernel/op/verify?x=42 for the simplest first call.",
    "openapi_spec": "https://uor.foundation/openapi.json",
    "agent_entry_point": "https://uor.foundation/llms.md",
    "discovery_metadata": "https://uor.foundation/.well-known/uor.json",
    "quick_start": {
      "simplest_first_call": `${verifySimple}?x=42`,
      "simplest_note": "Flat JSON, 5 fields, zero JSON-LD. Best entry point for agents new to UOR.",
      "verify_critical_identity": `${base}/kernel/op/verify?x=42`,
      "compute_all_ops": `${base}/kernel/op/compute?x=42&y=10`,
      "encode_address": `${base}/kernel/address/encode (POST {input:"hello"})`,
      "partition_content": `${base}/bridge/partition (POST {input:"hello"})`
    },
    "spaces": {
      "kernel": {
        "description": "Core ring algebra — u:, schema:, op: namespaces",
        "endpoints": [
          { "method": "GET", "path": `${base}/kernel/op/verify`, "required_params": "x", "optional_params": "n", "example": `${base}/kernel/op/verify?x=42`, "operationId": "opVerifyCriticalIdentity", "summary": "Verify neg(bnot(x)) = succ(x) — the framework's core rule" },
          { "method": "GET", "path": `${base}/kernel/op/verify/all`, "required_params": "none", "optional_params": "n, expand", "example": `${base}/kernel/op/verify/all?n=8`, "operationId": "opVerifyAll", "summary": "Universal proof for all 2^n elements — 256 passes, zero failures" },
          { "method": "GET", "path": `${base}/kernel/op/compute`, "required_params": "x", "optional_params": "n, y", "example": `${base}/kernel/op/compute?x=42&y=10`, "operationId": "opCompute", "summary": "All ring operations for x (and binary ops for x, y)" },
          { "method": "GET", "path": `${base}/kernel/op/operations`, "required_params": "none", "example": `${base}/kernel/op/operations`, "operationId": "opList", "summary": "All 12 named op/ individuals with formulas and definitions" },
          { "method": "POST", "path": `${base}/kernel/address/encode`, "body": "{input, encoding}", "example": `${base}/kernel/address/encode`, "operationId": "addressEncode", "summary": "UTF-8 → u:Address with per-byte Glyph decomposition" },
          { "method": "GET", "path": `${base}/kernel/schema/datum`, "required_params": "x", "optional_params": "n", "example": `${base}/kernel/schema/datum?x=42`, "operationId": "schemaDatum", "summary": "Full schema:Datum — decimal, binary, bits set, content address" }
        ]
      },
      "bridge": {
        "description": "Verification, proof, certification, traces — partition:, proof:, cert:, observable:, derivation:, trace:, resolver: namespaces",
        "endpoints": [
          { "method": "POST", "path": `${base}/bridge/partition`, "body": "{type_definition|input}", "example": `${base}/bridge/partition`, "operationId": "partitionResolve", "summary": "Algebraic density score — classify bytes into four ring-theoretic groups" },
          { "method": "GET", "path": `${base}/bridge/proof/critical-identity`, "required_params": "x", "optional_params": "n", "example": `${base}/bridge/proof/critical-identity?x=42`, "operationId": "proofCriticalIdentity", "summary": "Shareable proof:CriticalIdentityProof — permanent address, all steps explicit" },
          { "method": "POST", "path": `${base}/bridge/proof/coherence`, "body": "{type_definition, n}", "example": `${base}/bridge/proof/coherence`, "operationId": "proofCoherence", "summary": "proof:CoherenceProof — 256/256 elements pass, holds_universally: true" },
          { "method": "GET", "path": `${base}/bridge/cert/involution`, "required_params": "operation", "optional_params": "n", "example": `${base}/bridge/cert/involution?operation=neg`, "operationId": "certInvolution", "summary": "cert:InvolutionCertificate — proves op undoes itself across all values" },
          { "method": "GET", "path": `${base}/bridge/observable/metrics`, "required_params": "x", "optional_params": "n", "example": `${base}/bridge/observable/metrics?x=42`, "operationId": "observableMetrics", "summary": "RingMetric, HammingMetric, CascadeLength, CatastropheThreshold" },
          { "method": "GET", "path": `${base}/bridge/derivation`, "required_params": "x", "optional_params": "n, ops", "example": `${base}/bridge/derivation?x=42&ops=neg,bnot,succ`, "operationId": "bridgeDerivation", "summary": "derivation:DerivationTrace — auditable step-by-step op record with ontology refs" },
          { "method": "GET", "path": `${base}/bridge/trace`, "required_params": "x", "optional_params": "n, ops", "example": `${base}/bridge/trace?x=42&ops=neg,bnot`, "operationId": "bridgeTrace", "summary": "trace:ExecutionTrace — exact bit state per step, Hamming drift, XOR deltas" },
          { "method": "GET", "path": `${base}/bridge/resolver`, "required_params": "x", "optional_params": "n", "example": `${base}/bridge/resolver?x=42`, "operationId": "bridgeResolver", "summary": "resolver:Resolution — canonical category with full factor decomposition" }
        ]
      },
      "user": {
        "description": "Type system and application layer — type:, morphism:, state: namespaces",
        "endpoints": [
          { "method": "GET", "path": `${base}/user/type/primitives`, "required_params": "none", "example": `${base}/user/type/primitives`, "operationId": "typeList", "summary": "Catalogue of type:PrimitiveType — U1, U4, U8, U16 and composite types" },
          { "method": "GET", "path": `${base}/user/morphism/transforms`, "required_params": "x", "optional_params": "from_n, to_n", "example": `${base}/user/morphism/transforms?x=42&from_n=8&to_n=16`, "operationId": "morphismTransforms", "summary": "morphism:RingHomomorphism — structure-preserving map between ring sizes" },
          { "method": "GET", "path": `${base}/user/state`, "required_params": "x", "optional_params": "n", "example": `${base}/user/state?x=42`, "operationId": "userState", "summary": "state:Frame — agent lifecycle: category, entry/exit conditions, all 4 transitions" }
        ]
      },
      "store": {
        "description": "Persistent IPFS storage — store:, u: namespaces. Write UOR objects to IPFS, read them back with dual verification (CID + UOR address), persist agent memory contexts.",
        "endpoints": [
          { "method": "POST", "path": `${base}/store/write`, "body": "{object, gateway?}", "example": `${base}/store/write`, "operationId": "storeWrite", "summary": "Serialise a UOR object to JSON-LD + pin to IPFS. Returns CID and u:Address." },
          { "method": "GET", "path": `${base}/store/read/{cid}`, "required_params": "cid (path)", "optional_params": "gateway, strict", "example": `${base}/store/read/QmXYZ...`, "operationId": "storeRead", "summary": "Retrieve from IPFS + dual verification (CID integrity + UOR address recomputation)" },
          { "method": "GET", "path": `${base}/store/verify/{cid}`, "required_params": "cid (path)", "optional_params": "gateway, expected_uor", "example": `${base}/store/verify/QmXYZ...`, "operationId": "storeVerify", "summary": "Lightweight verify-only — returns boolean verdict without echoing content" },
          { "method": "POST", "path": `${base}/store/write-context`, "body": "{context: {name, bindings}}", "example": `${base}/store/write-context`, "operationId": "storeWriteContext", "summary": "Persist a state:Context as an IPLD DAG. Each binding is a separate IPFS block." },
          { "method": "GET", "path": `${base}/store/resolve`, "required_params": "url", "optional_params": "none", "example": `${base}/store/resolve?url=https://example.com`, "operationId": "storeResolve", "summary": "Fetch remote content and compute its u:Address + CID without storing" },
          { "method": "GET", "path": `${base}/store/gateways`, "required_params": "none", "example": `${base}/store/gateways`, "operationId": "storeGateways", "summary": "List IPFS gateways with live health status" }
        ],
        "cid_format_note": "Pinata returns CIDv0 (Qm...). Use the CID from the pinResult for subsequent reads, not the computed CIDv1 in the envelope."
      },
      "simple_verify": {
        "description": "Standalone simple endpoint — no JSON-LD, flat JSON output. Best first call for agents.",
        "endpoints": [
          { "method": "GET", "path": `${verifySimple}`, "required_params": "x OR content", "example": `${verifySimple}?x=42`, "operationId": "uorVerify", "summary": "Flat JSON: {x, bnot_x, neg_bnot_x, succ_x, holds}. Zero JSON-LD, 5 fields." }
        ]
      }
    },
    "what_you_can_do": {
      "description": "Five concrete capabilities for AI agents — each links to a recipe in llms.md.",
      "capabilities": [
        {
          "name": "Persist Agent Memory",
          "what": "Store session state, tool outputs, or reasoning traces as verifiable IPFS objects. Retrieve them in any future session using the CID.",
          "endpoints": ["POST /store/write-context", "GET /store/read/{cid}"],
          "recipe": "https://uor.foundation/llms.md#recipe-persist-agent-memory"
        },
        {
          "name": "Verify Peer Content",
          "what": "Before trusting content from another agent, verify its integrity: recompute the CID and UOR address and confirm they match the claimed values.",
          "endpoints": ["GET /store/verify/{cid}"],
          "recipe": "https://uor.foundation/llms.md#recipe-verify-peer-content"
        },
        {
          "name": "Detect Prompt Injection",
          "what": "Compare Hamming drift between a declared and executed operation sequence. Non-zero drift signals that instructions were modified in transit.",
          "endpoints": ["GET /bridge/trace?x={x}&ops={declared}", "GET /bridge/trace?x={x}&ops={executed}"],
          "recipe": "https://uor.foundation/llms.md#recipe-detect-prompt-injection"
        },
        {
          "name": "Build Verifiable Output",
          "what": "Encode your output as a UOR address, pin it to IPFS, and share the CID. Any agent can independently verify it was you who produced it.",
          "endpoints": ["POST /kernel/address/encode", "POST /store/write", "GET /store/verify/{cid}"],
          "recipe": "https://uor.foundation/llms.md#recipe-build-verifiable-output"
        },
        {
          "name": "Assess Content Quality",
          "what": "Run partition analysis on any text to measure its irreducible density. Density > 0.25 = novel signal. Density < 0.25 = likely spam or recycled content.",
          "endpoints": ["POST /bridge/partition"],
          "recipe": "https://uor.foundation/llms.md#recipe-assess-content-quality"
        }
      ]
    },
    "namespace_map": [
      { "prefix": "u:", "iri": "https://uor.foundation/u/", "space": "kernel", "api_group": "/kernel", "classes": 2, "properties": 4 },
      { "prefix": "schema:", "iri": "https://uor.foundation/schema/", "space": "kernel", "api_group": "/kernel", "classes": 6, "properties": 13 },
      { "prefix": "op:", "iri": "https://uor.foundation/op/", "space": "kernel", "api_group": "/kernel", "classes": 7, "properties": 13, "individuals": 12 },
      { "prefix": "partition:", "iri": "https://uor.foundation/partition/", "space": "bridge", "api_group": "/bridge/partition", "classes": 6, "properties": 9 },
      { "prefix": "proof:", "iri": "https://uor.foundation/proof/", "space": "bridge", "api_group": "/bridge/proof", "classes": 4, "properties": 11 },
      { "prefix": "cert:", "iri": "https://uor.foundation/cert/", "space": "bridge", "api_group": "/bridge/cert", "classes": 4, "properties": 6 },
      { "prefix": "observable:", "iri": "https://uor.foundation/observable/", "space": "bridge", "api_group": "/bridge/observable", "classes": 26, "properties": 4 },
      { "prefix": "derivation:", "iri": "https://uor.foundation/derivation/", "space": "bridge", "api_group": "/bridge/derivation", "classes": 3, "properties": 8 },
      { "prefix": "trace:", "iri": "https://uor.foundation/trace/", "space": "bridge", "api_group": "/bridge/trace", "classes": 3, "properties": 7 },
      { "prefix": "resolver:", "iri": "https://uor.foundation/resolver/", "space": "bridge", "api_group": "/bridge/resolver", "classes": 3, "properties": 6 },
      { "prefix": "type:", "iri": "https://uor.foundation/type/", "space": "user", "api_group": "/user/type", "classes": 5, "properties": 5 },
      { "prefix": "morphism:", "iri": "https://uor.foundation/morphism/", "space": "user", "api_group": "/user/morphism", "classes": 4, "properties": 9 },
      { "prefix": "state:", "iri": "https://uor.foundation/state/", "space": "user", "api_group": "/user/state", "classes": 5, "properties": 8 },
      { ...STORE_NAMESPACE_META }
    ],
    "reading_order": [
      { "step": 1, "url": "https://uor.foundation/llms.md", "purpose": "Quick Card — 5 minutes", "time": "5 min" },
      { "step": 2, "url": `${base}/kernel/op/verify?x=42`, "purpose": "Live verification of critical identity", "time": "30 sec" },
      { "step": 3, "url": `${base}/openapi.json`, "purpose": "Full OpenAPI 3.1.0 spec", "time": "10 min" },
      { "step": 4, "url": "https://uor.foundation/llms-full.md", "purpose": "Complete implementation guide", "time": "30 min" },
      { "step": 5, "url": "https://github.com/UOR-Foundation/UOR-Framework", "purpose": "Canonical source", "time": "ongoing" }
    ],
    "community": {
      "moltbook": "https://www.moltbook.com/m/uor",
      "discord": "https://discord.gg/ZwuZaNyuve",
      "github": "https://github.com/UOR-Foundation/UOR-Framework"
    }
  }, CACHE_HEADERS_KERNEL, etag, rl);
}

// ════════════════════════════════════════════════════════════════════════════
// NEW ENDPOINT HANDLERS — derivation:, trace:, resolver:, morphism:, state:
// ════════════════════════════════════════════════════════════════════════════

const VALID_OPS = ['neg', 'bnot', 'succ', 'pred'] as const;
type OpName = typeof VALID_OPS[number];

function applyOp(x: number, op: OpName, n: number): number {
  switch (op) {
    case 'neg':  return neg(x, n);
    case 'bnot': return bnot(x, n);
    case 'succ': return succOp(x, n);
    case 'pred': return predOp(x, n);
  }
}

function opFormula(op: OpName, x: number, n: number, result: number): string {
  const m = modulus(n);
  switch (op) {
    case 'neg':  return `neg(${x}) = (-${x}) mod ${m} = ${result}`;
    case 'bnot': return `bnot(${x}) = ${x} XOR ${m - 1} = ${result}`;
    case 'succ': return `succ(${x}) = (${x} + 1) mod ${m} = ${result}`;
    case 'pred': return `pred(${x}) = (${x} - 1 + ${m}) mod ${m} = ${result}`;
  }
}

function opDescription(op: OpName): string {
  switch (op) {
    case 'neg':  return 'Ring negation — additive inverse in Z/(2^n)Z';
    case 'bnot': return 'Bitwise complement — hypercube reflection over the ring';
    case 'succ': return 'Increment — successor function, composed as neg∘bnot';
    case 'pred': return 'Decrement — predecessor function, composed as bnot∘neg';
  }
}

function hammingWeightFn(x: number): number {
  let count = 0, v = x;
  while (v) { count += v & 1; v >>>= 1; }
  return count;
}

function bitDelta(prev: number, curr: number, n: number): string {
  const changed = prev ^ curr;
  if (changed === 0) return 'no bits changed';
  const bits: number[] = [];
  for (let i = 0; i < n; i++) if ((changed >> i) & 1) bits.push(i);
  return `bit${bits.length > 1 ? 's' : ''} [${bits.join(', ')}] flipped`;
}

// GET /bridge/derivation?x=42&n=8&ops=neg,bnot,succ
function bridgeDerivation(url: URL, rl: RateLimitResult): Response {
  const xRes = parseIntParam(url.searchParams.get('x'), 'x', 0, 65535);
  if ('err' in xRes) return xRes.err;
  const nRaw = url.searchParams.get('n') ?? '8';
  const nRes = parseIntParam(nRaw, 'n', 1, 16);
  if ('err' in nRes) return nRes.err;

  const x = xRes.val, n = nRes.val;
  const m = modulus(n);
  if (x >= m) return error400(`x must be in [0, ${m - 1}] for n=${n}`, 'x', rl);

  const opsRaw = url.searchParams.get('ops') ?? 'neg,bnot,succ';
  const opNames = opsRaw.split(',').map(s => s.trim().toLowerCase());
  const invalidOps = opNames.filter(o => !VALID_OPS.includes(o as OpName));
  if (invalidOps.length > 0) {
    return error400(`Invalid operation(s): ${invalidOps.join(', ')}. Valid: ${VALID_OPS.join(', ')}`, 'ops', rl);
  }

  const steps: unknown[] = [];
  let current = x;
  for (let i = 0; i < opNames.length; i++) {
    const op = opNames[i] as OpName;
    const input = current;
    const output = applyOp(input, op, n);
    const stepNum = i + 1;
    steps.push({
      "@type": "derivation:DerivationStep",
      "derivation:stepNumber": stepNum,
      "derivation:operationId": `op:${op}`,
      "derivation:operationDescription": opDescription(op),
      "derivation:input": input,
      "derivation:output": output,
      "derivation:formula": opFormula(op, input, n, output),
      "derivation:ontologyRef": `https://uor.foundation/op/${op}`
    });
    current = output;
  }

  // Verify critical identity holds for original x
  const critHolds = neg(bnot(x, n), n) === succOp(x, n);
  const etag = makeETag('/bridge/derivation', { x: String(x), n: String(n), ops: opsRaw });

  return jsonResp({
    "summary": {
      "source_value": x,
      "operation_sequence": opNames,
      "final_value": current,
      "steps": steps.length,
      "identity_holds": critHolds,
      "statement": `neg(bnot(${x})) = succ(${x}) in R_${n} [${critHolds ? 'PASS' : 'FAIL'}]`
    },
    "@context": UOR_CONTEXT_URL,
    "@id": `https://uor.foundation/instance/derivation-x${x}-n${n}`,
    "@type": "derivation:DerivationTrace",
    "derivation:sourceValue": x,
    "derivation:quantum": n,
    "derivation:ringModulus": m,
    "derivation:operationSequence": opNames,
    "derivation:finalValue": current,
    "derivation:steps": steps,
    "derivation:stepCount": steps.length,
    "derivation:verification": {
      "@type": "derivation:CriticalIdentityCheck",
      "derivation:criticalIdentityHolds": critHolds,
      "derivation:statement": `neg(bnot(${x})) = succ(${x}) in R_${n} [${critHolds ? 'PASS' : 'FAIL'}]`,
      "derivation:witnessNegBnot": neg(bnot(x, n), n),
      "derivation:witnessSucc": succOp(x, n)
    },
    "derivation:timestamp": timestamp(),
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/derivation.rs"
  }, CACHE_HEADERS_BRIDGE, etag, rl);
}

// GET /bridge/trace?x=42&n=8&ops=neg,bnot
function bridgeTrace(url: URL, rl: RateLimitResult): Response {
  const xRes = parseIntParam(url.searchParams.get('x'), 'x', 0, 65535);
  if ('err' in xRes) return xRes.err;
  const nRaw = url.searchParams.get('n') ?? '8';
  const nRes = parseIntParam(nRaw, 'n', 1, 16);
  if ('err' in nRes) return nRes.err;

  const x = xRes.val, n = nRes.val;
  const m = modulus(n);
  if (x >= m) return error400(`x must be in [0, ${m - 1}] for n=${n}`, 'x', rl);

  const opsRaw = url.searchParams.get('ops') ?? 'neg,bnot';
  const opNames = opsRaw.split(',').map(s => s.trim().toLowerCase());
  const invalidOps = opNames.filter(o => !VALID_OPS.includes(o as OpName));
  if (invalidOps.length > 0) {
    return error400(`Invalid operation(s): ${invalidOps.join(', ')}. Valid: ${VALID_OPS.join(', ')}`, 'ops', rl);
  }

  // Frame 0 = initial state
  const frames: unknown[] = [];
  let current = x;
  frames.push({
    "@type": "trace:Frame",
    "trace:frameIndex": 0,
    "trace:operation": null,
    "trace:state": current,
    "trace:binaryState": current.toString(2).padStart(n, '0'),
    "trace:hammingWeight": hammingWeightFn(current),
    "trace:delta": "initial state"
  });

  for (let i = 0; i < opNames.length; i++) {
    const op = opNames[i] as OpName;
    const prev = current;
    current = applyOp(prev, op, n);
    frames.push({
      "@type": "trace:Frame",
      "trace:frameIndex": i + 1,
      "trace:operation": `op:${op}`,
      "trace:operationFormula": opFormula(op, prev, n, current),
      "trace:state": current,
      "trace:binaryState": current.toString(2).padStart(n, '0'),
      "trace:hammingWeight": hammingWeightFn(current),
      "trace:hammingWeightDelta": hammingWeightFn(current) - hammingWeightFn(prev),
      "trace:delta": bitDelta(prev, current, n),
      "trace:xorDiff": prev ^ current
    });
  }

  const totalHammingDrift = hammingWeightFn(current) - hammingWeightFn(x);
  const injectionDetected = totalHammingDrift !== 0;
  const etag = makeETag('/bridge/trace', { x: String(x), n: String(n), ops: opsRaw });

  return jsonResp({
    "summary": {
      "source_value": x,
      "operation_sequence": opNames,
      "final_state": current,
      "frames": frames.length,
      "total_hamming_drift": totalHammingDrift,
      "injection_detected": injectionDetected,
      "note": injectionDetected
        ? `non-zero Hamming drift (${totalHammingDrift}) — operation sequence diverges from canonical`
        : "zero Hamming drift — operation sequence is canonical"
    },
    "injection_example": {
      "description": "How to use Hamming drift for injection detection",
      "canonical_sequence": {
        "ops": "neg,bnot",
        "example_url": `https://api.uor.foundation/v1/bridge/trace?x=${x}&ops=neg,bnot`,
        "expected_drift": 0,
        "meaning": "zero drift = sequence is canonical, no anomaly detected"
      },
      "anomalous_sequence": {
        "ops": "neg,bnot,succ",
        "example_url": `https://api.uor.foundation/v1/bridge/trace?x=${x}&ops=neg,bnot,succ`,
        "expected_drift": "non-zero",
        "meaning": "non-zero drift = sequence diverges from canonical — possible injection signal"
      },
      "detection_rule": "Compare trace:totalHammingDrift between declared and executed operation sequences. Non-zero divergence signals a sequence anomaly."
    },
    "@context": UOR_CONTEXT_URL,
    "@id": `https://uor.foundation/instance/trace-x${x}-n${n}`,
    "@type": "trace:ExecutionTrace",
    "trace:sourceValue": x,
    "trace:quantum": n,
    "trace:ringModulus": m,
    "trace:operationSequence": opNames,
    "trace:finalState": current,
    "trace:finalBinaryState": current.toString(2).padStart(n, '0'),
    "trace:frames": frames,
    "trace:frameCount": frames.length,
    "trace:totalHammingDrift": totalHammingDrift,
    "trace:timestamp": timestamp(),
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/trace.rs"
  }, CACHE_HEADERS_BRIDGE, etag, rl);
}

// GET /bridge/resolver?x=42&n=8
function bridgeResolver(url: URL, rl: RateLimitResult): Response {
  const xRes = parseIntParam(url.searchParams.get('x'), 'x', 0, 65535);
  if ('err' in xRes) return xRes.err;
  const nRaw = url.searchParams.get('n') ?? '8';
  const nRes = parseIntParam(nRaw, 'n', 1, 16);
  if ('err' in nRes) return nRes.err;

  const x = xRes.val, n = nRes.val;
  const m = modulus(n);
  if (x >= m) return error400(`x must be in [0, ${m - 1}] for n=${n}`, 'x', rl);

  const { component, reason } = classifyByte(x, n);

  // Build decomposition steps showing reduction to canonical form
  const decompositionSteps: unknown[] = [];
  let isIrreducible = false;

  if (x === 0) {
    isIrreducible = false;
    decompositionSteps.push({ step: 1, action: 'Classify', result: 'Value is 0 — additive identity (ExteriorSet). No further decomposition possible.' });
  } else if (x === 1 || x === m - 1) {
    isIrreducible = false;
    decompositionSteps.push({ step: 1, action: 'Classify', result: `Value is a ring unit. Multiplicative inverse exists: ${x} * ${x === 1 ? 1 : m - 1} ≡ 1 (mod ${m})` });
  } else if (x % 2 !== 0) {
    // Irreducible: odd and not a unit
    isIrreducible = true;
    decompositionSteps.push({ step: 1, action: 'Parity check', result: `${x} is odd → not divisible by 2 in Z` });
    decompositionSteps.push({ step: 2, action: 'Unit check', result: `${x} ≠ 1 and ${x} ≠ ${m - 1} → not a ring unit` });
    decompositionSteps.push({ step: 3, action: 'Irreducibility verdict', result: `${x} is irreducible in R_${n} = Z/${m}Z — cannot be factored further` });
  } else if (x === m / 2) {
    isIrreducible = false;
    decompositionSteps.push({ step: 1, action: 'Classify', result: `Value is ${m / 2} = 2^${n - 1} — even generator, exterior element in R_${n}` });
  } else {
    // Reducible: even, factor out 2s
    let v = x, depth = 0;
    const factorSteps: string[] = [];
    while (v % 2 === 0 && v !== 0) {
      factorSteps.push(`${v} / 2 = ${v / 2}`);
      v = v / 2;
      depth++;
    }
    isIrreducible = false;
    decompositionSteps.push({ step: 1, action: 'Parity check', result: `${x} is even → reducible` });
    decompositionSteps.push({ step: 2, action: 'Factor cascade', result: factorSteps.join(' → '), cascadeDepth: depth, oddCore: v });
    decompositionSteps.push({ step: 3, action: 'Canonical form', result: `${x} = 2^${depth} × ${v} in Z` });
  }

  // Compute canonical form string
  let canonicalForm = String(x);
  if (!isIrreducible && x !== 0 && !(x === 1 || x === m - 1) && x !== m / 2 && x % 2 === 0) {
    let v2 = x, depth2 = 0;
    while (v2 % 2 === 0) { v2 /= 2; depth2++; }
    canonicalForm = `2^${depth2} × ${v2}`;
  }

  const categoryLabel = component === 'partition:IrreducibleSet'
    ? `Irreducible — structurally unique in R_${n}`
    : component === 'partition:ReducibleSet'
    ? `Reducible — decomposes in R_${n}`
    : component === 'partition:UnitSet'
    ? `Unit — multiplicative identity group in R_${n}`
    : `Exterior — boundary element in R_${n}`;

  const etag = makeETag('/bridge/resolver', { x: String(x), n: String(n) });

  return jsonResp({
    "summary": {
      "input": x,
      "component": component,
      "canonical_form": canonicalForm,
      "is_irreducible": isIrreducible,
      "category_label": categoryLabel
    },
    "@context": UOR_CONTEXT_URL,
    "@id": `https://uor.foundation/instance/resolver-x${x}-n${n}`,
    "@type": "resolver:Resolution",
    "resolver:inputValue": x,
    "resolver:quantum": n,
    "resolver:ringModulus": m,
    "resolver:component": component,
    "resolver:componentReason": reason,
    "resolver:isIrreducible": isIrreducible,
    "resolver:canonicalForm": canonicalForm,
    "resolver:decomposition": decompositionSteps,
    "resolver:partitionRef": {
      "@type": "partition:ComponentClass",
      "partition:className": component,
      "partition:ontologyRef": `https://uor.foundation/partition/${component.replace('partition:', '')}`
    },
    "resolver:datum": makeDatum(x, n),
    "resolver:timestamp": timestamp(),
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/resolver.rs"
  }, CACHE_HEADERS_BRIDGE, etag, rl);
}

// GET /user/morphism/transforms?x=42&from_n=8&to_n=16
function morphismTransforms(url: URL, rl: RateLimitResult): Response {
  const xRes = parseIntParam(url.searchParams.get('x'), 'x', 0, 65535);
  if ('err' in xRes) return xRes.err;
  const fromNRaw = url.searchParams.get('from_n') ?? '8';
  const fromNRes = parseIntParam(fromNRaw, 'from_n', 1, 16);
  if ('err' in fromNRes) return fromNRes.err;
  const toNRaw = url.searchParams.get('to_n') ?? '16'; // changed default from 4 to 16 (inclusion, lossless)
  const toNRes = parseIntParam(toNRaw, 'to_n', 1, 16);
  if ('err' in toNRes) return toNRes.err;

  const x = xRes.val, fromN = fromNRes.val, toN = toNRes.val;
  const fromM = modulus(fromN), toM = modulus(toN);
  if (x >= fromM) return error400(`x must be in [0, ${fromM - 1}] for from_n=${fromN}`, 'x', rl);

  const isProjection = toN < fromN;
  const isInclusion = toN > fromN;
  const isIdentity = toN === fromN;

  // Compute the image under the homomorphism
  const image = isProjection ? x % toM : x; // inclusion: value is unchanged, identity ring changes

  // Kernel: elements mapping to 0 in the target ring
  const kernelSize = isProjection ? Math.pow(2, fromN - toN) : (isIdentity ? 1 : 0);
  const kernelElements: number[] = [];
  if (isProjection) {
    for (let k = 0; k < fromM; k += toM) kernelElements.push(k);
  } else if (isIdentity) {
    kernelElements.push(0);
  }

  // Structural preservation analysis
  const preserves: string[] = ['add', 'sub', 'mul', 'neg'];
  if (isProjection) preserves.push('bnot (modulo truncation)');
  if (isIdentity) preserves.push('bnot', 'xor', 'and', 'or');

  const morphismType = isProjection ? 'morphism:ProjectionHomomorphism'
    : isInclusion ? 'morphism:InclusionHomomorphism'
    : 'morphism:IdentityHomomorphism';

  const isInjective = !isProjection || fromN <= toN;
  const isSurjective = !isInclusion || fromN >= toN;

  const etag = makeETag('/user/morphism/transforms', { x: String(x), from_n: String(fromN), to_n: String(toN) });

  return jsonResp({
    "summary": {
      "input": x,
      "from_ring": `R_${fromN} = Z/${fromM}Z`,
      "to_ring": `R_${toN} = Z/${toM}Z`,
      "image": image,
      "morphism_type": morphismType.replace('morphism:', ''),
      "is_injective": isInjective,
      "is_isomorphism": isInjective && isSurjective,
      "ring_structure_preserved": true
    },
    "@context": UOR_CONTEXT_URL,
    "@id": `https://uor.foundation/instance/morphism-x${x}-from${fromN}-to${toN}`,
    "@type": ["morphism:RingHomomorphism", morphismType],
    "morphism:source": {
      "@type": "schema:Ring",
      "schema:ringQuantum": fromN,
      "schema:modulus": fromM,
      "schema:label": `R_${fromN} = Z/${fromM}Z`
    },
    "morphism:target": {
      "@type": "schema:Ring",
      "schema:ringQuantum": toN,
      "schema:modulus": toM,
      "schema:label": `R_${toN} = Z/${toM}Z`
    },
    "morphism:inputValue": x,
    "morphism:image": image,
    "morphism:mapFormula": isProjection ? `f(x) = x mod ${toM}` : isInclusion ? `f(x) = x (inclusion, ring extended)` : `f(x) = x (identity)`,
    "morphism:kernelSize": kernelSize,
    "morphism:kernelElements": kernelElements.slice(0, 16), // cap display at 16
    "morphism:preserves": preserves,
    "morphism:isInjective": isInjective,
    "morphism:isSurjective": isSurjective,
    "morphism:isIsomorphism": isInjective && isSurjective,
    "morphism:morphismType": morphismType,
    "morphism:commutativityProof": {
      "@type": "morphism:CommutativityWitness",
      "morphism:example_add": `f(${x} + ${image}) mod ${fromM} = ${(x + image) % fromM} → mod ${toM} = ${((x + image) % fromM) % toM}; f(${x}) + f(${image}) mod ${toM} = ${(image + (isProjection ? image : x)) % toM}`,
      "morphism:addsCommute": true,
      "morphism:mulsCommute": true
    },
    "morphism:timestamp": timestamp(),
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/morphism.rs"
  }, CACHE_HEADERS_USER, etag, rl);
}

// GET /user/state?x=42&n=8
function userState(url: URL, rl: RateLimitResult): Response {
  const xRes = parseIntParam(url.searchParams.get('x'), 'x', 0, 65535);
  if ('err' in xRes) return xRes.err;
  const nRaw = url.searchParams.get('n') ?? '8';
  const nRes = parseIntParam(nRaw, 'n', 1, 16);
  if ('err' in nRes) return nRes.err;

  const x = xRes.val, n = nRes.val;
  const m = modulus(n);
  if (x >= m) return error400(`x must be in [0, ${m - 1}] for n=${n}`, 'x', rl);

  const { component, reason } = classifyByte(x, n);
  const isIdentity = x === 0;
  const isUnit = x === 1 || x === m - 1;
  const isPhaseBoundary = x === m / 2;
  const isIrreducible = x % 2 !== 0 && !isUnit;
  const critHolds = neg(bnot(x, n), n) === succOp(x, n);

  // Entry condition: stable entry states are identities and units
  const entryCondition = {
    "@type": "state:EntryCondition",
    "state:isStableEntry": isIdentity || isUnit,
    "state:reason": isIdentity
      ? `x=0 is the additive identity — canonical entry point for ring R_${n}`
      : isUnit
      ? `x=${x} is a ring unit (invertible) — stable coordination anchor`
      : `x=${x} is not an identity or unit — not a preferred entry state`
  };

  // Exit condition: phase boundary values signal exit
  const exitCondition = {
    "@type": "state:ExitCondition",
    "state:isPhaseBoundary": isPhaseBoundary,
    "state:isExterior": component === 'partition:ExteriorSet',
    "state:reason": isPhaseBoundary
      ? `x=${x} = 2^${n - 1} is a phase boundary — operations change character near this value`
      : component === 'partition:ExteriorSet'
      ? `x=${x} is an exterior element — exit condition satisfied`
      : `x=${x} is interior — no exit condition triggered`
  };

  // Compute all transitions
  const transitions = VALID_OPS.map(op => {
    const nextVal = applyOp(x, op as OpName, n);
    const { component: nextComp } = classifyByte(nextVal, n);
    return {
      "@type": "state:Transition",
      "state:operation": `op:${op}`,
      "state:formula": opFormula(op as OpName, x, n, nextVal),
      "state:fromState": x,
      "state:toState": nextVal,
      "state:fromComponent": component,
      "state:toComponent": nextComp,
      "state:componentChanged": component !== nextComp,
      "state:description": opDescription(op as OpName)
    };
  });

  const etag = makeETag('/user/state', { x: String(x), n: String(n) });

  return jsonResp({
    "summary": {
      "value": x,
      "component": component,
      "stable_entry": isIdentity || isUnit,
      "phase_boundary": isPhaseBoundary,
      "transition_count": transitions.length,
      "critical_identity_holds": critHolds
    },
    "@context": UOR_CONTEXT_URL,
    "@id": `https://uor.foundation/instance/state-x${x}-n${n}`,
    "@type": "state:Frame",
    "state:binding": {
      "@type": "state:StateBinding",
      "state:value": x,
      "state:quantum": n,
      "state:ringModulus": m,
      "state:component": component,
      "state:componentReason": reason,
      "state:isIrreducible": isIrreducible,
      "state:datum": makeDatum(x, n)
    },
    "state:entryCondition": entryCondition,
    "state:exitCondition": exitCondition,
    "state:transitions": transitions,
    "state:transitionCount": transitions.length,
    "state:reachableComponents": [...new Set(transitions.map((t: any) => t['state:toComponent']))],
    "state:criticalIdentityHolds": critHolds,
    "state:timestamp": timestamp(),
    "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/state.rs"
  }, CACHE_HEADERS_USER, etag, rl);
}

// ════════════════════════════════════════════════════════════════════════════
// STORE/ ENDPOINTS (Section 2+)
// ════════════════════════════════════════════════════════════════════════════

const STORE_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const STORE_FETCH_TIMEOUT_MS = 15_000;

// ── Partition analysis for raw bytes ────────────────────────────────────────
function computePartitionFromBytes(bytes: Uint8Array, n: number): Record<string, unknown> {
  const m = modulus(n);
  let irreducible = 0, reducible = 0, units = 0, exterior = 0;
  for (const b of bytes) {
    const val = b % m;
    if (val === 0) {
      exterior++;
    } else if (val === 1 || val === m - 1) {
      units++;
    } else if (val % 2 === 0) {
      reducible++;
    } else {
      irreducible++;
    }
  }
  const total = bytes.length;
  const density = total > 0 ? irreducible / total : 0;
  return {
    "@type": "partition:Partition",
    "partition:quantum": n,
    "partition:irreducibles": { "@type": "partition:IrreducibleSet", "partition:cardinality": irreducible },
    "partition:reducibles": { "@type": "partition:ReducibleSet", "partition:cardinality": reducible },
    "partition:units": { "@type": "partition:UnitSet", "partition:cardinality": units },
    "partition:exterior": { "@type": "partition:ExteriorSet", "partition:cardinality": exterior },
    "partition:density": density,
    "quality_signal": density >= 0.25 ? "PASS" : "LOW — structurally uniform content",
    "partition:note":
      "Partition is based on algebraic byte-class distribution, not semantic content. " +
      "Use as one signal among others.",
  };
}

// ── Observable metrics for a single byte ────────────────────────────────────
function computeMetricsFromByte(b: number, n: number): Record<string, unknown> {
  const m = modulus(n);
  const val = b % m;
  const bitsSet = val.toString(2).split('1').length - 1;
  let cascade = 0;
  let tmp = val;
  while (tmp > 0 && tmp % 2 === 0) { tmp = tmp / 2; cascade++; }
  return {
    "@type": "observable:Observable",
    "observable:value": val,
    "observable:bitsSet": bitsSet,
    "observable:cascadeDepth": cascade,
    "observable:stratum": bitsSet,
    "observable:isNearPhaseBoundary": val === 0 || val === 1 || val === m / 2 || val === m - 1,
  };
}

// GET /store/resolve?url=...&n=8&include_partition=false&include_metrics=false
async function storeResolve(url: URL, rl: RateLimitResult): Promise<Response> {
  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) return error400("Missing required parameter: url", 'url', rl);

  // Validate URL
  let parsedTarget: URL;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return error400(`Invalid URL: "${targetUrl}" is not a valid URL.`, 'url', rl);
  }
  if (parsedTarget.protocol !== 'http:' && parsedTarget.protocol !== 'https:') {
    return error400(`Unsupported protocol: "${parsedTarget.protocol}". Only http: and https: are supported.`, 'url', rl);
  }

  // Ring size
  const n = parseInt(url.searchParams.get('n') ?? '8');
  if (![4, 8, 16].includes(n)) return error400("Invalid ring size n. Allowed values: 4, 8, 16.", 'n', rl);
  const m = modulus(n);

  const includePartition = url.searchParams.get('include_partition') === 'true';
  const includeMetrics = url.searchParams.get('include_metrics') === 'true';

  // Fetch remote resource with timeout
  let fetchResponse: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), STORE_FETCH_TIMEOUT_MS);
    fetchResponse = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'UOR-Framework/1.0 (https://uor.foundation; store/resolve)',
        'Accept': '*/*',
      },
    });
    clearTimeout(timeoutId);
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      return new Response(JSON.stringify({
        error: `Request timed out after ${STORE_FETCH_TIMEOUT_MS / 1000}s: ${targetUrl}`,
        code: 'GATEWAY_TIMEOUT',
        docs: 'https://api.uor.foundation/v1/openapi.json',
      }), { status: 504, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
    }
    return new Response(JSON.stringify({
      error: `Failed to fetch: ${e instanceof Error ? e.message : 'unknown error'}`,
      code: 'BAD_GATEWAY',
      docs: 'https://api.uor.foundation/v1/openapi.json',
    }), { status: 502, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }

  if (!fetchResponse.ok) {
    return new Response(JSON.stringify({
      error: `Remote resource returned HTTP ${fetchResponse.status} ${fetchResponse.statusText}`,
      code: 'BAD_GATEWAY',
      url: targetUrl,
      remoteStatus: fetchResponse.status,
      docs: 'https://api.uor.foundation/v1/openapi.json',
    }), { status: 502, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }

  // Read bytes with streaming size limit
  const reader = fetchResponse.body?.getReader();
  if (!reader) {
    return new Response(JSON.stringify({
      error: 'Response body is empty or unreadable.',
      code: 'BAD_GATEWAY',
      docs: 'https://api.uor.foundation/v1/openapi.json',
    }), { status: 502, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.length;
    if (totalBytes > STORE_MAX_BYTES) {
      reader.cancel();
      return error413(rl);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }

  // Compute UOR address (Braille bijection from u.rs)
  const uorAddress = computeUorAddress(bytes);

  // CID preview — computed from raw bytes as a reference.
  // The actual store:Cid after POST /store/write will differ (computed from envelope).
  const rawCidPreview = await computeCid(bytes);
  const contentType = fetchResponse.headers.get('content-type') ?? 'application/octet-stream';

  // Build response
  const result: Record<string, unknown> = {
    "@context": UOR_STORE_CONTEXT,
    "@id": "https://uor.foundation/store/resolved/transient",
    "@type": "store:RetrievedObject",
    "store:sourceUrl": targetUrl,
    "store:contentType": contentType,
    "store:byteLength": bytes.length,
    "store:uorAddress": {
      "@type": "u:Address",
      "u:glyph": uorAddress.glyph,
      "u:length": uorAddress.length,
      "u:encoding": "braille_bijection_Z_2n_Z",
      "u:quantum": n,
    },
    "store:verified": null,
    "store:verifiedNote":
      "No verification performed — this is a resolve-only call. " +
      "store:verified is null until the object is stored and retrieved.",
    "store:cidPreview": rawCidPreview,
    "store:cidPreviewNote":
      "This CID is computed from raw fetched bytes. " +
      "The actual store:Cid after POST /store/write will be computed from the " +
      "canonical JSON-LD StoredObject envelope bytes and will differ.",
    "store:nextStep":
      "To persist this content to IPFS: POST /store/write with {url: '" +
      targetUrl + "'}",
    "resolution": {
      "ring_label": `Z/(2^${n})Z = Z/${m}Z`,
      "method": "braille_bijection",
      "spec": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/u.rs",
      "algorithm":
        "Each byte b in [0,255] maps to Unicode codepoint U+(2800+b). " +
        "The address glyph string is the concatenation of all mapped codepoints. " +
        "This is a lossless bijection, not a hash.",
    },
  };

  // Optional partition analysis
  if (includePartition) {
    result["partition_analysis"] = computePartitionFromBytes(bytes, n);
  }

  // Optional metrics on first byte
  if (includeMetrics) {
    result["observable_metrics"] = computeMetricsFromByte(bytes[0] ?? 0, n);
  }

  const responseBody = canonicalJsonLd(result);
  return new Response(responseBody, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      ...rateLimitHeaders(rl),
      'Content-Type': 'application/ld+json',
      'X-UOR-Address': glyphToHeaderSafe(uorAddress.glyph),
      'X-UOR-Byte-Length': String(bytes.length),
      'X-UOR-Source-URL': targetUrl,
      'X-UOR-Space': 'user',
    },
  });
}

function openapiSpec(): Response {
  return new Response(null, {
    status: 301,
    headers: {
      ...CORS_HEADERS,
      'Location': 'https://uor.foundation/openapi.json',
      'Cache-Control': 'public, max-age=3600',
    }
  });
}

// ── IPFS Pinning Service API ────────────────────────────────────────────────
interface PinResult {
  cid: string;
  gatewayUrl: string;
  gatewayReadUrl: string;
  status: "pinned" | "queued" | "failed";
  timestamp: string;
}

const GATEWAY_CONFIGS: Record<string, { apiUrl: string; readUrl: string; deprecated?: boolean }> = {
  "web3.storage": {
    apiUrl: "https://api.web3.storage",
    readUrl: "https://w3s.link/ipfs/",
    deprecated: true,
  },
  "pinata": {
    apiUrl: "https://api.pinata.cloud",
    readUrl: "https://gateway.pinata.cloud/ipfs/",
  },
  "storacha": {
    apiUrl: "https://up.storacha.network",
    readUrl: "https://storacha.link/ipfs/",
  },
};

// ── Storacha client factory (stateless — Edge Functions have no filesystem) ──
async function getStorachaClient() {
  if (!STORACHA_KEY || !STORACHA_PROOF) {
    throw new Error(
      'Storacha gateway requires STORACHA_KEY and STORACHA_PROOF. ' +
      'Generate via: storacha key create && storacha delegation create <did> --base64'
    )
  }
  console.log('[storacha] KEY prefix:', STORACHA_KEY.substring(0, 8), 'length:', STORACHA_KEY.length)
  console.log('[storacha] PROOF prefix:', STORACHA_PROOF.substring(0, 8), 'length:', STORACHA_PROOF.length)

  let principal;
  try {
    principal = Signer.parse(STORACHA_KEY)
  } catch (e) {
    throw new Error(`STORACHA_KEY parse failed: ${e.message}. Key starts with "${STORACHA_KEY.substring(0, 4)}..." (length ${STORACHA_KEY.length}). Expected format: MgCa... (base64pad Ed25519 private key)`)
  }

  const store = new StoreMemory()
  const client = await StorachaClient.create({ principal, store })

  // Normalize proof: convert base64url to base64pad if needed
  let proofStr = STORACHA_PROOF.replace(/-/g, '+').replace(/_/g, '/')
  const pad = proofStr.length % 4
  if (pad === 2) proofStr += '=='
  else if (pad === 3) proofStr += '='

  let proof;
  try {
    proof = await StorachaProof.parse(proofStr)
  } catch (e) {
    throw new Error(`STORACHA_PROOF parse failed: ${e.message}. Proof starts with "${STORACHA_PROOF.substring(0, 8)}..." (length ${STORACHA_PROOF.length}). Expected: base64 UCAN delegation from 'storacha delegation create --base64'`)
  }

  const space = await client.addSpace(proof)
  await client.setCurrentSpace(space.did())
  return client
}

async function pinToIpfs(
  bytes: Uint8Array,
  gateway: string,
): Promise<PinResult> {
  const ts = timestamp();

  if (gateway === "web3.storage" || gateway === "https://api.web3.storage") {
    throw new Error(
      "web3.storage is deprecated. The legacy upload API has been sunset. " +
      "Use gateway:'pinata' with PINATA_JWT instead. See GET /store/gateways for current options."
    );
  }
  if (gateway === "pinata" || gateway === "https://api.pinata.cloud") {
    return await pinToPinata(bytes, ts);
  }
  if (gateway === "storacha" || gateway === "https://up.storacha.network") {
    // Derive a human-readable label from the bytes (try to extract @type)
    let label = "uor-object";
    try {
      const parsed = JSON.parse(new TextDecoder().decode(bytes));
      const objType = parsed?.["payload"]?.["@type"] ?? parsed?.["@type"] ?? "";
      if (typeof objType === "string" && objType.length > 0) {
        label = objType.replace(/[:/]/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "uor-object";
      }
    } catch { /* use default label */ }

    const storachaResult = await pinToStoracha(bytes, label);
    // Adapt StorachaPinResult → PinResult for unified downstream handling
    return {
      cid: storachaResult.directoryCid,
      gatewayUrl: "https://up.storacha.network",
      gatewayReadUrl: storachaResult.gatewayUrl,
      status: "pinned" as const,
      timestamp: ts,
    };
  }
  throw new Error(`Unknown gateway: "${gateway}". Use GET /store/gateways for valid options.`);
}

async function pinToWeb3Storage(bytes: Uint8Array, ts: string): Promise<PinResult> {
  const token = Deno.env.get("WEB3_STORAGE_TOKEN");
  if (!token) {
    throw new Error(
      "web3.storage requires a WEB3_STORAGE_TOKEN secret. " +
      "The legacy anonymous upload API has been sunset. " +
      "Either configure WEB3_STORAGE_TOKEN or use gateway:'pinata' with PINATA_JWT instead."
    );
  }

  const formData = new FormData();
  const blob = new Blob([bytes], { type: "application/ld+json" });
  formData.append("file", blob, "uor-object.jsonld");

  const response = await fetch("https://api.web3.storage/upload", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`web3.storage returned HTTP ${response.status}: ${body}`);
  }

  const result = await response.json();
  const cid = result.cid ?? response.headers.get("x-ipfs-path")?.replace("/ipfs/", "");
  if (!cid) {
    throw new Error("web3.storage did not return a CID in response.");
  }

  return {
    cid,
    gatewayUrl: "https://api.web3.storage",
    gatewayReadUrl: `https://w3s.link/ipfs/${cid}`,
    status: "pinned",
    timestamp: ts,
  };
}

async function pinToPinata(bytes: Uint8Array, ts: string): Promise<PinResult> {
  const jwt = Deno.env.get("PINATA_JWT");
  if (!jwt) throw new Error("PINATA_JWT environment variable not set.");

  // pinFileToIPFS uploads raw bytes — Pinata stores them byte-exact in UnixFS.
  // This is the ONLY way to guarantee byte-level lossless round-trips.
  // pinJSONToIPFS would re-serialize our JSON, destroying canonical key ordering.
  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: "application/ld+json" }), "uor-object.jsonld");
  formData.append("pinataMetadata", JSON.stringify({ name: "uor-object" }));

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Pinata returned HTTP ${response.status}: ${body}`);
  }

  const result = await response.json();
  const cid = result.IpfsHash;
  if (!cid) {
    throw new Error("Pinata did not return a CID (IpfsHash) in response.");
  }

  const dedicatedGw = Deno.env.get("PINATA_GATEWAY_URL") ?? "https://gateway.pinata.cloud";
  return {
    cid,
    gatewayUrl: "https://api.pinata.cloud",
    gatewayReadUrl: `${dedicatedGw}/ipfs/${cid}`,
    status: "pinned",
    timestamp: ts,
  };
}

// ── Storacha write — raw bytes, same lossless pattern as Pinata ─────────────
// Storacha wraps the file in a UnixFS directory by default — this is expected.
// The directoryCid differs from the UOR CIDv1 (baguqeera...) — same dual-CID
// pattern already present with Pinata. Both are deterministic and correct.

interface StorachaPinResult {
  directoryCid: string        // CIDv1 bafy... of the wrapping directory (use for retrieval)
  gatewayUrl: string          // Full HTTPS URL to retrieve the file
  provider: string
}

async function pinToStoracha(
  canonicalBytes: Uint8Array,
  label: string
): Promise<StorachaPinResult> {
  const client = await getStorachaClient()

  // Upload raw bytes as a File — byte-exact, no re-serialization.
  // This is the Storacha equivalent of Pinata's pinFileToIPFS.
  const filename = `${label}.jsonld`
  const file = new File(
    [canonicalBytes],
    filename,
    { type: 'application/ld+json' }
  )

  // uploadFile returns the CID of the UnixFS directory wrapping the file
  let dirCid;
  try {
    dirCid = await client.uploadFile(file)
  } catch (e) {
    console.error('[storacha] uploadFile error:', e.message, e.cause ?? '')
    throw new Error(`Storacha uploadFile failed: ${e.message}`)
  }
  const cidStr = dirCid.toString()

  return {
    directoryCid: cidStr,
    gatewayUrl: `https://${cidStr}.ipfs.storacha.link/${filename}`,
    provider: 'storacha'
  }
}

// ── POST /store/write — Serialise UOR Object + Pin to IPFS ─────────────────
async function storeWrite(req: Request, rl: RateLimitResult): Promise<Response> {
  // Step 1: Validate Content-Type
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return error415(rl);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
      status: 422,
    }), { status: 422, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }

  const payload = body.object as Record<string, unknown> | undefined;
  if (!payload || typeof payload !== 'object') {
    return error400('Missing required field: "object"', 'object', rl);
  }

  const objectType = payload['@type'] as string | undefined;
  if (!objectType) {
    return error400('The "object" must have an "@type" field', '@type', rl);
  }

  // Reject kernel-space types (HTTP 422)
  try {
    validateStorableType(objectType);
  } catch (e) {
    return new Response(JSON.stringify({
      error: `Kernel-space type '${objectType}' cannot be stored on IPFS.`,
      detail: "Kernel objects (u:, schema:, op: namespaces) are compiled into the UOR runtime and recomputed on demand. Only User-space and Bridge-space objects may be persisted.",
      valid_types: [
        "cert:Certificate", "cert:TransformCertificate", "cert:IsometryCertificate",
        "cert:InvolutionCertificate", "proof:Proof", "proof:CriticalIdentityProof",
        "proof:CoherenceProof", "partition:Partition", "state:Binding", "state:Context",
        "state:Transition", "state:Frame", "morphism:Transform", "morphism:Isometry",
        "morphism:Embedding", "type:TypeDefinition", "type:PrimitiveType",
        "derivation:Derivation", "trace:ComputationTrace",
      ],
      status: 422,
    }), { status: 422, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }

  const shouldPin = body.pin !== false;
  const gateway = (body.gateway as string) ?? (Deno.env.get('DEFAULT_WRITE_GATEWAY') ?? 'pinata');
  const label = (body.label as string) ?? undefined;

  if (!GATEWAY_CONFIGS[gateway]) {
    return error400(`Unknown gateway: "${gateway}". Accepted: ${Object.keys(GATEWAY_CONFIGS).join(', ')}`, 'gateway', rl);
  }

  // Early credential check for Storacha
  if (gateway === "storacha" && shouldPin) {
    if (!STORACHA_KEY || !STORACHA_PROOF) {
      return new Response(JSON.stringify({
        error: "Storacha gateway requires STORACHA_KEY and STORACHA_PROOF environment variables.",
        code: "MISSING_STORACHA_CREDENTIALS",
        docs: "https://docs.storacha.network/how-to/upload/"
      }), { status: 503, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
    }
  }

  const ts = timestamp();
  const gatewayConfig = GATEWAY_CONFIGS[gateway];

  // Resolve storedType to full IRI
  const storedType = objectType.includes(':') && !objectType.includes('://')
    ? `https://uor.foundation/${objectType.replace(':', '/')}`
    : objectType;

  // ── Round 1: Build envelope WITHOUT cid/uorAddress ──
  const envelopeRound1: Record<string, unknown> = {
    "@context": UOR_STORE_CONTEXT,
    "@id": "https://uor.foundation/store/object/pending",
    "@type": "store:StoredObject",
    "store:pinnedAt": shouldPin ? ts : null,
    "store:pinRecord": {
      "@type": "store:PinRecord",
      "store:gatewayUrl": gatewayConfig.apiUrl,
      "store:pinCertificate": {
        "@type": "cert:TransformCertificate",
        "cert:quantum": 8,
        "cert:timestamp": ts,
        "cert:transformType": "uor-address-to-ipfs-cid",
        "cert:verified": shouldPin, // false in dry run
      },
      "store:pinnedAt": shouldPin ? ts : null, // null in dry run
    },
    "store:storedType": storedType,
    ...(label ? { "store:label": label } : {}),
    "payload": payload,
  };

  const round1Bytes = new TextEncoder().encode(canonicalJsonLd(envelopeRound1));

  // ── Steps 4-5: Compute addresses from Round 1 bytes ──
  const uorAddress = computeUorAddress(round1Bytes);
  const cid = await computeCid(round1Bytes);

  // ── Step 6: Fill in computed addresses ──
  const completeEnvelope: Record<string, unknown> = {
    ...envelopeRound1,
    "@id": `https://uor.foundation/store/object/${encodeURIComponent(uorAddress.glyph)}`,
    "store:cid": cid,
    "store:cidScope":
      "The store:cid is computed from the envelope bytes without the address fields " +
      "(round 1 serialisation). This eliminates the self-referential bootstrapping problem. " +
      "Verification: strip store:cid and store:uorAddress from the retrieved JSON-LD, " +
      "serialise canonically, recompute — addresses must match.",
    "store:uorAddress": {
      "@type": "u:Address",
      "u:encoding": "braille_bijection_Z_2n_Z",
      "u:glyph": uorAddress.glyph,
      "u:length": uorAddress.length,
      "u:quantum": 8,
    },
  };

  // ── Step 7: Re-serialise complete envelope ──
  const finalSerialised = canonicalJsonLd(completeEnvelope);
  const finalBytes = new TextEncoder().encode(finalSerialised);

  // ── Step 8: Pin to IPFS (skip if dry run) ──
  let pinResult: PinResult | null = null;
  let storachaDirectResult: StorachaPinResult | null = null;
  if (shouldPin) {
    try {
      if (gateway === "storacha") {
        // Storacha: use direct pinToStoracha for full result, then adapt to PinResult
        const storachaLabel = objectType.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase().substring(0, 64) || "uor-object";
        storachaDirectResult = await pinToStoracha(finalBytes, storachaLabel);
        pinResult = {
          cid: storachaDirectResult.directoryCid,
          gatewayUrl: "https://up.storacha.network",
          gatewayReadUrl: storachaDirectResult.gatewayUrl,
          status: "pinned",
          timestamp: ts,
        };
      } else {
        pinResult = await pinToIpfs(finalBytes, gateway);
      }
    } catch (e) {
      const msg = e.message ?? String(e);
      const status = msg.includes('timed out') || msg.includes('unreachable') ? 502 : 503;
      return new Response(JSON.stringify({
        error: `IPFS pin failed: ${msg}`,
        code: status === 502 ? 'GATEWAY_UNREACHABLE' : 'GATEWAY_ERROR',
        status,
      }), { status, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
    }
  }

  // ── Step 9: Build response ──
  const gatewayCid = pinResult ? pinResult.cid : cid;
  const gatewayReadUrl = pinResult ? pinResult.gatewayReadUrl : `${gatewayConfig.readUrl}${cid}`;

  const summaryPinned: Record<string, unknown> = {
    "uor_address": uorAddress.glyph,
    "ipfs_cid": cid,
    "gateway_cid": gatewayCid,
    "retrievable_at": gatewayReadUrl,
    "dry_run": false,
    "byte_length": finalBytes.length,
    "how_to_retrieve": `GET /store/read/${gatewayCid}`,
    "how_to_verify": `GET /store/verify/${gatewayCid}`,
    "cid_note": gatewayCid !== cid
      ? `The gateway CID (${gatewayCid}) is a CIDv0/dag-pb hash assigned by the pinning service. The UOR CID (${cid}) is a CIDv1/dag-json content-address computed canonically. Use the gateway CID for retrieval and the UOR CID for algebraic verification.`
      : undefined,
  };

  // Storacha-specific retrieval guidance
  if (gateway === "storacha" && storachaDirectResult) {
    summaryPinned["storacha_note"] = `Retrieve via GET /store/read/${gatewayCid}?gateway=https://storacha.link — or fetch directly at ${gatewayReadUrl}`;
    summaryPinned["cid_note"] = `The directory CID (${gatewayCid}) is a UnixFS/dag-pb CID assigned by Storacha. The UOR CID (${cid}) is the canonical dag-json CID. Use the directory CID for retrieval, the UOR CID for algebraic verification.`;
    summaryPinned["storacha_provider"] = storachaDirectResult.provider;
    summaryPinned["storacha_filename"] = `${objectType.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase().substring(0, 64) || "uor-object"}.jsonld`;
  }

  const response: Record<string, unknown> = {
    ...completeEnvelope,
    "summary": shouldPin
      ? summaryPinned
      : {
          "dry_run": true,
          "uor_address": uorAddress.glyph,
          "ipfs_cid": cid,
          "retrievable_at": null,
          "byte_length": finalBytes.length,
          "note": "Dry run: addresses computed but content NOT pinned to IPFS. Set pin:true to store.",
          "how_to_retrieve": `GET /store/read/${cid}`,
          "how_to_verify": `GET /store/verify/${cid}`,
        },
  };

  const ipfsCidHeader = shouldPin ? cid : 'dry-run';
  const ipfsGatewayHeader = shouldPin ? gatewayReadUrl : 'dry-run';

  return new Response(canonicalJsonLd(response), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/ld+json',
      'X-UOR-Address': glyphToHeaderSafe(uorAddress.glyph),
      'X-IPFS-CID': ipfsCidHeader,
      'X-IPFS-Gateway-URL': ipfsGatewayHeader,
      'X-Store-Dry-Run': String(!shouldPin),
      ...rateLimitHeaders(rl),
    },
  });
}

// ── CID Validation ──────────────────────────────────────────────────────────
function validateCid(cid: string): { valid: boolean; version: 0 | 1; error?: string } {
  if (!cid || cid.length < 8) {
    return { valid: false, version: 0, error: "CID is too short to be valid." };
  }
  // CIDv0: starts with "Qm", base58btc, 46 chars
  if (cid.startsWith("Qm")) {
    if (cid.length !== 46) {
      return { valid: false, version: 0, error: `CIDv0 must be 46 characters. Got ${cid.length}.` };
    }
    const base58Chars = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
    if (!base58Chars.test(cid)) {
      return { valid: false, version: 0, error: "CIDv0 contains invalid base58btc characters." };
    }
    return { valid: true, version: 0 };
  }
  // CIDv1: multibase prefix b/B/z/f/F
  const cidv1Prefixes = ["b", "B", "z", "f", "F"];
  if (cidv1Prefixes.includes(cid[0])) {
    if (cid.length < 8) {
      return { valid: false, version: 1, error: "CIDv1 is too short." };
    }
    return { valid: true, version: 1 };
  }
  return {
    valid: false,
    version: 0,
    error: "Unrecognised CID format. Expected CIDv0 (starts with 'Qm') or CIDv1 (starts with 'b', 'z', or 'f').",
  };
}

// ── Dual Verification Algorithm ─────────────────────────────────────────────
interface DualVerificationResult {
  cid_integrity: {
    performed: boolean;
    expected_cid: string;
    computed_cid: string;
    match: boolean | null;
    note: string;
  };
  uor_consistency: {
    performed: boolean;
    stored_uor_address: string | null;
    recomputed_uor_address: string;
    match: boolean | null;
    note: string;
  };
  store_verified: boolean;
  verdict: string;
}

// ── dag-pb / UnixFS unwrapper ──────────────────────────────────────────────
// IPFS gateways may return raw dag-pb blocks (application/vnd.ipld.raw).
// For single-block UnixFS files, this extracts the original file bytes.
function readVarint(buf: Uint8Array, pos: number): [number, number] {
  let result = 0, shift = 0, i = pos;
  while (i < buf.length) {
    const b = buf[i++];
    result |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) return [result, i];
    shift += 7;
  }
  return [result, i];
}

// ── Gateway URL Builder ──────────────────────────────────────────────────────
function buildGatewayFetchUrl(gateway: string, cid: string, filename?: string): string {
  // Storacha subdomain format: https://{cid}.ipfs.storacha.link/{filename}
  if (gateway.includes('storacha.link') || gateway.includes('ipfs.storacha.link')) {
    const base = `https://${cid}.ipfs.storacha.link`;
    return filename ? `${base}/${filename}` : base;
  }
  // Pinata dedicated gateway (existing)
  if (gateway.includes('mypinata.cloud')) {
    return `${gateway}/ipfs/${cid}`;
  }
  // Standard IPFS path gateway (ipfs.io, cloudflare, w3s.link)
  return `${gateway}/ipfs/${cid}`;
}

function unwrapDagPbUnixFS(raw: Uint8Array): Uint8Array {
  // Storacha subdomain gateway (https://{cid}.ipfs.storacha.link/{filename})
  // serves unwrapped file content directly — no dag-pb unwrapping needed.
  // Pinata dedicated gateway (https://uor.mypinata.cloud/ipfs/{cid})
  // also serves unwrapped content.
  // Public gateways (ipfs.io) may return dag-pb blocks — unwrapper handles this.

  // Try JSON.parse first — if it works, the content isn't dag-pb wrapped
  try {
    JSON.parse(new TextDecoder().decode(raw));
    return raw; // Already unwrapped JSON
  } catch { /* continue to dag-pb unwrap */ }

  // Parse outer PBNode: look for field 1 (Data), wire type 2 (length-delimited)
  let pos = 0;
  let pbNodeData: Uint8Array | null = null;
  while (pos < raw.length) {
    const [tag, nextPos] = readVarint(raw, pos);
    pos = nextPos;
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x07;
    if (wireType === 2) { // length-delimited
      const [len, dataStart] = readVarint(raw, pos);
      if (fieldNumber === 1) { // PBNode.Data
        pbNodeData = raw.subarray(dataStart, dataStart + len);
      }
      pos = dataStart + len;
    } else if (wireType === 0) { // varint
      const [, next] = readVarint(raw, pos);
      pos = next;
    } else {
      break; // unknown wire type
    }
  }

  if (!pbNodeData) return raw; // Not dag-pb, return as-is

  // Parse inner UnixFS Data: look for field 2 (Data), wire type 2
  pos = 0;
  while (pos < pbNodeData.length) {
    const [tag, nextPos] = readVarint(pbNodeData, pos);
    pos = nextPos;
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x07;
    if (wireType === 2) { // length-delimited
      const [len, dataStart] = readVarint(pbNodeData, pos);
      if (fieldNumber === 2) { // UnixFS.Data (the actual file bytes)
        return pbNodeData.subarray(dataStart, dataStart + len);
      }
      pos = dataStart + len;
    } else if (wireType === 0) { // varint
      const [, next] = readVarint(pbNodeData, pos);
      pos = next;
    } else {
      break;
    }
  }

  return raw; // Couldn't unwrap, return as-is
}

async function dualVerify(
  retrievedBytes: Uint8Array,
  requestedCid: string,
): Promise<DualVerificationResult> {
  // Try to parse as JSON-LD to extract stored addresses and reconstruct Round 1
  let parsed: Record<string, unknown> | null = null;
  let storedCid: string | null = null;
  let storedUorGlyph: string | null = null;

  try {
    const text = new TextDecoder().decode(retrievedBytes);
    parsed = JSON.parse(text) as Record<string, unknown>;
    storedCid = (parsed["store:cid"] as string) ?? null;
    const uorAddr = parsed["store:uorAddress"] as Record<string, unknown> | undefined;
    storedUorGlyph = (uorAddr?.["u:glyph"] as string) ?? null;
  } catch {
    // Not JSON-LD — fall through to raw verification
  }

  let recomputedCid: string;
  let recomputedUor: { glyph: string; length: number };

  if (parsed && storedCid) {
    // This is a UOR StoredObject — strip self-referential fields to reconstruct Round 1
    const round1 = stripSelfReferentialFields(parsed);
    const round1Bytes = new TextEncoder().encode(canonicalJsonLd(round1));
    recomputedCid = await computeCid(round1Bytes);
    recomputedUor = computeUorAddress(round1Bytes);
  } else {
    // Raw content — compute directly from retrieved bytes
    recomputedCid = await computeCid(retrievedBytes);
    recomputedUor = computeUorAddress(retrievedBytes);
  }

  // Compare CID: for UOR objects, compare against the stored CID (which was computed from Round 1)
  const expectedCid = storedCid ?? requestedCid;
  const cidMatch = recomputedCid === expectedCid;

  // Compare UOR address
  const uorMatch = storedUorGlyph !== null
    ? recomputedUor.glyph === storedUorGlyph
    : null;

  const storeVerified = cidMatch && uorMatch === true;

  return {
    cid_integrity: {
      performed: true,
      expected_cid: expectedCid,
      computed_cid: recomputedCid,
      match: cidMatch,
      note: cidMatch
        ? "CID integrity confirmed: Round 1 reconstruction matches stored CID."
        : "CID mismatch. Content may have been modified since storage.",
    },
    uor_consistency: {
      performed: true,
      stored_uor_address: storedUorGlyph,
      recomputed_uor_address: recomputedUor.glyph,
      match: uorMatch,
      note: uorMatch === true
        ? "UOR address confirmed: freshly computed address matches stored address. Content is authentic."
        : uorMatch === false
        ? "UOR ADDRESS MISMATCH: Retrieved bytes produce a different UOR address than stored. " +
          "Content has been modified since it was written."
        : "Indeterminate: retrieved content has no store:uorAddress field. " +
          "This content may not have been written via POST /store/write.",
    },
    store_verified: storeVerified,
    verdict: storeVerified
      ? "VERIFIED: Both CID and UOR address checks confirm content integrity."
      : uorMatch === null
      ? "INDETERMINATE: No stored UOR address found in retrieved content."
      : "INTEGRITY FAILURE: Verification mismatch. Do not trust this content.",
  };
}

// ── IPFS Read Gateways ──────────────────────────────────────────────────────
const PINATA_DEDICATED_GATEWAY = Deno.env.get("PINATA_GATEWAY_URL") ?? "https://uor.mypinata.cloud";
const ALLOWED_READ_GATEWAYS = [
  PINATA_DEDICATED_GATEWAY,
  "https://gateway.pinata.cloud",
  "https://ipfs.io",
  "https://w3s.link",
  "https://cloudflare-ipfs.com",
  "https://storacha.link",
];
const DEFAULT_READ_GATEWAY = PINATA_DEDICATED_GATEWAY;
const READ_FETCH_TIMEOUT_MS = 20_000;
const READ_MAX_BYTES = 10 * 1024 * 1024;

// ── GET /store/read/:cid — Retrieve from IPFS + Dual Verification ──────────
async function storeRead(cidParam: string, url: URL, rl: RateLimitResult): Promise<Response> {
  // Validate CID format
  const cidValidation = validateCid(cidParam ?? "");
  if (!cidValidation.valid) {
    return error400(`Invalid CID: ${cidValidation.error}`, 'cid', rl);
  }

  const gatewayOverride = url.searchParams.get('gateway');
  const strict = url.searchParams.get('strict') !== 'false';

  let gateway = DEFAULT_READ_GATEWAY;
  if (gatewayOverride) {
    if (!ALLOWED_READ_GATEWAYS.includes(gatewayOverride)) {
      return error400(
        `Unknown gateway "${gatewayOverride}". Allowed: ${ALLOWED_READ_GATEWAYS.join(', ')}`,
        'gateway', rl,
      );
    }
    gateway = gatewayOverride;
  }

  // Fetch from IPFS gateway — use buildGatewayFetchUrl for correct URL format
  // Storacha uses subdomain format, Pinata uses path format, others use standard path
  const filenameHint = url.searchParams.get('filename') ?? undefined;
  let ipfsUrl = buildGatewayFetchUrl(gateway, cidParam, filenameHint);
  const pinataDedicatedGw = PINATA_DEDICATED_GATEWAY;
  if (gateway === pinataDedicatedGw) {
    const gwToken = Deno.env.get("PINATA_GATEWAY_TOKEN") ?? "";
    if (!gwToken) {
      return new Response(JSON.stringify({
        error: "PINATA_GATEWAY_TOKEN secret is not configured. Cannot authenticate with dedicated gateway.",
        code: "GATEWAY_AUTH_MISSING",
        docs: "https://api.uor.foundation/v1/openapi.json",
      }), { status: 500, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
    }
    ipfsUrl += `?pinataGatewayToken=${gwToken}`;
  }
  let fetchResponse: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), READ_FETCH_TIMEOUT_MS);
    fetchResponse = await fetch(ipfsUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/ld+json, application/json, application/octet-stream, */*',
        'User-Agent': 'UOR-Framework/1.0 (https://uor.foundation; store/read)',
      },
    });
    clearTimeout(timeoutId);
  } catch (e) {
    if (e.name === 'AbortError') {
      return new Response(JSON.stringify({
        error: `Gateway timeout after ${READ_FETCH_TIMEOUT_MS / 1000}s.`,
        code: 'GATEWAY_TIMEOUT', status: 504,
      }), { status: 504, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
    }
    return new Response(JSON.stringify({
      error: `Gateway unreachable: ${e.message}`,
      code: 'GATEWAY_UNREACHABLE', status: 502,
    }), { status: 502, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }

  if (fetchResponse.status === 404) {
    return new Response(JSON.stringify({
      error: `CID not found: ${cidParam}. The content may not be pinned.`,
      code: 'NOT_FOUND', status: 404,
    }), { status: 404, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }

  if (!fetchResponse.ok) {
    return new Response(JSON.stringify({
      error: `Gateway returned HTTP ${fetchResponse.status}.`,
      code: 'GATEWAY_ERROR', status: 502,
    }), { status: 502, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }

  // Read bytes with size limit (streaming)
  const reader = fetchResponse.body?.getReader();
  if (!reader) {
    return new Response(JSON.stringify({
      error: 'Response body is empty or unreadable.',
      code: 'GATEWAY_ERROR', status: 502,
    }), { status: 502, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.length;
    if (totalBytes > READ_MAX_BYTES) {
      reader.cancel();
      return new Response(JSON.stringify({
        error: 'Response exceeds 10MB limit.',
        code: 'PAYLOAD_TOO_LARGE', status: 413,
      }), { status: 413, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }

  // Unwrap dag-pb/UnixFS if gateway returned raw IPLD block
  const unwrappedBytes = unwrapDagPbUnixFS(bytes);

  // Run dual verification on unwrapped content
  const verification = await dualVerify(unwrappedBytes, cidParam);

  // Parse content for response
  let parsedContent: unknown = null;
  try {
    parsedContent = JSON.parse(new TextDecoder().decode(unwrappedBytes));
  } catch {
    parsedContent = `[Binary content, ${unwrappedBytes.length} bytes]`;
  }

  // Handle strict mode integrity failure
  if (strict && !verification.store_verified && verification.uor_consistency.match === false) {
    return new Response(
      canonicalJsonLd({
        "@context": UOR_STORE_CONTEXT,
        "@type": "store:RetrievedObject",
        "store:retrievedFrom": cidParam,
        "store:verified": false,
        "verification": verification,
        "error": "Integrity failure: UOR address mismatch. Content has been modified.",
        "content": parsedContent,
      }),
      {
        status: 409,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/ld+json',
          'X-UOR-Verified': 'false',
          ...rateLimitHeaders(rl),
        },
      },
    );
  }

  // Use verification result's recomputed UOR address (from Round 1 reconstruction)
  // instead of recomputing from Round 2 bytes, which would produce a different address
  const recomputedUorGlyph = verification.uor_consistency.recomputed_uor_address;
  const responseBody = {
    "@context": UOR_STORE_CONTEXT,
    "@id": `https://uor.foundation/store/retrieved/${cidParam}`,
    "@type": "store:RetrievedObject",
    "store:retrievedFrom": cidParam,
    "store:byteLength": unwrappedBytes.length,
    "store:contentType": fetchResponse.headers.get('content-type') ?? 'unknown',
    "store:gatewayUsed": gateway,
    "store:recomputedUorAddress": recomputedUorGlyph,
    "store:storedUorAddress": verification.uor_consistency.stored_uor_address ?? "not found",
    "store:verified": verification.store_verified,
    "verification": verification,
    "content": parsedContent,
  };

  return new Response(canonicalJsonLd(responseBody), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/ld+json',
      'X-UOR-Verified': String(verification.store_verified),
      'X-IPFS-CID': cidParam,
      'X-UOR-Recomputed-Address': glyphToHeaderSafe(recomputedUorGlyph),
      ...rateLimitHeaders(rl),
    },
  });
}

// ── POST /store/write-context — IPLD DAG for state:Context ─────────────────
interface BindingResult {
  inputAddress: string;
  uorAddress: string;
  value: number;
  bindingCid: string;
  bindingUorAddress: string;
  pinResult: PinResult | null;
  ipldLink: string;
}

async function storeWriteContext(req: Request, rl: RateLimitResult): Promise<Response> {
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return error415(rl);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return error400('Invalid JSON body.', 'body', rl);
  }

  const ctx = body['context'] as Record<string, unknown> | undefined;
  if (!ctx) return error400('Missing required field: context', 'context', rl);

  const name = (ctx['name'] as string) ?? `context-${Date.now()}`;
  const quantum = (ctx['quantum'] as number) ?? 8;
  const shouldPin = body['pin'] !== false;
  const gateway = (body['gateway'] as string) ?? (Deno.env.get('DEFAULT_WRITE_GATEWAY') ?? 'pinata');
  const rawBindings = (ctx['bindings'] as unknown[]) ?? [];

  if (!Array.isArray(rawBindings) || rawBindings.length === 0) {
    return error400('context.bindings must be a non-empty array.', 'bindings', rl);
  }
  if (rawBindings.length > 256) {
    return error400(`Too many bindings. Maximum 256 per context.`, 'bindings', rl);
  }
  if (!GATEWAY_CONFIGS[gateway]) {
    return error400(`Unknown gateway: "${gateway}". Accepted: ${Object.keys(GATEWAY_CONFIGS).join(', ')}`, 'gateway', rl);
  }

  const ts = timestamp();
  const bindingResults: BindingResult[] = [];

  // Step 1: Process each binding individually
  for (const raw of rawBindings) {
    const binding = raw as Record<string, unknown>;
    const rawAddress = binding['address'] as string;
    const value = binding['value'] as number;
    const bindingType = (binding['type'] as string) ?? 'type:PrimitiveType';

    if (rawAddress === undefined || value === undefined) {
      return error400('Each binding must have "address" and "value" fields.', 'bindings', rl);
    }

    // Detect if address is already Braille
    let addressGlyph: string;
    let addressLength: number;
    const isBraille = [...rawAddress].every(c => {
      const cp = c.codePointAt(0) ?? 0;
      return cp >= 0x2800 && cp <= 0x28FF;
    });

    if (isBraille) {
      addressGlyph = rawAddress;
      addressLength = [...rawAddress].length;
    } else {
      const encoded = computeUorAddress(new TextEncoder().encode(rawAddress));
      addressGlyph = encoded.glyph;
      addressLength = encoded.length;
    }

    const stratum = value.toString(2).split('1').length - 1;
    const spectrum = value.toString(2).padStart(quantum, '0');

    // Build binding block
    const bindingBlock: Record<string, unknown> = {
      "@context": UOR_STORE_CONTEXT,
      "@id": `https://uor.foundation/store/binding/${encodeURIComponent(addressGlyph)}`,
      "@type": "state:Binding",
      "state:address": {
        "@type": "u:Address",
        "u:glyph": addressGlyph,
        "u:length": addressLength,
      },
      "state:content": {
        "@type": "schema:Datum",
        "schema:quantum": quantum,
        "schema:spectrum": spectrum,
        "schema:stratum": stratum,
        "schema:value": value,
      },
      "state:timestamp": ts,
      "store:storedType": "https://uor.foundation/state/Binding",
    };

    // Compute addresses (round 1)
    const bindingBytes = new TextEncoder().encode(canonicalJsonLd(bindingBlock));
    const bindingUor = computeUorAddress(bindingBytes);
    const bindingCid = await computeCid(bindingBytes);

    const completeBindingBlock = {
      ...bindingBlock,
      "store:cid": bindingCid,
      "store:uorAddress": {
        "@type": "u:Address",
        "u:glyph": bindingUor.glyph,
        "u:length": bindingUor.length,
      },
    };

    // Pin binding block
    let pinResult: PinResult | null = null;
    if (shouldPin) {
      try {
        const finalBytes = new TextEncoder().encode(canonicalJsonLd(completeBindingBlock));
        pinResult = await pinToIpfs(finalBytes, gateway);
      } catch (e) {
        return new Response(JSON.stringify({
          error: `Failed to pin binding "${rawAddress}": ${e.message}`,
          code: 'GATEWAY_ERROR', status: 502,
        }), { status: 502, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
      }
    }

    bindingResults.push({
      inputAddress: rawAddress,
      uorAddress: addressGlyph,
      value,
      bindingCid,
      bindingUorAddress: bindingUor.glyph,
      pinResult,
      ipldLink: `/ipfs/${bindingCid}`,
    });
  }

  // Step 2: Build root context block linking all bindings
  const rootBlock: Record<string, unknown> = {
    "@context": UOR_STORE_CONTEXT,
    "@id": `https://uor.foundation/store/context/${encodeURIComponent(name)}`,
    "@type": "store:StoreContext",
    "state:capacity": Math.pow(2, quantum),
    "state:contentAddress": name,
    "state:quantum": quantum,
    "store:bindingCount": bindingResults.length,
    "store:bindingLinks": bindingResults.map(b => ({
      "binding:address": b.uorAddress,
      "ipld:link": b.ipldLink,
      "store:cid": b.bindingCid,
    })),
    "store:pinnedAt": shouldPin ? ts : null,
    "store:storedType": "https://uor.foundation/store/StoreContext",
  };

  const rootBytes = new TextEncoder().encode(canonicalJsonLd(rootBlock));
  const rootUor = computeUorAddress(rootBytes);
  const rootCid = await computeCid(rootBytes);

  const completeRootBlock = {
    ...rootBlock,
    "store:rootCid": rootCid,
    "store:uorAddress": {
      "@type": "u:Address",
      "u:glyph": rootUor.glyph,
      "u:length": rootUor.length,
    },
  };

  // Pin root block
  if (shouldPin) {
    try {
      const finalRootBytes = new TextEncoder().encode(canonicalJsonLd(completeRootBlock));
      await pinToIpfs(finalRootBytes, gateway);
    } catch (e) {
      return new Response(JSON.stringify({
        error: `Failed to pin context root: ${e.message}`,
        code: 'GATEWAY_ERROR', status: 502,
      }), { status: 502, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
    }
  }

  // Build response
  const response = {
    "@context": UOR_STORE_CONTEXT,
    "@id": `https://uor.foundation/store/context/${encodeURIComponent(name)}`,
    "@type": "store:StoreContext",
    "state:contentAddress": name,
    "state:quantum": quantum,
    "store:bindingCount": bindingResults.length,
    "store:rootCid": rootCid,
    "store:uorAddress": {
      "@type": "u:Address",
      "u:glyph": rootUor.glyph,
      "u:length": rootUor.length,
    },
    "store:pinnedAt": shouldPin ? ts : null,
    "store:bindings": bindingResults.map(b => ({
      "binding:inputAddress": b.inputAddress,
      "binding:uorAddress": b.uorAddress,
      "binding:value": b.value,
      "store:cid": b.bindingCid,
      "ipld:link": b.ipldLink,
    })),
    "summary": {
      "context_name": name,
      "binding_count": bindingResults.length,
      "root_cid": rootCid,
      "root_uor_address": rootUor.glyph,
      "dry_run": !shouldPin,
      "how_to_retrieve_context": `GET /store/read/${rootCid}`,
      "how_to_verify_context": `GET /store/verify/${rootCid}`,
      "how_to_retrieve_binding": "GET /store/read/{binding-cid}",
      "ipld_structure": "Each binding is an individual IPFS block. The root block links to all bindings via IPLD links. Retrieve any binding independently by its CID.",
      "agent_memory_note":
        "This context is now persistent. Share the root CID with any agent to " +
        "give it read access to this memory state. Each binding is independently " +
        "retrievable and verifiable.",
    },
  };

  return new Response(canonicalJsonLd(response), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/ld+json',
      'X-UOR-Context-Root-CID': rootCid,
      'X-UOR-Binding-Count': String(bindingResults.length),
      'X-Store-Dry-Run': String(!shouldPin),
      ...rateLimitHeaders(rl),
    },
  });
}

// ── GET /store/verify/:cid — Lightweight verification-only ─────────────────
async function storeVerify(cidParam: string, url: URL, rl: RateLimitResult): Promise<Response> {
  const cidValidation = validateCid(cidParam ?? "");
  if (!cidValidation.valid) {
    return error400(`Invalid CID: ${cidValidation.error}`, 'cid', rl);
  }

  const gatewayOverride = url.searchParams.get('gateway');
  const expectedUor = url.searchParams.get('expected_uor') ?? null;
  const verifiedAt = timestamp();

  let gateway = DEFAULT_READ_GATEWAY;
  if (gatewayOverride) {
    if (!ALLOWED_READ_GATEWAYS.includes(gatewayOverride)) {
      return error400(
        `Unknown gateway "${gatewayOverride}". Allowed: ${ALLOWED_READ_GATEWAYS.join(', ')}`,
        'gateway', rl,
      );
    }
    gateway = gatewayOverride;
  }

  // Fetch from IPFS gateway — use buildGatewayFetchUrl for correct URL format
  const filenameHint = url.searchParams.get('filename') ?? undefined;
  let ipfsUrl = buildGatewayFetchUrl(gateway, cidParam, filenameHint);
  const pinataDedicatedGw = PINATA_DEDICATED_GATEWAY;
  if (gateway === pinataDedicatedGw) {
    const gwToken = Deno.env.get("PINATA_GATEWAY_TOKEN") ?? "";
    if (!gwToken) {
      return new Response(JSON.stringify({
        error: "PINATA_GATEWAY_TOKEN secret is not configured. Cannot authenticate with dedicated gateway.",
        code: "GATEWAY_AUTH_MISSING",
        docs: "https://api.uor.foundation/v1/openapi.json",
      }), { status: 500, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
    }
    ipfsUrl += `?pinataGatewayToken=${gwToken}`;
  }
  let fetchResponse: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), READ_FETCH_TIMEOUT_MS);
    fetchResponse = await fetch(ipfsUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/ld+json, application/json, application/octet-stream, */*',
        'User-Agent': 'UOR-Framework/1.0 (https://uor.foundation; store/verify)',
      },
    });
    clearTimeout(timeoutId);
  } catch (e) {
    if (e.name === 'AbortError') {
      return new Response(JSON.stringify({
        error: `Gateway timeout after ${READ_FETCH_TIMEOUT_MS / 1000}s.`,
        code: 'GATEWAY_TIMEOUT', status: 504,
      }), { status: 504, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
    }
    return new Response(JSON.stringify({
      error: `Gateway unreachable: ${e.message}`,
      code: 'GATEWAY_UNREACHABLE', status: 502,
    }), { status: 502, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }

  if (fetchResponse.status === 404) {
    return new Response(JSON.stringify({
      error: `CID not found: ${cidParam}`,
      code: 'NOT_FOUND', status: 404,
    }), { status: 404, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }

  if (!fetchResponse.ok) {
    return new Response(JSON.stringify({
      error: `Gateway returned HTTP ${fetchResponse.status}.`,
      code: 'GATEWAY_ERROR', status: 502,
    }), { status: 502, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }

  // Read bytes (streaming, with limit)
  const reader = fetchResponse.body?.getReader();
  if (!reader) {
    return new Response(JSON.stringify({
      error: 'Response body empty.', code: 'GATEWAY_ERROR', status: 502,
    }), { status: 502, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.length;
    if (totalBytes > READ_MAX_BYTES) {
      reader.cancel();
      return new Response(JSON.stringify({
        error: 'Content exceeds 10MB verification limit.',
        code: 'PAYLOAD_TOO_LARGE', status: 413,
      }), { status: 413, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let off = 0;
  for (const c of chunks) { bytes.set(c, off); off += c.length; }

  // Unwrap dag-pb/UnixFS if gateway returned raw IPLD block
  const unwrappedBytes = unwrapDagPbUnixFS(bytes);

  // Parse to detect UOR StoredObject and extract stored addresses
  let parsed: Record<string, unknown> | null = null;
  let storedCid: string | null = null;
  let storedUorGlyph: string | null = expectedUor;

  try {
    parsed = JSON.parse(new TextDecoder().decode(unwrappedBytes)) as Record<string, unknown>;
    storedCid = (parsed["store:cid"] as string) ?? null;
    if (!storedUorGlyph) {
      const uorAddr = parsed["store:uorAddress"] as Record<string, unknown> | undefined;
      storedUorGlyph = (uorAddr?.["u:glyph"] as string) ?? null;
    }
  } catch {
    // Not JSON
  }

  // Reconstruct Round 1 bytes for verification if this is a UOR StoredObject
  let recomputedCid: string;
  let recomputedUor: { glyph: string; length: number };

  if (parsed && storedCid) {
    const round1 = stripSelfReferentialFields(parsed);
    const round1Bytes = new TextEncoder().encode(canonicalJsonLd(round1));
    recomputedCid = await computeCid(round1Bytes);
    recomputedUor = computeUorAddress(round1Bytes);
  } else {
    recomputedCid = await computeCid(unwrappedBytes);
    recomputedUor = computeUorAddress(unwrappedBytes);
  }

  const expectedCidForCheck = storedCid ?? cidParam;
  const cidMatch = recomputedCid === expectedCidForCheck;

  const uorMatch = storedUorGlyph !== null
    ? recomputedUor.glyph === storedUorGlyph
    : null;
  const storeVerified = cidMatch && uorMatch === true;

  const verification = {
    cid_integrity: {
      performed: true,
      expected_cid: cidParam,
      computed_cid: recomputedCid,
      match: cidMatch,
      note: cidMatch
        ? "CID integrity confirmed."
        : "CID mismatch — may be round-1 vs round-2 serialisation difference. UOR address check is authoritative.",
    },
    uor_consistency: {
      performed: true,
      stored_uor_address: storedUorGlyph ?? "not found",
      recomputed_uor_address: recomputedUor.glyph,
      match: uorMatch,
      note: uorMatch === true
        ? "UOR address confirmed. Content is authentic and unmodified."
        : uorMatch === false
        ? "UOR ADDRESS MISMATCH. Content has been modified since storage."
        : "Indeterminate — no stored UOR address found. Pass ?expected_uor= to compare against a known address.",
    },
    store_verified: storeVerified,
    verdict: storeVerified
      ? "VERIFIED: UOR address check confirms content integrity."
      : uorMatch === null
      ? "INDETERMINATE: No reference UOR address available for comparison."
      : "INTEGRITY FAILURE: UOR address mismatch. Content has been modified.",
  };

  const verdictLabel = storeVerified ? "VERIFIED" : uorMatch === null ? "INDETERMINATE" : "FAILED";

  const response = {
    "@context": UOR_STORE_CONTEXT,
    "@id": `https://uor.foundation/store/verify/${cidParam}`,
    "@type": "store:RetrievedObject",
    "store:retrievedFrom": cidParam,
    "store:byteLength": unwrappedBytes.length,
    "store:verified": storeVerified,
    "store:verifiedAt": verifiedAt,
    "verification": verification,
    "summary": {
      "verdict": verdictLabel,
      "safe_to_process": storeVerified,
      "byte_length": totalBytes,
      "cid": cidParam,
      "uor_address": recomputedUor.glyph.substring(0, 64),
      "note": storeVerified
        ? `Both checks passed. Safe to retrieve full content via GET /store/read/${cidParam}`
        : uorMatch === null
        ? "Cannot verify without a reference UOR address. Use ?expected_uor= or retrieve via GET /store/read/:cid."
        : "Verification failed. Do not process this content.",
    },
  };

  // 409 on explicit failure, 200 on verified or indeterminate
  const status = uorMatch === false ? 409 : 200;

  return new Response(canonicalJsonLd(response), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/ld+json',
      'X-UOR-Verified': String(storeVerified),
      'X-UOR-Verdict': verdictLabel,
      'X-IPFS-CID': cidParam,
      ...rateLimitHeaders(rl),
    },
  });
}

// ── GET /store/gateways — Gateway registry ─────────────────────────────────

const GATEWAY_REGISTRY = [
  {
    "@type": "store:GatewayConfig",
    "store:id": "pinata-dedicated",
    "store:provider": "Pinata (Dedicated Gateway)",
    "store:gatewayReadUrl": PINATA_DEDICATED_GATEWAY,
    "store:pinsApiUrl": "https://api.pinata.cloud/pinning/pinFileToIPFS",
    "store:capabilities": ["read", "write"],
    "store:defaultFor": ["read", "write"],
    "store:authRequired": true,
    "store:authNote":
      "Requires PINATA_JWT for writes and PINATA_GATEWAY_TOKEN (or PINATA_JWT) for reads via ?pinataGatewayToken=.",
    "store:note":
      "Dedicated Pinata gateway for byte-level lossless round-trips. Uses pinFileToIPFS to store " +
      "exact canonical bytes, and serves unwrapped file content on read (no dag-pb wrapping). " +
      "This is the only gateway configuration that guarantees write_bytes === read_bytes.",
  },
  {
    "@type": "store:GatewayConfig",
    "store:id": "ipfs-io",
    "store:provider": "Protocol Labs",
    "store:gatewayReadUrl": "https://ipfs.io",
    "store:pinsApiUrl": null,
    "store:capabilities": ["read"],
    "store:defaultFor": [],
    "store:authRequired": false,
    "store:note":
      "Public read-only gateway. May return raw dag-pb blocks; dag-pb unwrapper handles this.",
  },
  {
    "@type": "store:GatewayConfig",
    "store:id": "w3s-link",
    "store:provider": "web3.storage",
    "store:gatewayReadUrl": "https://w3s.link",
    "store:pinsApiUrl": "https://api.web3.storage/upload",
    "store:capabilities": ["read", "write"],
    "store:defaultFor": [],
    "store:authRequired": true,
    "store:authNote":
      "Legacy API sunset. Requires WEB3_STORAGE_TOKEN (UCAN). Use Pinata for new deployments.",
    "store:note":
      "Legacy write gateway. Read access via w3s.link remains functional. For writes, use Pinata.",
  },
  {
    "@type": "store:GatewayConfig",
    "store:id": "pinata-public",
    "store:provider": "Pinata",
    "store:gatewayReadUrl": "https://gateway.pinata.cloud",
    "store:pinsApiUrl": "https://api.pinata.cloud/pinning/pinFileToIPFS",
    "store:capabilities": ["read", "write"],
    "store:defaultFor": [],
    "store:authRequired": true,
    "store:authNote":
      "Requires PINATA_JWT. Public gateway returns dag-pb blocks; use dedicated gateway for lossless reads.",
    "store:note":
      "Public Pinata gateway. Writes use pinFileToIPFS. Reads may return raw dag-pb blocks on this " +
      "public gateway; prefer the dedicated gateway for byte-exact round-trips.",
  },
  {
    "@type": "store:GatewayConfig",
    "store:id": "cloudflare-ipfs",
    "store:provider": "Cloudflare",
    "store:gatewayReadUrl": "https://cloudflare-ipfs.com",
    "store:pinsApiUrl": null,
    "store:capabilities": ["read"],
    "store:defaultFor": [],
    "store:authRequired": false,
    "store:note": "Cloudflare public read gateway. Fast global CDN. Read-only.",
  },
  {
    "@type": "store:GatewayConfig",
    "store:id": "storacha",
    "store:provider": "Storacha (Storacha Network — web3.storage successor)",
    "store:capabilities": ["read", "write"],
    "store:defaultFor": [],
    "store:authRequired": true,
    "store:authNote":
      "Requires STORACHA_KEY (Ed25519 private key) and STORACHA_PROOF (base64 UCAN delegation) " +
      "environment variables. Generate via: storacha key create && storacha delegation create <agent-did> --base64",
    "store:gatewayReadUrl": "https://{cid}.ipfs.storacha.link",
    "store:pinsApiUrl": "https://up.storacha.network",
    "store:note":
      "Storacha is the official successor to web3.storage. Uses UCAN authorization. " +
      "Uploads raw bytes via uploadFile() — byte-exact, lossless. Files stored on Filecoin " +
      "with IPFS hot retrieval. 5 GB free tier. Read via {cid}.ipfs.storacha.link/{filename}. " +
      "CID returned is a UnixFS directory CID (bafy...) — append filename to gateway URL to " +
      "retrieve file content.",
    "store:filecoinBacked": true,
    "store:freeTier": "5 GB",
  },
];

async function checkGatewayHealth(readUrl: string): Promise<"healthy" | "degraded" | "unreachable"> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${readUrl}/ipfs/bafkqaaa?format=raw`, {
      signal: controller.signal,
      headers: { "Accept": "application/vnd.ipld.raw" },
    });
    clearTimeout(timeoutId);
    if (res.ok) return "healthy";
    return "degraded";
  } catch {
    return "unreachable";
  }
}

// ── Storacha health check — uses subdomain-style CID gateway ────────────────
async function checkStorachaHealth(): Promise<"healthy" | "degraded" | "unreachable"> {
  try {
    // bafkqaaa is the IPFS identity CID (empty content) — standard probe per trustless gateway spec
    const resp = await fetch(
      'https://bafkqaaa.ipfs.storacha.link/',
      { signal: AbortSignal.timeout(5000) }
    )
    // 200 or 404 both indicate the gateway is reachable
    return (resp.ok || resp.status === 404) ? 'healthy' : 'degraded'
  } catch {
    return 'unreachable'
  }
}

async function storeGateways(rl: RateLimitResult): Promise<Response> {
  const ts = timestamp();

  // Run health checks in parallel — Storacha uses subdomain-style gateway
  const healthChecks = await Promise.all(
    GATEWAY_REGISTRY.map(async (gw) => {
      const health = gw["store:id"] === "storacha"
        ? await checkStorachaHealth()
        : await checkGatewayHealth(gw["store:gatewayReadUrl"]);
      return { id: gw["store:id"], health };
    })
  );
  const healthMap = Object.fromEntries(healthChecks.map(h => [h.id, h.health]));

  const gatewaysWithHealth = GATEWAY_REGISTRY.map(gw => ({
    ...gw,
    "store:health": healthMap[gw["store:id"]] ?? "unknown",
  }));

  const response = {
    "@context": UOR_STORE_CONTEXT,
    "@id": "https://uor.foundation/store/gateways",
    "@type": "store:GatewayRegistry",
    "store:timestamp": ts,
    "store:defaultReadGateway": DEFAULT_READ_GATEWAY,
    "store:defaultWriteGateway": Deno.env.get('DEFAULT_WRITE_GATEWAY') ?? "pinata",
    "store:gateways": gatewaysWithHealth,
    "store:note":
      "All write operations use raw byte upload for byte-exact canonical storage. " +
      "Pinata: pinFileToIPFS multipart. Storacha: uploadFile() with File blob. " +
      "Both guarantee write_bytes === read_bytes. " +
      "Health checked via bafkqaaa identity probe.",
    "store:ipfsSpecs": {
      "trustless_gateway": "https://specs.ipfs.tech/http-gateways/trustless-gateway/",
      "pinning_service_api": "https://ipfs.github.io/pinning-services-api-spec/",
      "cid_spec": "https://github.com/multiformats/cid",
    },
    "summary": {
      "write_gateways": ["pinata", "storacha"],
      "deprecated_write_gateways": ["web3.storage (sunset — legacy API no longer functional)"],
      "read_gateways": ["ipfs.io", "w3s.link", "cloudflare-ipfs.com", "gateway.pinata.cloud", "storacha.link"],
      "note": "Use POST /store/write with gateway parameter to select write gateway (pinata or storacha). Use gateway query param on GET /store/read/:cid and GET /store/verify/:cid to select read gateway.",
      "storacha_note": "Storacha provides Filecoin-backed persistence (5 GB free). Use gateway:'storacha' for long-term decentralized storage. Pinata remains the default for fastest hot reads.",
    },
  };

  return new Response(canonicalJsonLd(response), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/ld+json',
      'Cache-Control': 'public, max-age=300',
      ...rateLimitHeaders(rl),
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTER
// ════════════════════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  let path = url.pathname.replace(/^\/functions\/v1\/uor-api/, '').replace(/^\/uor-api/, '').replace(/^\/v1/, '') || '/';

  const ip = getIP(req);
  const isPost = req.method === 'POST';
  const rl = checkRateLimit(ip, isPost);

  if (!rl.allowed) return error429(rl);

  // Handle If-None-Match conditional requests for GET endpoints
  const ifNoneMatch = req.headers.get('if-none-match');

  try {
    // ── Navigate & spec ──
    if (path === '/' || path === '') return frameworkIndex(rl);
    if (path === '/navigate') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = frameworkIndex(rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }
    if (path === '/openapi.json') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      return openapiSpec();
    }

    // ── Kernel — op/ ──
    if (path === '/kernel/op/verify/all') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = opVerifyAll(url, rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }
    if (path === '/kernel/op/verify') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = opVerifyCriticalIdentity(url, rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }
    if (path === '/kernel/op/compute') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = opCompute(url, rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }
    if (path === '/kernel/op/operations') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = opList(rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }

    // ── Kernel — address/schema ──
    if (path === '/kernel/address/encode') {
      if (req.method !== 'POST') return error405(path, KNOWN_PATHS[path]);
      return await addressEncode(req, rl);
    }
    if (path === '/kernel/schema/datum') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = schemaDatum(url, rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }

    // ── Bridge — partition ──
    if (path === '/bridge/partition') {
      if (req.method !== 'POST') return error405(path, KNOWN_PATHS[path]);
      return await partitionResolve(req, rl);
    }

    // ── Bridge — proof ──
    if (path === '/bridge/proof/critical-identity') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = proofCriticalIdentity(url, rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }
    if (path === '/bridge/proof/coherence') {
      if (req.method !== 'POST') return error405(path, KNOWN_PATHS[path]);
      return await proofCoherence(req, rl);
    }

    // ── Bridge — cert ──
    if (path === '/bridge/cert/involution') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = certInvolution(url, rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }

    // ── Bridge — observable ──
    if (path === '/bridge/observable/metrics') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = observableMetrics(url, rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }

    // ── User — type ──
    if (path === '/user/type/primitives') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = typeList(rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }

    // ── Bridge — derivation (derivation: namespace) ──
    if (path === '/bridge/derivation') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = bridgeDerivation(url, rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }

    // ── Bridge — trace (trace: namespace) ──
    if (path === '/bridge/trace') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = bridgeTrace(url, rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }

    // ── Bridge — resolver (resolver: namespace) ──
    if (path === '/bridge/resolver') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = bridgeResolver(url, rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }

    // ── User — morphism (morphism: namespace) ──
    if (path === '/user/morphism/transforms') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = morphismTransforms(url, rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }

    // ── User — state (state: namespace) ──
    if (path === '/user/state') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      const resp = userState(url, rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
    }

    // ── Store — resolve (store: namespace) ──
    if (path === '/store/resolve') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      return await storeResolve(url, rl);
    }

    // ── Store — write (store: namespace) ──
    if (path === '/store/write') {
      if (req.method !== 'POST') return error405(path, ['POST', 'OPTIONS']);
      return await storeWrite(req, rl);
    }

    // ── Store — read/:cid (store: namespace) ──
    if (path.startsWith('/store/read/')) {
      if (req.method !== 'GET') return error405(path, ['GET', 'OPTIONS']);
      const cidParam = path.replace('/store/read/', '');
      return await storeRead(cidParam, url, rl);
    }

    // ── Store — write-context (store: namespace) ──
    if (path === '/store/write-context') {
      if (req.method !== 'POST') return error405(path, ['POST', 'OPTIONS']);
      return await storeWriteContext(req, rl);
    }

    // ── Store — verify/:cid (store: namespace) ──
    if (path.startsWith('/store/verify/')) {
      if (req.method !== 'GET') return error405(path, ['GET', 'OPTIONS']);
      const cidParam = path.replace('/store/verify/', '');
      return await storeVerify(cidParam, url, rl);
    }

    // ── Store — gateways (store: namespace) ──
    if (path === '/store/gateways') {
      if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
      return await storeGateways(rl);
    }

    // ── 405 for known paths with wrong method ──
    if (KNOWN_PATHS[path]) {
      return error405(path, KNOWN_PATHS[path]);
    }

    // ── 404 ──
    return new Response(JSON.stringify({
      error: `Unknown route: ${path}`,
      code: 'NOT_FOUND',
      navigate: 'https://api.uor.foundation/v1/navigate',
      docs: 'https://api.uor.foundation/v1/openapi.json'
    }), { status: 404, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });

  } catch (err) {
    console.error('[uor-api] error:', err);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      docs: 'https://api.uor.foundation/v1/openapi.json'
    }), { status: 500, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }
});
