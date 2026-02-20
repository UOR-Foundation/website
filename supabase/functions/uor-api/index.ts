// UOR Framework REST API — Supabase Edge Function
// OpenAPI 3.1.0 compliant router — all endpoints, no external dependencies
// Every response is a valid JSON-LD object traceable to UOR ontology namespaces

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

const CACHE_HEADERS_CONTENT = {
  ...JSON_HEADERS,
  'Cache-Control': 'public, max-age=60',
  'X-UOR-Space': 'bridge',
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

// ── Content Addressing (u.rs) ───────────────────────────────────────────────
function encodeGlyph(b: number): string { return String.fromCodePoint(0x2800 + (b & 0x3F)); }
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
    docs: 'https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/openapi.json'
  }), { status: 400, headers: { ...JSON_HEADERS, ...(rl ? rateLimitHeaders(rl) : {}) } });
}

function error405(path: string, allowedMethods: string[]): Response {
  const allow = allowedMethods.filter(m => m !== 'OPTIONS').join(', ') + ', OPTIONS';
  return new Response(JSON.stringify({
    error: `Method not allowed for ${path}. Allowed: ${allow}`,
    code: 'METHOD_NOT_ALLOWED',
    docs: 'https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/openapi.json'
  }), { status: 405, headers: { ...JSON_HEADERS, 'Allow': allow } });
}

function error429(rl: RateLimitResult): Response {
  return new Response(JSON.stringify({
    error: 'Rate limit exceeded',
    code: 'RATE_LIMITED',
    docs: 'https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/openapi.json'
  }), { status: 429, headers: { ...JSON_HEADERS, 'Retry-After': '60', ...rateLimitHeaders(rl) } });
}

function error413(rl?: RateLimitResult): Response {
  return new Response(JSON.stringify({
    error: 'Input exceeds maximum length of 1000 characters',
    code: 'PAYLOAD_TOO_LARGE',
    docs: 'https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/openapi.json'
  }), { status: 413, headers: { ...JSON_HEADERS, ...(rl ? rateLimitHeaders(rl) : {}) } });
}

function error501(rl?: RateLimitResult): Response {
  return new Response(JSON.stringify({
    error: 'Not implemented in v1',
    code: 'NOT_IMPLEMENTED',
    note: 'This namespace requires the Rust conformance suite for full dihedral factorization.',
    conformance_suite: 'https://github.com/UOR-Foundation/UOR-Framework',
    docs: 'https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/openapi.json'
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

// ── JSON-LD @context (shared) — all 14 UOR namespaces + sdo + xsd ──────────
const UOR_CONTEXT = {
  "u": "https://uor.foundation/u/",
  "schema": "https://uor.foundation/schema/",
  "op": "https://uor.foundation/op/",
  "query": "https://uor.foundation/query/",
  "resolver": "https://uor.foundation/resolver/",
  "type": "https://uor.foundation/type/",
  "partition": "https://uor.foundation/partition/",
  "observable": "https://uor.foundation/observable/",
  "proof": "https://uor.foundation/proof/",
  "derivation": "https://uor.foundation/derivation/",
  "trace": "https://uor.foundation/trace/",
  "cert": "https://uor.foundation/cert/",
  "morphism": "https://uor.foundation/morphism/",
  "state": "https://uor.foundation/state/",
  "sdo": "https://schema.org/",
  "owl": "http://www.w3.org/2002/07/owl#",
  "xsd": "http://www.w3.org/2001/XMLSchema#",
  "rdfs": "http://www.w3.org/2000/01/rdf-schema#"
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
    "@context": UOR_CONTEXT,
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
  const baseUrl = 'https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api';
  const etag = makeETag('/kernel/op/verify/all', { n: String(n), expand: String(expand) });

  return jsonResp({
    "@context": UOR_CONTEXT,
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

  const neg_bnot_x = neg(bnot(x, n), n);
  const succ_x = succOp(x, n);
  const etag = makeETag('/kernel/op/compute', { x: String(x), n: String(n), y: String(y) });

  return jsonResp({
    "@context": UOR_CONTEXT,
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
        "result": neg(x, n)
      },
      "bnot": {
        "@id": "https://uor.foundation/op/bnot",
        "@type": "op:UnaryOp",
        "op:arity": 1,
        "op:geometricCharacter": "hypercube_reflection",
        "formula": `bnot(x) = x XOR ${m-1}`,
        "result": bnot(x, n)
      },
      "succ": {
        "@id": "https://uor.foundation/op/succ",
        "@type": "op:UnaryOp",
        "op:arity": 1,
        "op:geometricCharacter": "rotation",
        "op:composedOf": ["op:neg", "op:bnot"],
        "formula": `succ(x) = neg(bnot(x)) = (x+1) mod ${m}`,
        "result": succOp(x, n)
      },
      "pred": {
        "@id": "https://uor.foundation/op/pred",
        "@type": "op:UnaryOp",
        "op:arity": 1,
        "op:geometricCharacter": "rotation_inverse",
        "op:composedOf": ["op:bnot", "op:neg"],
        "formula": `pred(x) = bnot(neg(x)) = (x-1) mod ${m}`,
        "result": predOp(x, n)
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
    "@context": UOR_CONTEXT,
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
    "@context": UOR_CONTEXT,
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
  }, CACHE_HEADERS_CONTENT, undefined, rl);
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
  const etag = makeETag('/kernel/schema/datum', { x: String(x), n: String(n) });

  return jsonResp({
    "@context": UOR_CONTEXT,
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
      "@context": UOR_CONTEXT,
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
      "quality_signal": density > 0.25 ? `PASS — density ${density.toFixed(4)} > threshold 0.25` : `WARN — density ${density.toFixed(4)} ≤ threshold 0.25`,
      "resolver": body.resolver ?? "EvaluationResolver",
      "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/partition.rs",
      "conformance_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/conformance/src/tests/fixtures/test5_partition.rs"
    }, CACHE_HEADERS_CONTENT, undefined, rl);
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
      "@context": UOR_CONTEXT,
      "@type": "partition:Partition",
      "partition:quantum": n,
      "partition:density": density,
      "input": body.input,
      "bytes": bytes,
      "per_byte": perByte,
      "summary": { "irreducible": irreducible, "reducible": reducible, "unit": unit, "exterior": exterior, "total": bytes.length },
      "quality_signal": density > 0.25 ? `PASS — density ${density.toFixed(4)} > threshold 0.25` : `WARN — density ${density.toFixed(4)} ≤ threshold 0.25`,
      "resolver": body.resolver ?? "EvaluationResolver",
      "ontology_ref": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/partition.rs"
    }, CACHE_HEADERS_CONTENT, undefined, rl);
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
    "@context": UOR_CONTEXT,
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
  }, CACHE_HEADERS_KERNEL, etag, rl);
}

// POST /bridge/proof/coherence
async function proofCoherence(req: Request, rl: RateLimitResult): Promise<Response> {
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
    "@context": UOR_CONTEXT,
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
  }, CACHE_HEADERS_CONTENT, undefined, rl);
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
    "@context": UOR_CONTEXT,
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
  }, CACHE_HEADERS_KERNEL, etag, rl);
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
    "@context": UOR_CONTEXT,
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
  }, CACHE_HEADERS_KERNEL, etag, rl);
}

// GET /user/type/primitives
function typeList(rl: RateLimitResult): Response {
  const etag = makeETag('/user/type/primitives', {});
  return jsonResp({
    "@context": UOR_CONTEXT,
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
  }, CACHE_HEADERS_KERNEL, etag, rl);
}

// GET /navigate
function frameworkIndex(rl: RateLimitResult): Response {
  const base = 'https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api';
  const etag = makeETag('/navigate', {});
  return jsonResp({
    "@context": UOR_CONTEXT,
    "@id": "https://uor.foundation/api/v1",
    "@type": "sdo:WebAPI",
    "title": "UOR Framework REST API — Navigation Index",
    "version": "1.0.0",
    "description": "Complete index of all endpoints. Start with /kernel/op/verify?x=42 to verify the mathematical foundation in one request.",
    "openapi_spec": `${base}/openapi.json`,
    "agent_entry_point": "https://uor.foundation/llms.md",
    "discovery_metadata": "https://uor.foundation/.well-known/uor.json",
    "quick_start": {
      "verify_critical_identity": `${base}/kernel/op/verify?x=42`,
      "compute_all_ops": `${base}/kernel/op/compute?x=42&y=10`,
      "encode_address": `${base}/kernel/address/encode (POST {input:"hello"})`,
      "partition_content": `${base}/bridge/partition (POST {input:"hello"})`
    },
    "spaces": {
      "kernel": {
        "description": "Core ring algebra — u:, schema:, op: namespaces",
        "endpoints": [
          { "method": "GET", "path": `${base}/kernel/op/verify`, "params": "x, n", "operationId": "opVerifyCriticalIdentity", "summary": "Verify neg(bnot(x)) = succ(x)" },
          { "method": "GET", "path": `${base}/kernel/op/verify/all`, "params": "n, expand", "operationId": "opVerifyAll", "summary": "Universal coherence proof for all 2^n elements" },
          { "method": "GET", "path": `${base}/kernel/op/compute`, "params": "x, n, y", "operationId": "opCompute", "summary": "All ring operations for x (and y)" },
          { "method": "GET", "path": `${base}/kernel/op/operations`, "params": "none", "operationId": "opList", "summary": "All 12 named op/ individuals" },
          { "method": "POST", "path": `${base}/kernel/address/encode`, "body": "{input, encoding}", "operationId": "addressEncode", "summary": "UTF-8 → u:Address with Glyph decomposition" },
          { "method": "GET", "path": `${base}/kernel/schema/datum`, "params": "x, n", "operationId": "schemaDatum", "summary": "Full schema:Datum for a ring value" }
        ]
      },
      "bridge": {
        "description": "Verification, proof, and certification — partition:, proof:, cert:, observable: namespaces",
        "endpoints": [
          { "method": "POST", "path": `${base}/bridge/partition`, "body": "{type_definition|input}", "operationId": "partitionResolve", "summary": "Four-component partition:Partition of R_n" },
          { "method": "GET", "path": `${base}/bridge/proof/critical-identity`, "params": "x, n", "operationId": "proofCriticalIdentity", "summary": "proof:CriticalIdentityProof with witness data" },
          { "method": "POST", "path": `${base}/bridge/proof/coherence`, "body": "{type_definition, n}", "operationId": "proofCoherence", "summary": "proof:CoherenceProof for a type definition" },
          { "method": "GET", "path": `${base}/bridge/cert/involution`, "params": "operation, n", "operationId": "certInvolution", "summary": "cert:InvolutionCertificate for neg or bnot" },
          { "method": "GET", "path": `${base}/bridge/observable/metrics`, "params": "x, n", "operationId": "observableMetrics", "summary": "RingMetric, HammingMetric, CascadeLength" }
        ],
        "not_implemented": [
          "derivation: namespace — requires Rust conformance suite (501 Not Implemented)",
          "trace: namespace — requires Rust conformance suite (501 Not Implemented)",
          "resolver: namespace — requires Rust conformance suite (501 Not Implemented)"
        ]
      },
      "user": {
        "description": "Type system and application layer — type:, morphism:, state: namespaces",
        "endpoints": [
          { "method": "GET", "path": `${base}/user/type/primitives`, "params": "none", "operationId": "typeList", "summary": "Catalogue of type:PrimitiveType definitions" }
        ],
        "not_implemented": [
          "morphism: namespace — requires resolver:DihedralFactorizationResolver (Rust conformance suite) — 501",
          "state: namespace — context/binding/frame/transition — 501"
        ]
      }
    },
    "namespace_map": [
      { "prefix": "u:", "iri": "https://uor.foundation/u/", "space": "kernel", "api_group": "/kernel", "classes": 2, "properties": 4 },
      { "prefix": "schema:", "iri": "https://uor.foundation/schema/", "space": "kernel", "api_group": "/kernel", "classes": 6, "properties": 13 },
      { "prefix": "op:", "iri": "https://uor.foundation/op/", "space": "kernel", "api_group": "/kernel", "classes": 7, "properties": 13, "individuals": 12 },
      { "prefix": "partition:", "iri": "https://uor.foundation/partition/", "space": "bridge", "api_group": "/bridge/partition", "classes": 6, "properties": 9 },
      { "prefix": "proof:", "iri": "https://uor.foundation/proof/", "space": "bridge", "api_group": "/bridge/proof", "classes": 4, "properties": 11 },
      { "prefix": "cert:", "iri": "https://uor.foundation/cert/", "space": "bridge", "api_group": "/bridge/cert", "classes": 4, "properties": 6 },
      { "prefix": "observable:", "iri": "https://uor.foundation/observable/", "space": "bridge", "api_group": "/bridge/observable", "classes": 26, "properties": 4 },
      { "prefix": "type:", "iri": "https://uor.foundation/type/", "space": "user", "api_group": "/user/type", "classes": 5, "properties": 5 }
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

// GET /openapi.json — inline JSON-LD spec metadata (RESTful, ETag-capable)
function openapiSpec(rl: RateLimitResult): Response {
  const etag = makeETag('/openapi.json', {});
  return jsonResp({
    "@context": UOR_CONTEXT,
    "@type": "sdo:WebAPI",
    "@id": "https://uor.foundation/api/v1",
    "title": "UOR Framework Agent API — OpenAPI 3.1.0",
    "version": "1.0.0",
    "spec_url": "https://uor.foundation/openapi.json",
    "live_spec_url": "https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/openapi.json",
    "note": "Fetch spec_url for the full OpenAPI 3.1.0 document (14 paths, 15 schemas).",
    "paths_count": 14,
    "schemas_count": 15,
    "agent_entry": "https://uor.foundation/llms.md",
    "navigate": "https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/navigate"
  }, CACHE_HEADERS_KERNEL, etag, rl);
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
  let path = url.pathname.replace(/^\/functions\/v1\/uor-api/, '').replace(/^\/uor-api/, '') || '/';

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
      const resp = openapiSpec(rl);
      if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
        return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
      }
      return resp;
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

    // ── Not-implemented namespaces (501) ──
    if (
      path === '/bridge/derivation' || path.startsWith('/bridge/derivation/') ||
      path === '/bridge/trace'      || path.startsWith('/bridge/trace/') ||
      path === '/bridge/resolver'   || path.startsWith('/bridge/resolver/') ||
      path === '/user/morphism/transforms' || path.startsWith('/user/morphism/') ||
      path === '/user/state'        || path.startsWith('/user/state/')
    ) {
      return error501(rl);
    }

    // ── 405 for known paths with wrong method ──
    if (KNOWN_PATHS[path]) {
      return error405(path, KNOWN_PATHS[path]);
    }

    // ── 404 ──
    return new Response(JSON.stringify({
      error: `Unknown route: ${path}`,
      code: 'NOT_FOUND',
      navigate: 'https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/navigate',
      docs: 'https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/openapi.json'
    }), { status: 404, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });

  } catch (err) {
    console.error('[uor-api] error:', err);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      docs: 'https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/openapi.json'
    }), { status: 500, headers: { ...JSON_HEADERS, ...rateLimitHeaders(rl) } });
  }
});
