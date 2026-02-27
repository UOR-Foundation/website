/**
 * VoiceOrb — Human ↔ Hologram Voice Interface
 * ═══════════════════════════════════════════════
 *
 * A breathing, organic orb that serves as the voice conversation interface.
 * Sits near the Lumen AI pill. Tap to speak, tap again to stop.
 *
 * Visual states:
 *  - idle:       Subtle breathing glow, minimal presence
 *  - listening:  Warm pulse, waveform reacts to voice amplitude
 *  - processing: Contemplative shimmer (transcribing)
 *  - thinking:   Golden orbital animation (Lumen reasoning)
 *  - speaking:   Rhythmic pulse synced to speech output
 *
 * @module hologram-ui/components/VoiceOrb
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVoiceConversation, type VoiceConversationState } from "../hooks/useVoiceConversation";
import { Mic, Square, Volume2 } from "lucide-react";

interface VoiceOrbProps {
  /** Screen context for ambient awareness */
  screenContext?: string;
  /** Observer briefing */
  observerBriefing?: string;
  /** Fusion context */
  fusionContext?: string;
  /** Persona ID */
  personaId?: string;
  /** Called when a voice exchange completes */
  onExchange?: (userText: string, assistantText: string) => void;
}

const STATE_LABELS: Record<VoiceConversationState, string> = {
  idle: "Speak",
  listening: "Listening",
  processing: "Understanding",
  thinking: "Thinking",
  speaking: "Speaking",
};

const STATE_COLORS: Record<VoiceConversationState, { ring: string; glow: string; bg: string }> = {
  idle: {
    ring: "hsla(38, 30%, 55%, 0.3)",
    glow: "hsla(38, 40%, 50%, 0.0)",
    bg: "hsla(0, 0%, 8%, 0.6)",
  },
  listening: {
    ring: "hsla(0, 55%, 55%, 0.7)",
    glow: "hsla(0, 55%, 50%, 0.15)",
    bg: "hsla(0, 15%, 12%, 0.8)",
  },
  processing: {
    ring: "hsla(38, 50%, 55%, 0.5)",
    glow: "hsla(38, 50%, 50%, 0.1)",
    bg: "hsla(30, 10%, 10%, 0.8)",
  },
  thinking: {
    ring: "hsla(38, 60%, 60%, 0.7)",
    glow: "hsla(38, 60%, 55%, 0.2)",
    bg: "hsla(30, 12%, 11%, 0.85)",
  },
  speaking: {
    ring: "hsla(200, 40%, 55%, 0.6)",
    glow: "hsla(200, 40%, 50%, 0.12)",
    bg: "hsla(200, 8%, 10%, 0.8)",
  },
};

export default function VoiceOrb({
  screenContext,
  observerBriefing,
  fusionContext,
  personaId = "hologram",
  onExchange,
}: VoiceOrbProps) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const voice = useVoiceConversation({
    voiceEngine: "web-speech",
    personaId,
    screenContext,
    observerBriefing,
    fusionContext,
    onExchange,
    onError: (err) => console.warn("[VoiceOrb]", err),
  });

  const colors = STATE_COLORS[voice.state];

  const Icon = useMemo(() => {
    switch (voice.state) {
      case "idle": return Mic;
      case "listening": return Square;
      case "speaking": return Volume2;
      default: return Mic;
    }
  }, [voice.state]);

  // Waveform bars for listening state
  const waveBars = useMemo(() => {
    if (!voice.isListening) return null;
    return (
      <div className="flex items-center gap-[2px] h-4">
        {[0.3, 0.6, 1, 0.7, 0.4].map((offset, i) => {
          const height = Math.max(3, Math.round(voice.audioLevel * offset * 16));
          return (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: "2px",
                height: `${height}px`,
                background: `hsla(0, 55%, 60%, ${0.5 + voice.audioLevel * 0.5})`,
                transition: "height 80ms ease-out",
              }}
            />
          );
        })}
      </div>
    );
  }, [voice.isListening, voice.audioLevel]);

  return (
    <div
      className="flex flex-col items-center gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Transcript overlay — appears above when active */}
      <AnimatePresence>
        {voice.isActive && (voice.lastTranscript || voice.lastResponse) && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              maxWidth: "280px",
              padding: "10px 14px",
              borderRadius: "14px",
              background: "hsla(0, 0%, 6%, 0.9)",
              backdropFilter: "blur(20px)",
              border: "1px solid hsla(38, 20%, 30%, 0.2)",
            }}
          >
            {voice.lastTranscript && (
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  color: "hsla(38, 15%, 75%, 0.6)",
                  marginBottom: voice.lastResponse ? "6px" : 0,
                  lineHeight: 1.5,
                }}
              >
                {voice.lastTranscript}
              </p>
            )}
            {voice.lastResponse && (voice.isThinking || voice.isSpeaking) && (
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "hsla(38, 15%, 88%, 0.85)",
                  lineHeight: 1.5,
                  maxHeight: "100px",
                  overflow: "hidden",
                }}
              >
                {voice.lastResponse.slice(0, 200)}
                {voice.lastResponse.length > 200 ? "…" : ""}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Orb */}
      <button
        onClick={voice.toggle}
        className="relative group cursor-pointer select-none"
        style={{ touchAction: "none" }}
        aria-label={STATE_LABELS[voice.state]}
      >
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            transform: "scale(1.8)",
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            animation: voice.isActive ? "ring-breathe 3s ease-in-out infinite" : undefined,
            transition: "background 0.6s ease",
          }}
        />

        {/* Ring */}
        <div
          className="relative flex items-center justify-center rounded-full transition-all duration-500"
          style={{
            width: "44px",
            height: "44px",
            background: colors.bg,
            border: `1.5px solid ${colors.ring}`,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: voice.isActive
              ? `0 0 20px ${colors.glow}, inset 0 0 8px ${colors.glow}`
              : "0 2px 8px hsla(0, 0%, 0%, 0.2)",
          }}
        >
          {/* Thinking spinner */}
          {(voice.isThinking || voice.isProcessing) && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: "1.5px solid transparent",
                borderTopColor: "hsla(38, 50%, 60%, 0.6)",
                animation: "spin 1.2s linear infinite",
              }}
            />
          )}

          {/* Icon or waveform */}
          {voice.isListening ? (
            waveBars
          ) : (
            <Icon
              size={16}
              strokeWidth={1.5}
              style={{
                color: voice.isActive
                  ? "hsla(38, 20%, 90%, 0.9)"
                  : hovered
                    ? "hsla(38, 20%, 85%, 0.8)"
                    : "hsla(38, 15%, 75%, 0.5)",
                transition: "color 0.3s ease",
              }}
            />
          )}
        </div>
      </button>

      {/* State label */}
      <span
        className="tracking-[0.15em] uppercase transition-all duration-500"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: "9px",
          fontWeight: 500,
          color: voice.isActive
            ? "hsla(38, 15%, 85%, 0.7)"
            : hovered
              ? "hsla(38, 15%, 80%, 0.5)"
              : "hsla(38, 15%, 75%, 0.3)",
        }}
      >
        {STATE_LABELS[voice.state]}
      </span>

      {/* Elapsed timer — only while listening */}
      <AnimatePresence>
        {voice.isListening && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              fontFamily: "'DM Sans', monospace",
              fontSize: "10px",
              fontWeight: 400,
              color: "hsla(0, 55%, 60%, 0.7)",
              letterSpacing: "0.05em",
            }}
          >
            {Math.floor(voice.elapsed / 60)}:{String(voice.elapsed % 60).padStart(2, "0")}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
