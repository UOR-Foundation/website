/**
 * Voice Reply — Oracle AI response for voice conversations.
 * ══════════════════════════════════════════════════════════
 *
 * Sends user transcript to AI via edge function and returns
 * a concise spoken response. Uses Lovable AI Gateway.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Get an AI response optimized for voice output.
 */
export async function askOracleForVoiceReply(transcript: string): Promise<string> {
  if (!transcript.trim()) return "";

  try {
    const { data, error } = await supabase.functions.invoke("voice-reply", {
      body: { transcript },
    });

    if (error) {
      console.warn("[VoiceReply] Edge function error:", error.message);
      return "";
    }

    return data?.reply ?? "";
  } catch (err) {
    console.warn("[VoiceReply] Failed:", err);
    return "";
  }
}
