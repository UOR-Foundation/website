import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      return json({ error: "Unauthorized: invalid token" }, 401);
    }

    const accessKey = Deno.env.get("PICOVOICE_ACCESS_KEY");
    if (!accessKey) {
      return json({ error: "PICOVOICE_ACCESS_KEY not configured" }, 500);
    }

    return new Response(
      JSON.stringify({ accessKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
