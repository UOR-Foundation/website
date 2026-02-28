import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { action, code } = body as { action: string; code: string };

  if (!code || typeof code !== "string" || code.length > 20) {
    return json({ error: "Invalid referral code" }, 422);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify the code exists
  const { data: link, error: lookupErr } = await supabase
    .from("invite_links")
    .select("id, click_count, signup_count")
    .eq("code", code)
    .maybeSingle();

  if (lookupErr || !link) {
    return json({ error: "Referral code not found" }, 404);
  }

  if (action === "click") {
    const { error } = await supabase
      .from("invite_links")
      .update({ click_count: link.click_count + 1 })
      .eq("id", link.id);

    if (error) {
      console.error("referral-track: click increment failed:", error);
      return json({ error: "Failed to track click" }, 500);
    }
    return json({ success: true, clicks: link.click_count + 1 });
  }

  if (action === "signup") {
    const { error } = await supabase
      .from("invite_links")
      .update({ signup_count: link.signup_count + 1 })
      .eq("id", link.id);

    if (error) {
      console.error("referral-track: signup increment failed:", error);
      return json({ error: "Failed to track signup" }, 500);
    }
    return json({ success: true, signups: link.signup_count + 1 });
  }

  return json({ error: 'Invalid action. Use "click" or "signup".' }, 422);
});
