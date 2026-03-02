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
 *   1. initiate_onboarding — First greeting (works WITHOUT auth for onboarding)
 *   2. simulate_reply — Demo mode conversation (requires auth)
 *   3. send_voice — Generate and send a voice note (requires auth)
 *   4. claim_connection — Link anonymous connection to authenticated user
 */

/** Hash phone number for anonymous connection identification */
async function hashPhone(phone: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`uor:whatsapp:${phone}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, phoneNumber, message, connectionId, phoneHash } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Try to resolve user (optional — onboarding works without)
    const authHeader = req.headers.get("Authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    let user: { id: string } | null = null;

    if (authHeader && !authHeader.endsWith(anonKey)) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      user = data.user;
    }

    switch (action) {
      // ── Initiate onboarding (NO AUTH REQUIRED) ─────────────
      case "initiate_onboarding": {
        const phoneCleaned = phoneNumber?.replace(/\D/g, "");
        if (!phoneCleaned || phoneCleaned.length < 7) {
          return new Response(JSON.stringify({ error: "Invalid phone number" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const phoneHashValue = await hashPhone(phoneCleaned);

        // Check for existing connection (by user_id OR phone_hash)
        let connection: any = null;

        if (user) {
          const { data } = await supabase
            .from("whatsapp_connections")
            .select("*")
            .eq("user_id", user.id)
            .single();
          connection = data;
        }

        if (!connection) {
          // Check by phone hash (anonymous connection)
          const { data } = await supabase
            .from("whatsapp_connections")
            .select("*")
            .eq("phone_hash", phoneHashValue)
            .maybeSingle();
          connection = data;
        }

        if (!connection) {
          const insertData: Record<string, unknown> = {
            phone_number: phoneCleaned,
            phone_hash: phoneHashValue,
            onboarding_step: "intro",
            context_encrypted: false,
          };
          // If authenticated, link immediately
          if (user) {
            insertData.user_id = user.id;
            insertData.context_encrypted = true;
          }

          const { data: newConn, error } = await supabase
            .from("whatsapp_connections")
            .insert(insertData)
            .select()
            .single();
          if (error) throw error;
          connection = newConn;
        } else if (user && !connection.user_id) {
          // Claim anonymous connection on the spot
          await supabase
            .from("whatsapp_connections")
            .update({ user_id: user.id, context_encrypted: true })
            .eq("id", connection.id);
        }

        // ── Message template configuration ──────────────────────
        // Meta requires approved templates for business-initiated conversations.
        // Template name and language must match what's configured in WhatsApp Manager.
        // Set WHATSAPP_TEMPLATE_NAME secret to override (default: "lumen_greeting").
        const TEMPLATE_NAME = Deno.env.get("WHATSAPP_TEMPLATE_NAME") || "hello_world";
        const TEMPLATE_LANG = Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "en_US";

        // Generate a personalized AI message (stored in DB for context, shown in-app)
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

        // Send via WhatsApp Business API using MESSAGE TEMPLATE
        // Templates are required for business-initiated conversations (24h rule).
        // Once the user replies, a 24h conversation window opens for free-form messages.
        const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
        const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
        let sent = false;
        let waError: string | null = null;

        if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
          try {
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
                  to: phoneCleaned,
                  type: "template",
                  template: {
                    name: TEMPLATE_NAME,
                    language: { code: TEMPLATE_LANG },
                  },
                }),
              },
            );

            if (waResp.ok) {
              sent = true;
              console.log("[WhatsApp] Message sent successfully to", phoneCleaned);
            } else {
              const errBody = await waResp.text();
              waError = `WhatsApp API ${waResp.status}: ${errBody}`;
              console.error("[WhatsApp] Send failed:", waResp.status, errBody);
            }
          } catch (fetchErr) {
            waError = `WhatsApp fetch error: ${fetchErr}`;
            console.error("[WhatsApp] Fetch error:", fetchErr);
          }
        } else {
          waError = `Missing credentials: TOKEN=${!!WHATSAPP_TOKEN}, PHONE_ID=${!!PHONE_NUMBER_ID}`;
          console.error("[WhatsApp] Missing credentials:", waError);
        }

        // Log
        await supabase.from("whatsapp_messages").insert({
          connection_id: connection.id,
          direction: "outbound",
          message_type: "text",
          content: firstMessage,
          meta: { action: "onboarding_init", sent_via_api: sent, anonymous: !user },
        });

        return new Response(
          JSON.stringify({
            status: "ok",
            connection_id: connection.id,
            phone_hash: phoneHashValue,
            message: firstMessage,
            sent_via_whatsapp: sent,
            demo_mode: !sent,
            context_encrypted: !!user,
            ...(waError && { whatsapp_error: waError }),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ── Claim anonymous connection (on sign-in) ────────────
      case "claim_connection": {
        if (!user) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!connectionId || !phoneHash) {
          return new Response(JSON.stringify({ error: "connectionId and phoneHash required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify phone hash matches before claiming
        const { data: conn } = await supabase
          .from("whatsapp_connections")
          .select("*")
          .eq("id", connectionId)
          .eq("phone_hash", phoneHash)
          .is("user_id", null)
          .single();

        if (!conn) {
          return new Response(JSON.stringify({ error: "not_found_or_already_claimed" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase
          .from("whatsapp_connections")
          .update({
            user_id: user.id,
            context_encrypted: true,
          })
          .eq("id", connectionId);

        return new Response(
          JSON.stringify({ status: "ok", claimed: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ── Send voice note to user ────────────────────────────
      case "send_voice": {
        if (!user) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!connectionId || !message) {
          return new Response(JSON.stringify({ error: "connectionId and message required" }), {
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

        // Generate TTS audio
        const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
        if (!ELEVENLABS_API_KEY) {
          return new Response(JSON.stringify({ error: "Voice generation not configured" }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const voiceId = "onwK4e9ZLuTAKqWW03F9";
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

        const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
        const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
        let voiceSent = false;

        if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
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
        if (!user) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
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

        await supabase.from("whatsapp_messages").insert({
          connection_id: connectionId,
          direction: "inbound",
          message_type: "text",
          content: message,
          meta: { simulated: true },
        });

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

        // If user has encrypted context, inject it
        if (conn.context_encrypted && conn.user_id) {
          systemPrompt += "This user has encrypted context enabled — their conversations are sovereign and private. ";
        }

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
