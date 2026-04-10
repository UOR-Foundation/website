/**
 * Voice Reply — Oracle AI response for voice conversations.
 * ══════════════════════════════════════════════════════════
 *
 * Sends user transcript to AI and returns a concise spoken response.
 * Uses Lovable AI Gateway (no API key needed).
 */

import { supabase } from "@/integrations/supabase/client";

const VOICE_SYSTEM_PROMPT = `You are a helpful voice assistant in UOR OS. 
Respond concisely and conversationally — your response will be spoken aloud.
Keep answers under 2-3 sentences unless the user asks for detail.
Never use markdown, bullet points, or formatting — speak naturally.
Don't say "here's" or "let me" — just answer directly.`;

/**
 * Get an AI response optimized for voice output.
 */
export async function askOracleForVoiceReply(transcript: string): Promise<string> {
  if (!transcript.trim()) return "";

  try {
    const { data, error } = await supabase.functions.invoke("ai-chat-gateway", {
      body: {
        messages: [
          { role: "system", content: VOICE_SYSTEM_PROMPT },
          { role: "user", content: transcript },
        ],
        model: "google/gemini-2.5-flash",
        max_tokens: 200,
      },
    });

    if (error) {
      console.warn("[VoiceReply] Gateway error:", error.message);
      return "";
    }

    return data?.choices?.[0]?.message?.content ?? data?.response ?? "";
  } catch (err) {
    console.warn("[VoiceReply] Failed:", err);
    return "";
  }
}
