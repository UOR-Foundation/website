/**
 * Voice Cleanup — AI-powered transcript polishing.
 * ══════════════════════════════════════════════════
 *
 * Takes raw STT output and returns cleaned text via Lovable AI.
 * Removes filler words, fixes punctuation, adapts tone to context.
 */

import { supabase } from "@/integrations/supabase/client";

export type VoiceContext =
  | "code-editor"
  | "notes"
  | "chat"
  | "search"
  | "default";

/**
 * Clean up raw voice transcription using AI.
 * Falls back to raw text on any error.
 */
export async function cleanVoiceTranscript(
  rawText: string,
  context: VoiceContext = "default"
): Promise<string> {
  if (!rawText || rawText.trim().length < 3) return rawText;

  try {
    const { data, error } = await supabase.functions.invoke("voice-cleanup", {
      body: { text: rawText, context },
    });

    if (error) {
      console.warn("[VoiceCleanup] Edge function error, using raw text:", error.message);
      return rawText;
    }

    return data?.cleaned ?? rawText;
  } catch (err) {
    console.warn("[VoiceCleanup] Failed, using raw text:", err);
    return rawText;
  }
}

/**
 * Detect context from active app ID.
 */
export function detectVoiceContext(activeAppId?: string): VoiceContext {
  if (!activeAppId) return "default";
  if (activeAppId.includes("code") || activeAppId.includes("editor")) return "code-editor";
  if (activeAppId.includes("note") || activeAppId.includes("daily")) return "notes";
  if (activeAppId.includes("chat") || activeAppId.includes("messenger")) return "chat";
  if (activeAppId.includes("search") || activeAppId.includes("oracle")) return "search";
  return "default";
}
