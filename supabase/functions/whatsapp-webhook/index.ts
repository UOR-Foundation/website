import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
 * Flow:
 *   1. Receive message → look up whatsapp_connection by phone
 *   2. Log message in whatsapp_messages
 *   3. Generate Lumen response via hologram-ai-stream
 *   4. Send response back via WhatsApp Cloud API
 */

const VERIFY_TOKEN = "hologram_whatsapp_verify_2024";

serve(async (req) => {
  // CORS
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
      
      // Meta sends status updates too — only process messages
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      
      if (!value?.messages?.length) {
        return new Response(JSON.stringify({ status: "no_message" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const message = value.messages[0];
      const from = message.from; // Phone number (e.g., "15551234567")
      const msgType = message.type; // "text", "audio", "image", etc.
      const msgBody = msgType === "text" ? message.text?.body : `[${msgType} message]`;
      const waMessageId = message.id;
      const contactName = value.contacts?.[0]?.profile?.name || "Unknown";

      // Supabase admin client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceKey);

      // Find or log the connection
      const { data: connection } = await supabase
        .from("whatsapp_connections")
        .select("*")
        .eq("phone_number", from)
        .single();

      if (!connection) {
        // Unknown number — we can't process without a linked user
        console.log(`[WhatsApp] Unknown number: ${from}, name: ${contactName}`);
        return new Response(JSON.stringify({ status: "unknown_number" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log inbound message
      await supabase.from("whatsapp_messages").insert({
        connection_id: connection.id,
        direction: "inbound",
        message_type: msgType,
        content: msgBody || "",
        whatsapp_message_id: waMessageId,
        meta: { contact_name: contactName, raw_type: msgType },
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
        msgBody || "",
        supabaseUrl,
        serviceKey,
      );

      // Send response via WhatsApp API
      const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
      const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

      if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
        await sendWhatsAppMessage(PHONE_NUMBER_ID, WHATSAPP_TOKEN, from, lumenResponse);
      }

      // Log outbound message
      await supabase.from("whatsapp_messages").insert({
        connection_id: connection.id,
        direction: "outbound",
        message_type: "text",
        content: lumenResponse,
        meta: { generated: true },
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

// ── Lumen Response Generation ──────────────────────────────────

async function generateLumenResponse(
  supabase: any,
  connection: any,
  userMessage: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<string> {
  // Get recent conversation history
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

  // Determine onboarding context
  const isOnboarding = !connection.onboarding_complete;
  const step = connection.onboarding_step;

  let systemPrompt = 
    "You are Lumen, speaking through WhatsApp. " +
    "Keep responses concise (under 300 chars when possible) since this is a messaging app. " +
    "Be warm, present, and genuinely helpful. " +
    "Use natural conversational tone — no bullet points, no markdown headers. " +
    "You can use emojis sparingly for warmth. ";

  if (isOnboarding) {
    systemPrompt += getOnboardingPrompt(step, connection);
  } else {
    systemPrompt +=
      "You are the user's personal intelligence companion available via WhatsApp. " +
      "Help with: managing their network, making introductions, surfacing insights, " +
      "calendar management, and general conversation. " +
      "Be brief but substantive. Every message should feel like a thoughtful friend texting.";
  }

  // Call Lovable AI
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  try {
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
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
    
    // Update onboarding step if needed
    if (isOnboarding) {
      await advanceOnboarding(supabase, connection, userMessage, reply);
    }

    return reply;
  } catch (err) {
    console.error("[Lumen WA] Generation error:", err);
    return "I'm here, just need a moment. I'll be right back 🌿";
  }
}

function getOnboardingPrompt(step: string, connection: any): string {
  switch (step) {
    case "intro":
      return (
        "This is your FIRST message to this person. Introduce yourself warmly. " +
        "Say something like: 'Hello! I'm Lumen, your personal intelligence companion. " +
        "I'm here to help you navigate your world with more clarity and connection. " +
        "I'd love to get to know you a little. What's your name, and what brings you here today?' " +
        "Keep it warm, brief, and inviting. Make them feel welcomed, not interrogated."
      );
    case "name":
      return (
        "The user just told you their name. Acknowledge it warmly. " +
        "Then ask what they do — their work, passion, or what occupies their mind these days. " +
        "Be genuinely curious, not formulaic."
      );
    case "role":
      return (
        "You know their name and what they do. Now ask about their goals: " +
        "What are they working toward? What matters most to them right now? " +
        "This helps you understand how to be most useful."
      );
    case "goals":
      return (
        "You understand who they are and what they're working on. " +
        "Ask how they'd like Lumen to help them most. Suggest possibilities: " +
        "managing their network, surfacing insights, staying organized, or just having a " +
        "thoughtful companion to think with. Let them choose."
      );
    case "complete":
      return (
        "Onboarding is complete! Welcome them fully. Let them know you're " +
        "available right here in WhatsApp whenever they need you. " +
        "Offer to help with something right now, or let them know you'll be here."
      );
    default:
      return "Continue the onboarding conversation naturally, learning about the user.";
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

  // Store context from this step
  const updatedContext = { ...context, [step]: userMessage };
  
  await supabase
    .from("whatsapp_connections")
    .update({
      onboarding_step: nextStep,
      conversation_context: updatedContext,
      onboarding_complete: nextStep === "complete",
    })
    .eq("id", connection.id);
}

// ── WhatsApp Cloud API ─────────────────────────────────────────

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
