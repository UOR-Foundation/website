/**
 * UOR Observable Edge Function — /uns/observable/*
 *
 * Implements 7 HTTP endpoints for the observable: namespace geometry layer.
 *
 * GET  /uns/observable/metric?x={n}&y={m}   → { ringMetric, hammingMetric }
 * GET  /uns/observable/stratum?x={n}        → { stratum, partitionClass, curvatureK }
 * GET  /uns/observable/curvature?x={n}      → ObservableResult<number>
 * POST /uns/observable/path                 → body: {start,ops[]} → observablePath()
 * POST /uns/observable/holonomy             → body: {x,ops[]}    → holonomy()
 * POST /uns/observable/stream               → SSE stream (not implemented in edge fn)
 * GET  /uns/observable/catastrophe           → CATASTROPHE_THRESHOLD constant
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ── Ring operations (inlined for edge function — no bundler) ────────────────

const mod = (x: number, m: number) => ((x % m) + m) % m;
const neg = (x: number) => mod(-x, 256);
const bnot = (x: number) => x ^ 0xff;
const succ = (x: number) => mod(x + 1, 256);
const pred = (x: number) => mod(x - 1, 256);

type RingOp = "neg" | "bnot" | "succ" | "pred";

function applyOp(op: RingOp, x: number): number {
  switch (op) {
    case "neg": return neg(x);
    case "bnot": return bnot(x);
    case "succ": return succ(x);
    case "pred": return pred(x);
  }
}

// Partition classification
type PartComp = "partition:ExteriorSet" | "partition:UnitSet" | "partition:IrreducibleSet" | "partition:ReducibleSet";
function classify(b: number): PartComp {
  b = b & 0xff;
  if (b === 0 || b === 128) return "partition:ExteriorSet";
  if (b === 1 || b === 255) return "partition:UnitSet";
  if (b % 2 === 1) return "partition:IrreducibleSet";
  return "partition:ReducibleSet";
}

function classOrdinal(x: number): number {
  switch (classify(x)) {
    case "partition:ExteriorSet": return 0;
    case "partition:UnitSet": return 1;
    case "partition:ReducibleSet": return 1;
    case "partition:IrreducibleSet": return 2;
  }
}

function popcount(x: number): number {
  let c = 0, v = x >>> 0;
  while (v) { v &= v - 1; c++; }
  return c;
}

// Stratum
function bytePopcount(b: number): number {
  let c = 0;
  for (let i = 0; i < 8; i++) if (b & (1 << i)) c++;
  return c;
}

// Constants
const CATASTROPHE_THRESHOLD = 4 / 256; // 0.015625

function gradeA(type: string, value: unknown, seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return {
    "@type": `observable:${type}`,
    value,
    epistemic_grade: "A",
    "derivation:derivationId": `urn:uor:derivation:observable:${type.toLowerCase()}:${hex}`,
    ring: "Z/256Z",
    quantum: 8,
  };
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "content-type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/uns-observable\/?/, "/");

  try {
    // GET /metric?x=&y=
    if (path === "/metric" && req.method === "GET") {
      const x = parseInt(url.searchParams.get("x") ?? "0") & 0xff;
      const y = parseInt(url.searchParams.get("y") ?? "0") & 0xff;
      const fwd = mod(y - x, 256), bwd = mod(x - y, 256);
      return new Response(JSON.stringify({
        ringMetric: gradeA("RingMetric", Math.min(fwd, bwd), `ring:${x}:${y}`),
        hammingMetric: gradeA("HammingMetric", popcount((x ^ y) >>> 0), `hamming:${x}:${y}`),
      }), { headers: CORS });
    }

    // GET /stratum?x=
    if (path === "/stratum" && req.method === "GET") {
      const x = parseInt(url.searchParams.get("x") ?? "0") & 0xff;
      const K = classOrdinal(succ(x)) - 2 * classOrdinal(x) + classOrdinal(pred(x));
      return new Response(JSON.stringify({
        "schema:stratum": bytePopcount(x),
        partitionClass: classify(x),
        curvatureK: K,
      }), { headers: CORS });
    }

    // GET /curvature?x=
    if (path === "/curvature" && req.method === "GET") {
      const x = parseInt(url.searchParams.get("x") ?? "0") & 0xff;
      const K = classOrdinal(succ(x)) - 2 * classOrdinal(x) + classOrdinal(pred(x));
      return new Response(JSON.stringify(gradeA("Curvature", K, `curvature:${x}`)), { headers: CORS });
    }

    // POST /path — body: { start, ops }
    if (path === "/path" && req.method === "POST") {
      const body = await req.json();
      const start = (body.start ?? 0) & 0xff;
      const ops: RingOp[] = body.ops ?? [];
      let current = start;
      const steps = ops.map((op: RingOp, i: number) => {
        const prev = current;
        current = applyOp(op, current);
        const K = classOrdinal(succ(current)) - 2 * classOrdinal(current) + classOrdinal(pred(current));
        return {
          step: i, value: current, operation: op,
          partitionClass: classify(current),
          curvatureK: K,
          hammingFromPrev: popcount((current ^ prev) >>> 0),
        };
      });
      return new Response(JSON.stringify(gradeA("ObservablePath", steps, `path:${start}:${ops.join(",")}`)), { headers: CORS });
    }

    // POST /holonomy — body: { x, ops }
    if (path === "/holonomy" && req.method === "POST") {
      const body = await req.json();
      const x = (body.x ?? 0) & 0xff;
      const ops: RingOp[] = body.ops ?? [];
      let current = x;
      for (const op of ops) current = applyOp(op, current);
      const phase = mod(current - x, 256);
      return new Response(JSON.stringify(gradeA("Holonomy", {
        startValue: x, endValue: current,
        isClosed: current === x, holonomyPhase: phase,
        pathLength: ops.length,
      }, `holonomy:${x}:${ops.join(",")}`)), { headers: CORS });
    }

    // GET /catastrophe
    if (path === "/catastrophe" && req.method === "GET") {
      return new Response(JSON.stringify({
        "@type": "observable:CatastropheThreshold",
        value: CATASTROPHE_THRESHOLD,
        epistemic_grade: "A",
        "derivation:derivationId": "urn:uor:derivation:observable:catastrophe:ring-derived:4-over-256",
        ring: "Z/256Z",
        quantum: 8,
        derivation: {
          unitSetCardinality: 2,
          exteriorSetCardinality: 2,
          totalElements: 256,
          formula: "(UnitSet + ExteriorSet) / 256 = 4/256 = 0.015625",
        },
      }), { headers: CORS });
    }

    return new Response(JSON.stringify({
      error: "Not found",
      endpoints: [
        "GET /metric?x=&y=",
        "GET /stratum?x=",
        "GET /curvature?x=",
        "POST /path {start, ops}",
        "POST /holonomy {x, ops}",
        "GET /catastrophe",
      ],
    }), { status: 404, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
