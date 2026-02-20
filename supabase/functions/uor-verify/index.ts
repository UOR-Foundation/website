const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// UOR Ring R_8 = Z/256Z core operations
function neg(x: number): number { return ((-x) % 256 + 256) % 256; }
function bnot(x: number): number { return x ^ 0xFF; }
function succ(x: number): number { return (x + 1) % 256; }
function encodeGlyph(v: number): string { return String.fromCodePoint(0x2800 + (v & 0x3F)); }
function address(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => encodeGlyph(b)).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const xParam = url.searchParams.get('x');
  const contentParam = url.searchParams.get('content');

  try {
    // Endpoint A: algebraic verification ?x=<0-255>
    if (xParam !== null) {
      const x = parseInt(xParam, 10);
      if (isNaN(x) || x < 0 || x > 255) {
        return new Response(
          JSON.stringify({ error: 'x must be an integer in range [0, 255]' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const bnot_x = bnot(x);
      const neg_bnot_x = neg(bnot_x);
      const succ_x = succ(x);
      const holds = neg_bnot_x === succ_x;
      return new Response(
        JSON.stringify({ x, bnot_x, neg_bnot_x, succ_x, holds }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Endpoint B: simplified content addressing ?content=<string>
    if (contentParam !== null) {
      // F9 — payload size cap to prevent DoS against edge function quota
      if (contentParam.length > 1000) {
        return new Response(
          JSON.stringify({ error: 'content must be 1000 characters or fewer' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const encoder = new TextEncoder();
      const bytes = encoder.encode(contentParam);
      const byteArray = Array.from(bytes);
      const address_simplified = address(bytes);
      return new Response(
        JSON.stringify({
          input: contentParam,
          bytes: byteArray,
          address_simplified,
          encoding: 'simplified 6-bit (b & 0x3F)',
          note: 'Simplified encoding only. Canonical address requires resolver:DihedralFactorizationResolver (cargo run --bin uor-conformance).',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No recognized params — return usage info
    return new Response(
      JSON.stringify({
        name: 'UOR Verify Endpoint',
        usage: {
          algebraic: 'GET ?x=<0-255> — verifies neg(bnot(x)) = succ(x)',
          address: 'GET ?content=<string> — returns simplified content address',
        },
        example_x: 'GET ?x=42 → {"x":42,"bnot_x":213,"neg_bnot_x":43,"succ_x":43,"holds":true}',
        example_content: 'GET ?content=hello → {"input":"hello","address_simplified":"⠓⠑⠇⠇⠕",...}',
        docs: 'https://uor.foundation/llms.md',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
