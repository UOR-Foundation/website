import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    if (req.method === "POST") {
      // ── CREATE: authenticated user creates a transfer token ──
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
        authHeader.replace("Bearer ", "")
      );
      if (claimsErr || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = claimsData.claims.sub as string;
      const body = await req.json();
      const targetUrl = typeof body.target_url === "string" ? body.target_url : "/search";
      const targetLens = typeof body.target_lens === "string" ? body.target_lens : "overview";

      const token = crypto.randomUUID();

      // Use service role to insert (bypasses RLS)
      const admin = createClient(supabaseUrl, serviceKey);
      const { error: insertErr } = await admin
        .from("session_transfers")
        .insert({ token, user_id: userId, target_url: targetUrl, target_lens: targetLens });

      if (insertErr) {
        return new Response(JSON.stringify({ error: "Failed to create token" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET") {
      // ── REDEEM: validate token, generate magic link ──
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const admin = createClient(supabaseUrl, serviceKey);

      // Fetch transfer
      const { data: transfer, error: fetchErr } = await admin
        .from("session_transfers")
        .select("*")
        .eq("token", token)
        .single();

      if (fetchErr || !transfer) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if used
      if (transfer.used) {
        return new Response(JSON.stringify({ error: "Token already used" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check 5-minute TTL
      const age = Date.now() - new Date(transfer.created_at).getTime();
      if (age > 5 * 60 * 1000) {
        return new Response(JSON.stringify({ error: "Token expired" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark used
      await admin
        .from("session_transfers")
        .update({ used: true })
        .eq("token", token);

      // Get user email to generate magic link
      const { data: userData, error: userErr } = await admin.auth.admin.getUserById(
        transfer.user_id
      );

      if (userErr || !userData?.user?.email) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate a magic link for sign-in
      const { data: linkData, error: linkErr } =
        await admin.auth.admin.generateLink({
          type: "magiclink",
          email: userData.user.email,
        });

      if (linkErr || !linkData) {
        return new Response(JSON.stringify({ error: "Failed to create session link" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          target_url: transfer.target_url,
          target_lens: transfer.target_lens,
          // The hashed_token is what the client uses with verifyOtp
          hashed_token: linkData.properties?.hashed_token,
          email: userData.user.email,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
