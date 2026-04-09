/**
 * Sovereign Bus — Audio Module.
 * Layer 2 — remote. TTS, transcription, streaming via edge functions.
 * @version 1.0.0
 */
import { register } from "../registry";

register({
  ns: "audio",
  label: "Audio",
  layer: 2,
  defaultRemote: true,
  operations: {
    tts: {
      handler: async (params: any) => {
        // Handled by remote gateway → elevenlabs-tts edge function
        throw new Error("[bus] audio/tts is a remote method — should be dispatched via gateway");
      },
      description: "Text-to-speech synthesis via ElevenLabs",
    },
    transcribe: {
      handler: async (params: any) => {
        throw new Error("[bus] audio/transcribe is a remote method — should be dispatched via gateway");
      },
      description: "Transcribe audio to text",
    },
    stream: {
      handler: async (params: any) => {
        throw new Error("[bus] audio/stream is a remote method — should be dispatched via gateway");
      },
      description: "Stream audio content",
    },
  },
});
