import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UOR_API = "https://api.uor.foundation/v1";

interface TestPair { a: number; b: number }
interface TransformReq {
  transform: { source: number; target: number; label?: string };
  metric: "ring" | "hamming";
  test_pairs: TestPair[];
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/ld+json" },
  });
}

async function fetchMetric(a: number, b: number, type: string): Promise<number | null> {
  try {
    const r = await fetch(`${UOR_API}/bridge/observable/metric?a=${a}&b=${b}&type=${type}`);
    if (!r.ok) { await r.text(); return null; }
    const d = await r.json();
    return d?.distance ?? d?.metric ?? d?.value ?? null;
  } catch { return null; }
}

async function fetchPartitionClass(value: number): Promise<string> {
  try {
    const r = await fetch(`${UOR_API}/bridge/partition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type_definition: { "@type": "type:PrimitiveType", "type:bitWidth": 8 } }),
    });
    if (!r.ok) { await r.text(); return "unknown"; }
    const d = await r.json();
    // Find which partition class contains our value
    const partitions = d?.partition || d;
    for (const [cls, data] of Object.entries(partitions as Record<string, any>)) {
      const elements: number[] = data?.elements || data?.values || [];
      if (elements.includes(value)) {
        if (cls.includes("rreducible") || cls === "Irr") return "partition:IrreducibleSet";
        if (cls.includes("educible") || cls === "Red") return "partition:ReducibleSet";
        if (cls.includes("nit") || cls === "Unit") return "partition:UnitSet";
        if (cls.includes("xterior") || cls === "Ext") return "partition:ExteriorSet";
        return cls;
      }
    }
    // Fallback: classify by simple heuristic at Q0
    if (value === 0) return "partition:ExteriorSet";
    if (value === 1 || value === 255) return "partition:UnitSet";
    // Check if prime-ish (irreducible in Z/256Z means not factorable as product of non-units)
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    if (gcd(value, 256) === 1) return "partition:UnitSet"; // coprime to 256 = unit
    if (value % 2 === 0 && value % 4 !== 0) return "partition:IrreducibleSet";
    return "partition:ReducibleSet";
  } catch {
    return "unknown";
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "Method not allowed" }, 405);

  try {
    const body: TransformReq = await req.json();
    const { transform, metric, test_pairs } = body;

    if (!transform || typeof transform.source !== "number" || typeof transform.target !== "number") {
      return jsonRes({ error: "transform.source and transform.target required (0-255)" }, 400);
    }
    if (metric !== "ring" && metric !== "hamming") {
      return jsonRes({ error: 'metric must be "ring" or "hamming"' }, 400);
    }
    if (!test_pairs || test_pairs.length < 3 || test_pairs.length > 16) {
      return jsonRes({ error: "test_pairs: 3–16 pairs required" }, 400);
    }

    // Check partition classes
    const [srcClass, tgtClass] = await Promise.all([
      fetchPartitionClass(transform.source),
      fetchPartitionClass(transform.target),
    ]);

    if (srcClass === tgtClass && srcClass !== "unknown") {
      return jsonRes({
        "@context": { cert: "https://uor.foundation/cert/", morphism: "https://uor.foundation/morphism/" },
        error: "BLOCKED",
        reason: "Same partition class — trivial identity, not a genuine isometry. Cross-class transform required.",
        "morphism:sourcePartitionClass": srcClass,
        "morphism:targetPartitionClass": tgtClass,
      }, 409);
    }

    // Compute cyclic shift: T(x) = (target - source + x) mod 256
    const shift = ((transform.target - transform.source) % 256 + 256) % 256;
    const applyT = (x: number) => (x + shift) % 256;

    // Test metric preservation for all pairs
    const results: { a: number; b: number; d_original: number | null; d_transformed: number | null; preserved: boolean }[] = [];
    let allPreserved = true;

    for (const pair of test_pairs) {
      const [dOrig, dTrans] = await Promise.all([
        fetchMetric(pair.a, pair.b, metric),
        fetchMetric(applyT(pair.a), applyT(pair.b), metric),
      ]);

      const preserved = dOrig !== null && dTrans !== null && dOrig === dTrans;
      if (!preserved) allPreserved = false;

      results.push({
        a: pair.a, b: pair.b,
        d_original: dOrig, d_transformed: dTrans,
        preserved,
      });
    }

    if (!allPreserved) {
      const failCount = results.filter(r => !r.preserved).length;
      return jsonRes({
        "@context": { cert: "https://uor.foundation/cert/", morphism: "https://uor.foundation/morphism/", observable: "https://uor.foundation/observable/" },
        error: "NOT_ISOMETRY",
        reason: `Metric not preserved for ${failCount} of ${test_pairs.length} pairs`,
        "morphism:preservesMetric": metric,
        "cert:pairResults": results,
      }, 422);
    }

    // Issue certificate
    const id = crypto.randomUUID();
    return jsonRes({
      "@context": {
        cert: "https://uor.foundation/cert/",
        morphism: "https://uor.foundation/morphism/",
        observable: "https://uor.foundation/observable/",
      },
      "@id": `https://uor.foundation/cert/isometry/${id}`,
      "@type": "cert:IsometryCertificate",
      "cert:verified": true,
      "cert:method": "metric-preservation-test",
      "cert:quantum": 0,
      "cert:issuedAt": new Date().toISOString(),
      "morphism:preservesMetric": metric,
      "morphism:sourcePartitionClass": srcClass,
      "morphism:targetPartitionClass": tgtClass,
      "morphism:transform": {
        source: transform.source,
        target: transform.target,
        shift,
        label: transform.label || `T(x) = (x + ${shift}) mod 256`,
      },
      "cert:pairsVerified": test_pairs.length,
      "cert:allPairsPreserved": true,
      "cert:pairResults": results,
    });
  } catch (e) {
    return jsonRes({ error: "Invalid request", details: String(e) }, 400);
  }
});
