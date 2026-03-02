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
 * Actions:
 *   1. initiate_onboarding — First greeting when user connects
 *   2. simulate_reply — Demo mode conversation
 *   3. send_voice — Generate and send a voice note to user
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

    // Verify user
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
      // ── Initiate onboarding ────────────────────────────────
      case "initiate_onboarding": {
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

        // Send via WhatsApp API
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

        // Log
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

      // ── Send voice note to user ────────────────────────────
      case "send_voice": {
        if (!connectionId || !message) {
          return new Response(JSON.stringify({ error: "connectionId and message required" }), {
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

        // Generate TTS audio
        const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
        if (!ELEVENLABS_API_KEY) {
          return new Response(JSON.stringify({ error: "Voice generation not configured" }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const voiceId = "onwK4e9ZLuTAKqWW03F9"; // Daniel — warm, conversational
        const ttsResp = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: message,
              model_id: "eleven_turbo_v2_5",
              voice_settings: {
                stability: 0.55,
                similarity_boost: 0.78,
                style: 0.3,
                use_speaker_boost: false,
                speed: 0.95,
              },
            }),
          },
        );

        if (!ttsResp.ok) {
          const errText = await ttsResp.text();
          console.error("[TTS] Failed:", ttsResp.status, errText);
          return new Response(JSON.stringify({ error: "Voice generation failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const audioBuffer = await ttsResp.arrayBuffer();
        const audioData = new Uint8Array(audioBuffer);

        // Upload to WhatsApp and send
        const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
        const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
        let voiceSent = false;

        if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
          // Upload media
          const formData = new FormData();
          const audioBlob = new Blob([audioData], { type: "audio/mpeg" });
          formData.append("file", audioBlob, "lumen_voice.mp3");
          formData.append("messaging_product", "whatsapp");
          formData.append("type", "audio/mpeg");

          const uploadResp = await fetch(
            `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/media`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
              body: formData,
            },
          );

          if (uploadResp.ok) {
            const uploadData = await uploadResp.json();
            const mediaId = uploadData.id;

            if (mediaId) {
              const sendResp = await fetch(
                `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: conn.phone_number,
                    type: "audio",
                    audio: { id: mediaId },
                  }),
                },
              );
              voiceSent = sendResp.ok;
            }
          }
        }

        // Log the voice message
        await supabase.from("whatsapp_messages").insert({
          connection_id: connectionId,
          direction: "outbound",
          message_type: "audio",
          content: message,
          meta: { voice_note: true, sent_via_api: voiceSent },
        });

        return new Response(
          JSON.stringify({ status: "ok", voice_sent: voiceSent }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ── Simulate reply (demo mode) ─────────────────────────
      case "simulate_reply": {
        if (!connectionId || !message) {
          return new Response(JSON.stringify({ error: "missing params" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

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

        // Get history
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
            name: "You know their name now. Ask what draws their attention in the world.",
            role: "You know who they are. Ask gently about what matters most to them right now.",
            goals: "You understand their world. Welcome them fully. Offer something right now.",
            complete: "Onboarding is complete. You are their companion. Help naturally.",
          };
          systemPrompt += stepPrompts[conn.onboarding_step] || "Continue naturally.";
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
