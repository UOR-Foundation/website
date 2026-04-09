import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONTEXT_PROMPTS: Record<string, string> = {
  "code-editor": "The user is dictating into a code editor. Format technical terms precisely. Use camelCase for identifiers when appropriate.",
  "notes": "The user is dictating into a note-taking app. Use clear, natural prose with proper paragraph structure.",
  "chat": "The user is dictating a chat message. Keep it casual, conversational, and concise.",
  "search": "The user is dictating a search query. Keep it as a clean, concise search phrase.",
  "default": "The user is dictating text. Format it as clean, natural prose.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, context = "default" } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 2) {
      return new Response(
        JSON.stringify({ cleaned: text ?? "" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contextHint = CONTEXT_PROMPTS[context] ?? CONTEXT_PROMPTS["default"];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a voice-to-text cleanup assistant. Your job is to take raw speech transcription and produce clean, polished text.

Rules:
- Remove filler words: um, uh, like, you know, I mean, so, basically, actually, right, okay
- Fix punctuation, capitalization, and grammar
- Remove false starts and repeated words
- Preserve the speaker's meaning and intent exactly
- Do NOT add information or change meaning
- Do NOT add commentary or explanation
- Output ONLY the cleaned text, nothing else

${contextHint}`,
          },
          {
            role: "user",
            content: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Fallback: return original text
      console.error("AI cleanup failed:", response.status);
      return new Response(
        JSON.stringify({ cleaned: text }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const cleaned = data.choices?.[0]?.message?.content?.trim() ?? text;

    return new Response(
      JSON.stringify({ cleaned }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("voice-cleanup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
