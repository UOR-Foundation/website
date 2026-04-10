/**
 * UOR Query Edge Function — /uns/tools/query
 *
 * POST /uns/tools/query    — {intent?, sparql?, graph_uri?} → QueryResult | SparqlResult
 * GET  /uns/tools/query/intent?text={encoded} → QueryIntent (no resolution)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ── Inlined ring primitives (no bundler in edge functions) ──────────────────

const mod256 = (x: number) => ((x % 256) + 256) % 256;

function classifyByteQ0(b: number): string {
  b = b & 0xff;
  if (b === 0 || b === 128) return "EXTERIOR";
  if (b === 1 || b === 255) return "UNIT";
  if (b % 2 === 1) return "IRREDUCIBLE";
  return "REDUCIBLE";
}

function popcount(x: number): number {
  let c = 0, v = x >>> 0;
  while (v) { v &= v - 1; c++; }
  return c;
}

function deterministicHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = ((h1 ^ c) * 0x01000193) >>> 0;
    h2 = ((h2 ^ (c * 7)) * 0x811c9dc5) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

function buildIntent(text: string) {
  const bytes = Array.from(new TextEncoder().encode(text));
  let irreducible = 0;
  for (const b of bytes) if (classifyByteQ0(b) === "IRREDUCIBLE") irreducible++;
  const total = bytes.length;
  const hash = deterministicHash(text);
  return {
    "@type": "query:Intent",
    "query:text": text,
    "query:bytes": bytes,
    "query:partition": { density: total > 0 ? irreducible / total : 0, action: "PASS", irreducible, total },
    "query:canonicalId": `urn:uor:query:intent:${hash}`,
    "query:semanticWeight": total > 0 ? irreducible / total : 0,
  };
}

function resolve(intent: ReturnType<typeof buildIntent>) {
  const hash = intent["query:canonicalId"].split(":").pop() ?? "";
  const intentByte = parseInt(hash.slice(0, 2), 16) || 0;

  const matches: unknown[] = [];

  // Exact match
  matches.push({
    "@type": "query:Match",
    "query:object": `https://uor.foundation/datum/q0/${intentByte}`,
    "query:score": 1.0,
    "query:hammingDist": 0,
    "query:graphUri": "https://uor.foundation/graph/q0",
    epistemic_grade: "A",
    "derivation:derivationId": `urn:uor:derivation:query:exact:${hash}`,
  });

  // Proximity matches
  for (let n = 0; n < 256; n++) {
    if (n === intentByte) continue;
    const dist = popcount((n ^ intentByte) >>> 0);
    if (dist <= 3) {
      matches.push({
        "@type": "query:Match",
        "query:object": `https://uor.foundation/datum/q0/${n}`,
        "query:score": 1 - dist / 8,
        "query:hammingDist": dist,
        "query:graphUri": "https://uor.foundation/graph/q0",
        epistemic_grade: "C",
        "derivation:derivationId": `urn:uor:derivation:query:proximity:${n}`,
      });
    }
  }

  return {
    "@type": "query:Resolution",
    "query:intent": intent,
    "query:matches": matches,
    "query:strategy": "DihedralFactorizationResolver",
    totalMatches: matches.length,
    epistemic_grade: "A",
    "derivation:derivationId": `urn:uor:derivation:query:resolution:${hash}`,
  };
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "content-type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/uns-query\/?/, "/");

  try {
    // GET /intent?text=
    if (path === "/intent" && req.method === "GET") {
      const text = url.searchParams.get("text") ?? "";
      return new Response(JSON.stringify(buildIntent(text)), { headers: CORS });
    }

    // POST / — main query endpoint
    if (req.method === "POST") {
      const body = await req.json();
      const result: Record<string, unknown> = {};

      if (body.intent) {
        const intent = buildIntent(body.intent);
        result.intentResult = resolve(intent);
        result.queryIntent = intent;
      }

      if (body.sparql) {
        const hash = deterministicHash((body.sparql ?? "") + (body.graph_uri ?? ""));
        result.sparqlResult = {
          "@type": "query:SparqlResult",
          "@graph": [],
          epistemic_grade: "B",
          "derivation:derivationId": `urn:uor:derivation:query:sparql:${hash}`,
          note: "SPARQL execution requires in-memory graph — use client-side UnsQuery for full results",
        };
      }

      return new Response(JSON.stringify(result), { headers: CORS });
    }

    return new Response(JSON.stringify({
      error: "Not found",
      endpoints: [
        "POST / {intent?, sparql?, graph_uri?}",
        "GET /intent?text=",
      ],
    }), { status: 404, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
