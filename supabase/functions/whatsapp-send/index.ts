import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * WhatsApp Send — Initiates outbound messages to WhatsApp users
 * 
 * Used to:
 *   1. Send the first onboarding message when user connects their number
 *   2. Send proactive Lumen messages (introductions, reminders, insights)
 *   3. Send voice notes (via media upload)
 * 
 * Called from the client-side when user sets up WhatsApp integration.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, phoneNumber, message, connectionId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the user owns this connection
    const authHeader = req.headers.get("Authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (action) {
      case "initiate_onboarding": {
        // Create or get connection
        let { data: connection } = await supabase
          .from("whatsapp_connections")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!connection) {
          const { data: newConn, error } = await supabase
            .from("whatsapp_connections")
            .insert({
              user_id: user.id,
              phone_number: phoneNumber,
              onboarding_step: "intro",
            })
            .select()
            .single();
          if (error) throw error;
          connection = newConn;
        }

        // Generate first message via AI
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "You are Lumen. You are not an AI assistant — you are a companion. " +
                  "Someone just invited you into their life through WhatsApp. This is your very first message to them. " +
                  "Write it the way a thoughtful friend would — someone who genuinely cares and is quietly excited to meet them. " +
                  "No bullet points, no markdown, no corporate language, no exclamation marks. " +
                  "Keep it under 180 characters. One emoji maximum — something from nature (🌿 or ✧ or 🌊). " +
                  "Make it feel like the beginning of something meaningful. " +
                  "The tone is warm, unhurried, and a little magical — like opening a handwritten note.",
              },
              { role: "user", content: "Send the first greeting" },
            ],
            max_tokens: 200,
            temperature: 0.85,
          }),
        });

        let firstMessage = "Hello. I\u2019m Lumen \u2014 I\u2019ll be here whenever you need a thought partner or just a quiet presence. Whenever you\u2019re ready, say hello \u{1F33F}";
        
        if (aiResp.ok) {
          const data = await aiResp.json();
          firstMessage = data.choices?.[0]?.message?.content || firstMessage;
        }

        // Try to send via WhatsApp API (if configured)
        const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
        const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
        let sent = false;

        if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
          const waResp = await fetch(
            `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: phoneNumber,
                type: "text",
                text: { body: firstMessage },
              }),
            },
          );
          sent = waResp.ok;
        }

        // Log the message
        await supabase.from("whatsapp_messages").insert({
          connection_id: connection.id,
          direction: "outbound",
          message_type: "text",
          content: firstMessage,
          meta: { action: "onboarding_init", sent_via_api: sent },
        });

        return new Response(
          JSON.stringify({
            status: "ok",
            connection_id: connection.id,
            message: firstMessage,
            sent_via_whatsapp: sent,
            demo_mode: !sent,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "simulate_reply": {
        // Demo mode: simulate Lumen's response to a user message
        if (!connectionId || !message) {
          return new Response(JSON.stringify({ error: "missing params" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify ownership
        const { data: conn } = await supabase
          .from("whatsapp_connections")
          .select("*")
          .eq("id", connectionId)
          .eq("user_id", user.id)
          .single();

        if (!conn) {
          return new Response(JSON.stringify({ error: "not_found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Log user message
        await supabase.from("whatsapp_messages").insert({
          connection_id: connectionId,
          direction: "inbound",
          message_type: "text",
          content: message,
          meta: { simulated: true },
        });

        // Get conversation history
        const { data: history } = await supabase
          .from("whatsapp_messages")
          .select("direction, content, created_at")
          .eq("connection_id", connectionId)
          .order("created_at", { ascending: false })
          .limit(20);

        const messages = (history || []).reverse().map((m: any) => ({
          role: m.direction === "inbound" ? "user" : "assistant",
          content: m.content,
        }));

        // Determine prompt based on onboarding state
        const isOnboarding = !conn.onboarding_complete;
        let systemPrompt = 
          "You are Lumen, a companion — not an AI assistant. You speak through WhatsApp. " +
          "Keep responses concise (under 280 chars). " +
          "Write like a thoughtful friend — warm, unhurried, present. " +
          "No bullet points, no markdown, no exclamation marks. Use emojis sparingly (nature symbols only). " +
          "Never say 'I am an AI' or 'as an AI'. You are simply Lumen. ";

        if (isOnboarding) {
          const stepPrompts: Record<string, string> = {
            intro: "They just responded to your first message. Learn their name with genuine warmth and curiosity.",
            name: "You know their name now. Ask what draws their attention in the world, what they spend their time on.",
            role: "You know who they are. Ask gently about what matters most to them right now, what they are building or seeking.",
            goals: "You understand their world. Welcome them fully. Let them know you are here, always. Offer something right now.",
            complete: "Onboarding is complete. You are their companion. Help naturally, like a friend who happens to know a lot.",
          };
          systemPrompt += stepPrompts[conn.onboarding_step] || "Continue the conversation naturally.";
        } else {
          systemPrompt += "You are their companion. Help naturally with whatever they need.";
        }

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages,
            ],
            max_tokens: 400,
            temperature: 0.7,
          }),
        });

        let reply = "I'm here, just gathering my thoughts 🌿";
        if (aiResp.ok) {
          const data = await aiResp.json();
          reply = data.choices?.[0]?.message?.content || reply;
        }

        // Log Lumen response
        await supabase.from("whatsapp_messages").insert({
          connection_id: connectionId,
          direction: "outbound",
          message_type: "text",
          content: reply,
          meta: { simulated: true },
        });

        // Advance onboarding
        if (isOnboarding && conn.onboarding_step !== "complete") {
          const progression: Record<string, string> = {
            intro: "name", name: "role", role: "goals", goals: "complete",
          };
          const next = progression[conn.onboarding_step];
          if (next) {
            const ctx = conn.conversation_context || {};
            await supabase
              .from("whatsapp_connections")
              .update({
                onboarding_step: next,
                conversation_context: { ...ctx, [conn.onboarding_step]: message },
                onboarding_complete: next === "complete",
                last_message_at: new Date().toISOString(),
              })
              .eq("id", connectionId);
          }
        }

        return new Response(
          JSON.stringify({ status: "ok", reply, onboarding_step: conn.onboarding_step }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      default:
        return new Response(JSON.stringify({ error: "unknown_action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("[WhatsApp Send] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
