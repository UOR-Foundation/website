import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UOR = "https://api.uor.foundation/v1";

const UOR_PREFIXES = [
  ["schema", "https://uor.foundation/schema/"],
  ["op", "https://uor.foundation/op/"],
  ["proof", "https://uor.foundation/proof/"],
  ["cert", "https://uor.foundation/cert/"],
  ["partition", "https://uor.foundation/partition/"],
  ["morphism", "https://uor.foundation/morphism/"],
  ["observable", "https://uor.foundation/observable/"],
  ["derivation", "https://uor.foundation/derivation/"],
  ["resolver", "https://uor.foundation/resolver/"],
  ["trace", "https://uor.foundation/trace/"],
  ["query", "https://uor.foundation/query/"],
  ["type", "https://uor.foundation/type/"],
  ["u", "https://uor.foundation/u/"],
  ["state", "https://uor.foundation/state/"],
];

function jsonLdContext(): Record<string, string> {
  const ctx: Record<string, string> = {};
  for (const [p, uri] of UOR_PREFIXES) ctx[p] = uri;
  return ctx;
}

function turtlePrefixes(): string {
  return UOR_PREFIXES.map(([p, uri]) => `@prefix ${p}: <${uri}> .`).join("\n") + "\n";
}

const RESOLVER_COMPLEXITY: Record<string, string> = {
  DihedralFactorizationResolver: "sublinear",
  CanonicalFormResolver: "convergent",
  EvaluationResolver: "O(2ⁿ)",
};

interface SparqlReq {
  query: string;
  graph?: string;
  resolver?: string;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${UOR}${path}`, opts);
  if (!r.ok) { const t = await r.text(); throw new Error(`API ${r.status}: ${t}`); }
  return r.json();
}

function detectQueryType(q: string): string {
  const ql = q.toLowerCase().trim();
  if (ql.startsWith("ask")) return "ask";
  if (/schema:stratum\s+\d+/i.test(q) || /fiber|f_?\d/i.test(q)) return "fiber";
  if (/resolver:canonicalform/i.test(q) || /canonical/i.test(q)) return "representation";
  if (/schema:stratum/i.test(q) || /metric/i.test(q)) return "metric";
  return "coordinate";
}

function extractLimit(q: string): number {
  const m = q.match(/limit\s+(\d+)/i);
  return m ? Math.min(parseInt(m[1]), 256) : 16;
}

function extractGraph(q: string, defaultGraph?: string): string {
  const m = q.match(/graph\s+(partition:\w+)/i);
  return m ? m[1] : (defaultGraph || "partition:IrreducibleSet");
}

function extractStratumK(q: string): number {
  const m = q.match(/schema:stratum\s+(\d+)/i);
  return m ? parseInt(m[1]) : 4;
}

function C(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
  return Math.round(r);
}

function toSparqlJson(vars: string[], rows: Record<string, any>[]): any {
  return {
    head: { vars },
    results: {
      bindings: rows.map(r => {
        const b: any = {};
        for (const v of vars) {
          if (r[v] !== undefined) b[v] = { type: "literal", value: String(r[v]) };
        }
        return b;
      }),
    },
  };
}

function toJsonLd(rows: Record<string, any>[]): any {
  return { "@context": jsonLdContext(), "@graph": rows };
}

function toTurtle(rows: Record<string, any>[]): string {
  let ttl = turtlePrefixes() + "\n";
  for (const r of rows) {
    const subj = r["@id"] || r.x || r.iri || `u:val_${r.value ?? "unknown"}`;
    ttl += `${subj}\n`;
    for (const [k, v] of Object.entries(r)) {
      if (k === "@id" || k === "x") continue;
      ttl += `  ${k} "${v}" ;\n`;
    }
    ttl = ttl.replace(/;\n$/, ".\n\n");
  }
  return ttl;
}

async function handleCoordinate(query: string, graph: string): Promise<{ vars: string[]; rows: any[] }> {
  const limit = extractLimit(query);
  const g = extractGraph(query, graph);
  const data = await apiFetch(`/bridge/graph/query?graph=${encodeURIComponent(g)}&n=8&limit=${limit}`);
  const elements = data?.elements || data?.["@graph"] || data?.results || [];
  const rows = Array.isArray(elements) ? elements.slice(0, limit) : [];
  return { vars: ["x", "value", "stratum", "partition"], rows };
}

async function handleAsk(): Promise<{ boolean: boolean }> {
  const data = await apiFetch("/kernel/op/verify/all?n=8");
  const holds = data?.summary?.holds_universally ?? data?.holds_universally ?? true;
  return { boolean: holds };
}

async function handleMetric(query: string): Promise<{ vars: string[]; rows: any[] }> {
  const limit = extractLimit(query);
  const data = await apiFetch(`/bridge/emit?n=8&limit=${limit}`);
  const elements = data?.["@graph"] || data?.elements || data?.results || [];
  const rows = (Array.isArray(elements) ? elements : []).slice(0, limit).map((e: any) => ({
    x: e?.["@id"] || e?.iri || String(e?.value ?? ""),
    value: e?.value ?? e?.["schema:value"] ?? "",
    stratum: e?.stratum ?? e?.["schema:stratum"] ?? e?.total_stratum ?? "",
    spectrum: e?.spectrum ?? e?.["schema:spectrum"] ?? "",
  }));
  return { vars: ["x", "value", "stratum", "spectrum"], rows };
}

async function handleRepresentation(query: string): Promise<{ vars: string[]; rows: any[] }> {
  const limit = Math.min(extractLimit(query), 32);
  const rows: any[] = [];
  for (let x = 0; x < limit; x++) {
    try {
      const d = await apiFetch(`/bridge/resolver?x=${x}`);
      rows.push({
        x: String(x),
        canonical: d?.canonical_form ?? d?.["resolver:canonicalForm"] ?? String(x),
        resolver: d?.resolver ?? d?.["@type"] ?? "",
      });
    } catch { rows.push({ x: String(x), canonical: String(x), resolver: "error" }); }
  }
  return { vars: ["x", "canonical", "resolver"], rows };
}

async function handleFiber(query: string): Promise<{ vars: string[]; rows: any[]; fiberSize: number; k: number }> {
  const k = extractStratumK(query);
  const expected = C(8, k);
  // Generate all values with popcount = k
  const rows: any[] = [];
  for (let x = 0; x < 256; x++) {
    let pc = 0;
    for (let b = 0; b < 8; b++) if ((x >> b) & 1) pc++;
    if (pc === k) rows.push({ x: String(x), value: x, stratum: k, binary: x.toString(2).padStart(8, "0") });
  }
  return { vars: ["x", "value", "stratum", "binary"], rows, fiberSize: expected, k };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: SparqlReq = await req.json();
    if (!body.query) {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accept = req.headers.get("accept") || "application/sparql-results+json";
    const resolverName = body.resolver || "CanonicalFormResolver";
    const qtype = detectQueryType(body.query);
    const meta = {
      queryType: qtype,
      resolver: resolverName,
      complexity: RESOLVER_COMPLEXITY[resolverName] || "unknown",
      quantum: "Q0",
      bitWidth: 8,
    };

    let responseBody: any;
    let contentType: string;

    if (qtype === "ask") {
      const result = await handleAsk();
      if (accept.includes("turtle") || accept.includes("text/turtle")) {
        responseBody = turtlePrefixes() + `\nproof:criticalIdentity proof:holds "${result.boolean}" .\n`;
        contentType = "text/turtle";
      } else {
        responseBody = JSON.stringify({ ...result, _meta: meta });
        contentType = "application/sparql-results+json";
      }
    } else {
      let vars: string[];
      let rows: any[];
      let extra: any = {};

      switch (qtype) {
        case "fiber": {
          const f = await handleFiber(body.query);
          vars = f.vars; rows = f.rows;
          extra = { fiberSize: f.fiberSize, stratum: f.k, expected: `C(8,${f.k})=${f.fiberSize}`, actual: f.rows.length };
          break;
        }
        case "representation": {
          const r = await handleRepresentation(body.query);
          vars = r.vars; rows = r.rows;
          break;
        }
        case "metric": {
          const r = await handleMetric(body.query);
          vars = r.vars; rows = r.rows;
          break;
        }
        default: {
          const r = await handleCoordinate(body.query, body.graph || "");
          vars = r.vars; rows = r.rows;
          break;
        }
      }

      if (accept.includes("ld+json") || accept.includes("application/ld+json")) {
        responseBody = JSON.stringify({ ...toJsonLd(rows), _meta: { ...meta, ...extra } });
        contentType = "application/ld+json";
      } else if (accept.includes("turtle") || accept.includes("text/turtle")) {
        responseBody = toTurtle(rows) + `\n# _meta: resolver=${resolverName} complexity=${meta.complexity}\n`;
        contentType = "text/turtle";
      } else {
        responseBody = JSON.stringify({ ...toSparqlJson(vars, rows), _meta: { ...meta, ...extra } });
        contentType = "application/sparql-results+json";
      }
    }

    return new Response(responseBody, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": contentType },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
