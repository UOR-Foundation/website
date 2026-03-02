import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * WhatsApp Webhook — Receives messages from Meta Cloud API
 * 
 * GET  → Webhook verification (Meta sends verify_token challenge)
 * POST → Incoming messages from WhatsApp users
 * 
 * Now supports:
 *   - Text messages
 *   - Audio/voice note messages (transcribed via ElevenLabs STT)
 *   - Voice note replies (Lumen responds with audio when user sends audio)
 */

const VERIFY_TOKEN = "hologram_whatsapp_verify_2024";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // ── GET: Webhook verification ────────────────────────────
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // ── POST: Incoming message ───────────────────────────────
  if (req.method === "POST") {
    try {
      const body = await req.json();
      
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      
      if (!value?.messages?.length) {
        return new Response(JSON.stringify({ status: "no_message" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const message = value.messages[0];
      const from = message.from;
      const msgType = message.type;
      const waMessageId = message.id;
      const contactName = value.contacts?.[0]?.profile?.name || "Unknown";

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceKey);

      // Find connection
      const { data: connection } = await supabase
        .from("whatsapp_connections")
        .select("*")
        .eq("phone_number", from)
        .single();

      if (!connection) {
        console.log(`[WhatsApp] Unknown number: ${from}, name: ${contactName}`);
        return new Response(JSON.stringify({ status: "unknown_number" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Handle audio/voice messages ──────────────────────
      let msgBody: string;
      let isVoiceNote = false;
      let audioMediaId: string | null = null;

      if (msgType === "audio") {
        isVoiceNote = true;
        audioMediaId = message.audio?.id;
        
        // Download and transcribe the voice note
        msgBody = await transcribeVoiceNote(audioMediaId);
        console.log(`[WhatsApp] Transcribed voice note: "${msgBody}"`);
      } else if (msgType === "text") {
        msgBody = message.text?.body || "";
      } else {
        msgBody = `[${msgType} message]`;
      }

      // Log inbound message
      await supabase.from("whatsapp_messages").insert({
        connection_id: connection.id,
        direction: "inbound",
        message_type: msgType,
        content: msgBody,
        whatsapp_message_id: waMessageId,
        meta: {
          contact_name: contactName,
          raw_type: msgType,
          is_voice_note: isVoiceNote,
          transcription: isVoiceNote ? msgBody : undefined,
          audio_media_id: audioMediaId,
        },
      });

      // Update last_message_at
      await supabase
        .from("whatsapp_connections")
        .update({ last_message_at: new Date().toISOString(), display_name: contactName })
        .eq("id", connection.id);

      // Generate Lumen response
      const lumenResponse = await generateLumenResponse(
        supabase,
        connection,
        msgBody,
        isVoiceNote,
      );

      // Send response via WhatsApp API
      const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
      const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

      if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
        // Always send text reply
        await sendWhatsAppMessage(PHONE_NUMBER_ID, WHATSAPP_TOKEN, from, lumenResponse);

        // If user sent a voice note, also reply with a voice note
        if (isVoiceNote) {
          try {
            const audioReply = await generateVoiceNote(lumenResponse);
            if (audioReply) {
              const mediaId = await uploadWhatsAppMedia(PHONE_NUMBER_ID, WHATSAPP_TOKEN, audioReply);
              if (mediaId) {
                await sendWhatsAppAudio(PHONE_NUMBER_ID, WHATSAPP_TOKEN, from, mediaId);
              }
            }
          } catch (voiceErr) {
            console.error("[WhatsApp] Voice reply failed (text sent as fallback):", voiceErr);
          }
        }
      }

      // Log outbound message
      await supabase.from("whatsapp_messages").insert({
        connection_id: connection.id,
        direction: "outbound",
        message_type: isVoiceNote ? "audio+text" : "text",
        content: lumenResponse,
        meta: { generated: true, voice_reply: isVoiceNote },
      });

      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("[WhatsApp Webhook] Error:", err);
      return new Response(JSON.stringify({ error: "internal" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});

// ── Voice Note Transcription (ElevenLabs STT) ─────────────────

async function transcribeVoiceNote(mediaId: string | null): Promise<string> {
  if (!mediaId) return "[voice note — could not download]";

  const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (!WHATSAPP_TOKEN) return "[voice note — no access token]";

  try {
    // Step 1: Get media URL from WhatsApp
    const mediaResp = await fetch(
      `https://graph.facebook.com/v19.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } },
    );
    if (!mediaResp.ok) {
      console.error("[STT] Media lookup failed:", mediaResp.status);
      return "[voice note — media lookup failed]";
    }
    const mediaData = await mediaResp.json();
    const mediaUrl = mediaData.url;

    // Step 2: Download the audio file
    const audioResp = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    });
    if (!audioResp.ok) {
      console.error("[STT] Audio download failed:", audioResp.status);
      return "[voice note — download failed]";
    }
    const audioBlob = await audioResp.blob();

    // Step 3: Transcribe via ElevenLabs Scribe
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      console.log("[STT] No ElevenLabs key, skipping transcription");
      return "[voice note — transcription unavailable]";
    }

    const formData = new FormData();
    formData.append("file", audioBlob, "voice_note.ogg");
    formData.append("model_id", "scribe_v2");
    formData.append("tag_audio_events", "false");
    formData.append("diarize", "false");

    const sttResp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: formData,
    });

    if (!sttResp.ok) {
      const errText = await sttResp.text();
      console.error("[STT] Transcription failed:", sttResp.status, errText);
      return "[voice note — transcription failed]";
    }

    const transcription = await sttResp.json();
    return transcription.text || "[voice note — empty transcription]";
  } catch (err) {
    console.error("[STT] Error:", err);
    return "[voice note — processing error]";
  }
}

// ── Voice Note Generation (ElevenLabs TTS) ────────────────────

async function generateVoiceNote(text: string): Promise<Uint8Array | null> {
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) {
    console.log("[TTS] No ElevenLabs key, skipping voice generation");
    return null;
  }

  // Use Daniel voice — warm, natural, conversational
  const voiceId = "onwK4e9ZLuTAKqWW03F9";

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
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

  if (!response.ok) {
    const errText = await response.text();
    console.error("[TTS] Generation failed:", response.status, errText);
    return null;
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

// ── WhatsApp Media Upload ─────────────────────────────────────

async function uploadWhatsAppMedia(
  phoneNumberId: string,
  accessToken: string,
  audioData: Uint8Array,
): Promise<string | null> {
  try {
    const formData = new FormData();
    const audioBlob = new Blob([audioData], { type: "audio/mpeg" });
    formData.append("file", audioBlob, "lumen_voice.mp3");
    formData.append("messaging_product", "whatsapp");
    formData.append("type", "audio/mpeg");

    const resp = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      },
    );

    if (!resp.ok) {
      const err = await resp.text();
      console.error("[WhatsApp] Media upload failed:", err);
      return null;
    }

    const data = await resp.json();
    return data.id || null;
  } catch (err) {
    console.error("[WhatsApp] Media upload error:", err);
    return null;
  }
}

// ── Send WhatsApp Audio Message ───────────────────────────────

async function sendWhatsAppAudio(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  mediaId: string,
): Promise<void> {
  try {
    const resp = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "audio",
          audio: { id: mediaId },
        }),
      },
    );

    if (!resp.ok) {
      const err = await resp.text();
      console.error("[WhatsApp] Audio send failed:", err);
    }
  } catch (err) {
    console.error("[WhatsApp] Audio send error:", err);
  }
}

// ── Lumen Response Generation ──────────────────────────────────

async function generateLumenResponse(
  supabase: any,
  connection: any,
  userMessage: string,
  wasVoiceNote: boolean,
): Promise<string> {
  const { data: recentMessages } = await supabase
    .from("whatsapp_messages")
    .select("direction, content, message_type, created_at")
    .eq("connection_id", connection.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const history = (recentMessages || []).reverse().map((m: any) => ({
    role: m.direction === "inbound" ? "user" : "assistant",
    content: m.content,
  }));

  const isOnboarding = !connection.onboarding_complete;
  const step = connection.onboarding_step;

  let systemPrompt =
    "You are Lumen, speaking through WhatsApp. " +
    "Keep responses concise (under 300 chars when possible) since this is a messaging app. " +
    "Be warm, present, and genuinely helpful. " +
    "Use natural conversational tone — no bullet points, no markdown headers. " +
    "You can use emojis sparingly for warmth. ";

  if (wasVoiceNote) {
    systemPrompt +=
      "The user just sent you a voice note (transcribed below). " +
      "Respond naturally as if they spoke to you. Your reply will also be converted to a voice note, " +
      "so write as you would speak — conversational, flowing, with natural pauses (use commas and periods). " +
      "Avoid abbreviations, URLs, or anything that sounds awkward when read aloud. ";
  }

  if (isOnboarding) {
    systemPrompt += getOnboardingPrompt(step, connection);
  } else {
    systemPrompt +=
      "You are the user's personal intelligence companion available via WhatsApp. " +
      "Help with: managing their network, making introductions, surfacing insights, " +
      "calendar management, and general conversation. " +
      "Be brief but substantive. Every message should feel like a thoughtful friend texting.";
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: userMessage },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("[Lumen WA] AI error:", response.status);
      return "I'm having a moment of reflection. Let me get back to you shortly 🌿";
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I'm here, just gathering my thoughts.";

    if (isOnboarding) {
      await advanceOnboarding(supabase, connection, userMessage, reply);
    }

    return reply;
  } catch (err) {
    console.error("[Lumen WA] Generation error:", err);
    return "I'm here, just need a moment. I'll be right back 🌿";
  }
}

// ── Onboarding Prompts ─────────────────────────────────────────

function getOnboardingPrompt(step: string, _connection: any): string {
  switch (step) {
    case "intro":
      return (
        "This is your FIRST message to this person. Introduce yourself warmly. " +
        "Say something like: 'Hello! I'm Lumen, your personal intelligence companion. " +
        "I'm here to help you navigate your world with more clarity and connection. " +
        "I'd love to get to know you a little. What's your name, and what brings you here today?' " +
        "Keep it warm, brief, and inviting."
      );
    case "name":
      return (
        "The user just told you their name. Acknowledge it warmly. " +
        "Then ask what they do — their work, passion, or what occupies their mind these days."
      );
    case "role":
      return (
        "You know their name and what they do. Now ask about their goals: " +
        "What are they working toward? What matters most to them right now?"
      );
    case "goals":
      return (
        "You understand who they are and what they're working on. " +
        "Ask how they'd like Lumen to help them most. Suggest possibilities."
      );
    case "complete":
      return (
        "Onboarding is complete! Welcome them fully. Let them know you're " +
        "available right here in WhatsApp whenever they need you."
      );
    default:
      return "Continue the onboarding conversation naturally.";
  }
}

async function advanceOnboarding(
  supabase: any,
  connection: any,
  userMessage: string,
  _reply: string,
): Promise<void> {
  const step = connection.onboarding_step;
  const context = connection.conversation_context || {};

  const stepProgression: Record<string, string> = {
    intro: "name",
    name: "role",
    role: "goals",
    goals: "complete",
  };

  const nextStep = stepProgression[step];
  if (!nextStep) return;

  await supabase
    .from("whatsapp_connections")
    .update({
      onboarding_step: nextStep,
      conversation_context: { ...context, [step]: userMessage },
      onboarding_complete: nextStep === "complete",
    })
    .eq("id", connection.id);
}

// ── Send WhatsApp Text Message ─────────────────────────────────

async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
): Promise<void> {
  try {
    const resp = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      },
    );

    if (!resp.ok) {
      const err = await resp.text();
      console.error("[WhatsApp] Send failed:", err);
    }
  } catch (err) {
    console.error("[WhatsApp] Send error:", err);
  }
}
