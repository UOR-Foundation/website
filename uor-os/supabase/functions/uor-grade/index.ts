import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UOR_API = "https://api.uor.foundation/v1";

const DERIVATION_RE = /^urn:uor:derivation:sha256:[a-f0-9]{64}$/;
const URL_RE = /^https:\/\/.+/;

interface AssessRequest {
  claim: string;
  evidence_type: "algebraic" | "isometric" | "empirical" | "none";
  evidence?: {
    derivation_id?: string;
    operation?: string;
    source_url?: string;
    coherence_score?: number;
  };
}

interface GradeResult {
  grade: "A" | "B" | "C" | "D";
  label: string;
  certType: string;
  certClass: string;
  trust: number;
  verified: boolean;
  whitepaper: boolean;
}

async function verifyInvolution(operation: string): Promise<boolean> {
  try {
    const r = await fetch(`${UOR_API}/bridge/cert/involution?operation=${encodeURIComponent(operation)}`);
    if (!r.ok) return false;
    const data = await r.json();
    return data?.["cert:verified"] === true || data?.verified === true;
  } catch {
    return false;
  }
}

function assessGrade(req: AssessRequest): GradeResult {
  const ev = req.evidence || {};

  // Grade A
  if (req.evidence_type === "algebraic" && ev.derivation_id && DERIVATION_RE.test(ev.derivation_id)) {
    return {
      grade: "A",
      label: "Algebraically Derived",
      certType: "whitepaper-defined",
      certClass: "cert:TransformCertificate",
      trust: 1.0,
      verified: true,
      whitepaper: true,
    };
  }

  // Grade C
  if (req.evidence_type === "empirical" && ev.source_url && URL_RE.test(ev.source_url)) {
    return {
      grade: "C",
      label: "Empirically Attested",
      certType: "extended",
      certClass: "cert:EmpiricalAttestation",
      trust: 0.5,
      verified: true,
      whitepaper: false,
    };
  }

  // Grade D
  return {
    grade: "D",
    label: "Unverified",
    certType: "extended",
    certClass: "cert:UnverifiedAssertion",
    trust: 0.1,
    verified: false,
    whitepaper: false,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: AssessRequest = await req.json();

    if (!body.claim || !body.evidence_type) {
      return new Response(
        JSON.stringify({ error: "claim and evidence_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/ld+json" } }
      );
    }

    let result: GradeResult;

    // Grade B needs async involution check
    if (body.evidence_type === "isometric") {
      const ev = body.evidence || {};
      const op = ev.operation || "neg";
      const involutionOk = await verifyInvolution(op);
      const coherenceOk = typeof ev.coherence_score === "number" && ev.coherence_score >= 0.7;

      if (involutionOk || coherenceOk) {
        result = {
          grade: "B",
          label: "Metric-Preserving",
          certType: "whitepaper-defined",
          certClass: "cert:IsometryCertificate",
          trust: 0.75,
          verified: true,
          whitepaper: true,
        };
      } else {
        result = assessGrade({ ...body, evidence_type: "none" });
      }
    } else {
      result = assessGrade(body);
    }

    const id = crypto.randomUUID();

    const response = {
      "@context": {
        cert: "https://uor.foundation/cert/",
        proof: "https://uor.foundation/proof/",
      },
      "@id": `https://uor.foundation/grade/${id}`,
      "@type": result.certClass,
      "cert:grade": result.grade,
      "cert:gradeLabel": result.label,
      "cert:certType": result.certType,
      "cert:claim": body.claim,
      "cert:trustLevel": result.trust,
      "cert:verified": result.verified,
      "cert:issuedAt": new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/ld+json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Invalid request body", details: String(e) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
