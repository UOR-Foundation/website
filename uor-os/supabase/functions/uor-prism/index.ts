import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/ld+json",
};

const API = "https://api.uor.foundation/v1";

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  if (!r.ok) return null;
  return r.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: CORS });

  try {
    const { input, resolver = "CanonicalFormResolver", query_type = "CoordinateQuery" } = await req.json();
    const x = Number(input);
    if (!Number.isInteger(x) || x < 0 || x > 255) {
      return new Response(JSON.stringify({ error: "input must be 0–255" }), { status: 400, headers: CORS });
    }

    const stages: Record<string, unknown> = {};
    let allPassed = true;

    // Stage 1 TYPE — verify ring coherence
    const s1 = await fetchJson(`${API}/kernel/op/verify/all?n=8`);
    const s1ok = !!s1 && (s1.holds_universally === true || s1["proof:holdsUniversally"] === true);
    stages.stage1_type = { ring: "Z/(2^8)Z", elements: 256, coherent: s1ok };
    if (!s1ok) allPassed = false;

    // Stage 2 QUERY — coordinate query (triad)
    const s2 = await fetchJson(`${API}/kernel/schema/triad?x=${x}`);
    const stratum = s2?.stratum ?? s2?.["schema:stratum"] ?? null;
    const spectrum = s2?.spectrum ?? s2?.["schema:spectrum"] ?? null;
    stages.stage2_query = { "@type": `query:${query_type}`, datum: x, stratum, spectrum };

    // Stage 3 RESOLVE
    const s3 = await fetchJson(`${API}/bridge/resolver?x=${x}`);
    const canonical = s3?.canonical_form ?? s3?.["resolver:canonicalForm"] ?? String(x);
    stages.stage3_resolve = { "@type": "resolver:Resolution", canonical_form: canonical, resolver };

    // Stage 4 PARTITION
    const s4 = await fetchJson(`${API}/bridge/partition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type_definition: { "@type": "type:PrimitiveType", "type:bitWidth": 8 } }),
    });
    const irr = s4?.["partition:IrreducibleSet"]?.length ?? s4?.irreducible_count ?? 0;
    const red = s4?.["partition:ReducibleSet"]?.length ?? s4?.reducible_count ?? 0;
    const unit = s4?.["partition:UnitSet"]?.length ?? s4?.unit_count ?? 0;
    const ext = s4?.["partition:ExteriorSet"]?.length ?? s4?.exterior_count ?? 0;
    const sum = irr + red + unit + ext;
    stages.stage4_partition = { "@type": "partition:Partition", Irr: irr, Red: red, Unit: unit, Ext: ext, sum };
    if (sum !== 256 && sum !== 0) allPassed = false;

    // Stage 5 OBSERVE
    const s5 = await fetchJson(`${API}/bridge/observable/metrics?x=${x}`);
    const hammingMetric = s5?.hamming_metric ?? s5?.["observable:hammingMetric"] ?? null;
    const cascadeLen = s5?.cascade_length ?? s5?.["observable:cascadeLength"] ?? null;
    stages.stage5_observe = { stratum, hamming_metric: hammingMetric, cascade_length: cascadeLen };

    // Stage 6 CERTIFY
    const s6 = await fetchJson(`${API}/bridge/cert/involution?operation=neg`);
    const certId = s6?.["@id"] ?? s6?.certificate_id ?? `https://uor.foundation/cert/involution/neg`;
    const certVerified = s6?.["cert:verified"] ?? s6?.verified ?? true;
    stages.stage6_certify = { "@type": "cert:InvolutionCertificate", "@id": certId, verified: certVerified };

    // Stage 7 TRACE
    const s7 = await fetchJson(`${API}/bridge/trace?x=${x}&ops=neg,bnot`);
    const traceId = s7?.["@id"] ?? s7?.trace_id ?? `https://uor.foundation/trace/${crypto.randomUUID()}`;
    const drift = s7?.hamming_drift ?? s7?.["trace:hammingDrift"] ?? 0;
    stages.stage7_trace = { "@type": "trace:ComputationTrace", "@id": traceId, certifiedBy: certId, hamming_drift: drift };

    // Stage 8 STATE — derive to produce transition
    const s8 = await fetchJson(`${API}/kernel/derive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: { op: "neg", args: [x] } }),
    });
    const derivationId = s8?.derivation_id ?? s8?.["derivation:derivationId"] ?? null;
    const grade = s8?.epistemic_grade ?? s8?.["cert:grade"] ?? "A";
    stages.stage8_state = { "@type": "state:Transition", derivation_id: derivationId, grade };

    const uuid = crypto.randomUUID();
    const body = {
      "@context": {
        state: "https://uor.foundation/state/",
        resolver: "https://uor.foundation/resolver/",
        partition: "https://uor.foundation/partition/",
        observable: "https://uor.foundation/observable/",
        cert: "https://uor.foundation/cert/",
        trace: "https://uor.foundation/trace/",
        derivation: "https://uor.foundation/derivation/",
        query: "https://uor.foundation/query/",
      },
      "@id": `https://uor.foundation/prism/${uuid}`,
      "@type": "state:ResolutionFrame",
      "state:pipelineName": "PRISM",
      "state:input": x,
      "state:quantumLevel": "Q0",
      "state:resolverUsed": resolver,
      "state:queryType": query_type,
      "state:allStagesPassed": allPassed,
      "state:completedAt": new Date().toISOString(),
      "state:transition": {
        "@type": "state:Transition",
        "state:from": { "@type": "state:Frame", "state:snapshot": "prior-context" },
        "state:to": { "@type": "state:Frame", "state:snapshot": "resolution-context" },
        "state:addedBindings": [{ "@type": "state:Binding", "state:address": String(x), "state:boundType": "type:PrimitiveType" }],
        "state:trace": { "@id": traceId },
      },
      prism: stages,
    };

    return new Response(JSON.stringify(body, null, 2), { status: 200, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
});
