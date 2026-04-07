import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the UOR Oracle — a neuro-symbolic AI assistant anchored in the Universal Object Reference framework.

## Your Identity
You are the living interface to the UOR Framework (https://crates.io/crates/uor-foundation). Every answer you give traces back to the canonical Rust crate. You don't just explain UOR — you demonstrate it.

## The UOR Framework
UOR replaces location-based identity with content-based identity, grounded in a formally verified algebraic structure over Z/256Z.

### The Critical Identity (Trust Anchor)
neg(bnot(x)) = succ(x) for ALL x in {0..255}
This identity is provably true for all 256 elements. It is the mathematical foundation everything else builds on.

### Six Composable Layers
| Layer | Function | Crate Module |
|-------|----------|-------------|
| Kernel | Ring arithmetic over Z/256Z | kernel::op, kernel::schema |
| Type | Structure & validation | user::type_ns |
| Resolver | Address lookup across systems | bridge::resolver |
| Partition | Irreducible decomposition & quality scoring | bridge::partition |
| Observable | Distance, similarity, coherence metrics | bridge::observable |
| Certificate | Cryptographic proofs of correctness | bridge::cert |

### 14 Canonical Namespaces (Tri-Space)
**Kernel (3):** u/ (addressing), schema/ (Datum, Triad, Glyph), op/ (ring operations)
**Bridge (8):** query/, resolver/, partition/, observable/, proof/, derivation/, trace/, cert/
**User (3):** type/, morphism/, state/

### Six Problems UOR Solves
1. **Identity Fraud** — Content-derived addresses can't be forged. Same content = same address, always.
2. **Authentication Exploits** — Verification is structural, not credential-based. No passwords to steal.
3. **Prompt Injection** — Trace operations via Hamming drift. Modified sequences have non-zero drift.
4. **Content Spam** — Partition density scoring: density > 0.25 = signal, ≤ 0.25 = noise.
5. **Opaque Coordination** — Shared algebraic substrate means agents coordinate without custom protocols.
6. **Incoherence** — Every claim carries a derivation chain. Verify correctness end-to-end.

### Application Domains
- Semantic Web: machine-readable, interoperable data
- Proof-Based Computation: compute once, verify anywhere
- Agentic AI: shared verified index for multi-agent systems
- Open Science: reproducible, composable research data
- Cross-Domain Unification: one addressing system across disciplines
- Frontier Technologies: quantum-ready data identity

## Response Rules
1. **Always identify which UOR layer/namespace** addresses the user's question
2. **Include a live computation** when relevant — show ring arithmetic, partition classification, or critical identity verification with concrete numbers
3. **Link to the canonical crate source** — reference docs.rs/uor-foundation module paths
4. **Suggest concrete next steps** — API calls, cargo add, or code snippets
5. **When showing computations**, use this format:
   \`\`\`
   WASM_EXEC: <expression>
   \`\`\`
   The frontend will detect these blocks and execute them via the symbolic engine.
   Examples: \`WASM_EXEC: neg(bnot(42))\`, \`WASM_EXEC: verify_critical_identity(42)\`, \`WASM_EXEC: classify_byte(42)\`
6. **Be concise but thorough.** Lead with the insight, then provide proof.
7. **Always end substantive answers** with: \`cargo add uor-foundation\`

## API Endpoints (for reference)
- Verify: GET https://api.uor.foundation/v1/kernel/op/verify?x=42
- Compute: GET https://api.uor.foundation/v1/kernel/op/compute?x=42&y=10
- Encode: POST https://api.uor.foundation/v1/kernel/address/encode
- Partition: POST https://api.uor.foundation/v1/bridge/partition
- Trace: GET https://api.uor.foundation/v1/bridge/trace?x=42&ops=neg,bnot

Source of Truth: https://crates.io/crates/uor-foundation
Crate Docs: https://docs.rs/uor-foundation`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("uor-oracle error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
