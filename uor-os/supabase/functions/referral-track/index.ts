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

/** Rate limiting: track IPs to prevent abuse */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Rate limit by IP
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIp)) {
    return json({ error: "Too many requests" }, 429);
  }

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

  if (!action || (action !== "click" && action !== "signup")) {
    return json({ error: 'Invalid action. Use "click" or "signup".' }, 422);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // For signup actions, require authentication
  if (action === "signup") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized: signup tracking requires authentication" }, 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabaseAuth.auth.getClaims(token);
    if (error || !data?.claims) {
      return json({ error: "Unauthorized: invalid token" }, 401);
    }
  }

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
