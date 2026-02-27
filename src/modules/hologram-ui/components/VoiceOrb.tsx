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
 * Observer layer:
 *  - When observer context is present, a subtle outer halo indicates
 *    ambient intelligence is active — Lumen is contextually aware.
 *
 * Wake word ("Hey Lumen"):
 *  - Toggle always-listening mode with the ear icon
 *  - Passive mic monitoring with VAD → triggers voice loop hands-free
 *  - Subtle cyan sentinel ring when active
 *
 * @module hologram-ui/components/VoiceOrb
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVoiceConversation, type VoiceConversationState } from "../hooks/useVoiceConversation";
import { useWakeWord } from "../hooks/useWakeWord";
import { Mic, Square, Volume2, Waves, Ear, EarOff } from "lucide-react";

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
  listening: "Listening…",
  processing: "Understanding…",
  thinking: "Reflecting…",
  speaking: "Speaking…",
};

const STATE_COLORS: Record<VoiceConversationState, { ring: string; glow: string; bg: string }> = {
  idle: {
    ring: "hsla(38, 30%, 55%, 0.3)",
    glow: "hsla(38, 40%, 50%, 0.0)",
    bg: "hsla(0, 0%, 8%, 0.6)",
  },
  listening: {
    ring: "hsla(0, 50%, 55%, 0.65)",
    glow: "hsla(0, 50%, 50%, 0.12)",
    bg: "hsla(0, 12%, 12%, 0.8)",
  },
  processing: {
    ring: "hsla(38, 45%, 55%, 0.5)",
    glow: "hsla(38, 45%, 50%, 0.08)",
    bg: "hsla(30, 10%, 10%, 0.8)",
  },
  thinking: {
    ring: "hsla(38, 55%, 60%, 0.65)",
    glow: "hsla(38, 55%, 55%, 0.15)",
    bg: "hsla(30, 12%, 11%, 0.85)",
  },
  speaking: {
    ring: "hsla(200, 35%, 55%, 0.55)",
    glow: "hsla(200, 35%, 50%, 0.1)",
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
  const [alwaysListening, setAlwaysListening] = useState(false);

  const voice = useVoiceConversation({
    voiceEngine: "web-speech",
    personaId,
    screenContext,
    observerBriefing,
    fusionContext,
    onExchange,
    onError: (err) => console.warn("[VoiceOrb]", err),
  });

  // Wake word detection — triggers startListening hands-free
  const wakeWord = useWakeWord({
    onWake: useCallback(() => {
      if (voice.isIdle) {
        console.log("[VoiceOrb] 🎯 Wake word detected — starting conversation");
        voice.startListening();
      }
    }, [voice.isIdle, voice.startListening]),
    enabled: alwaysListening && voice.isIdle, // Only listen for wake word when idle
  });

  const colors = STATE_COLORS[voice.state];
  const hasObserver = !!(observerBriefing && observerBriefing.length > 10);

  const Icon = useMemo(() => {
    switch (voice.state) {
      case "idle": return Mic;
      case "listening": return Square;
      case "speaking": return Volume2;
      default: return Waves;
    }
  }, [voice.state]);

  // Natural waveform bars for listening state
  const waveBars = useMemo(() => {
    if (!voice.isListening) return null;
    const barHeights = [0.2, 0.5, 1.0, 0.7, 0.35];
    return (
      <div className="flex items-center gap-[2px] h-4">
        {barHeights.map((offset, i) => {
          const height = Math.max(3, Math.round(voice.audioLevel * offset * 18));
          return (
            <motion.div
              key={i}
              className="rounded-full"
              animate={{ height }}
              transition={{ duration: 0.08, ease: "easeOut" }}
              style={{
                width: "2px",
                background: `hsla(0, 50%, 62%, ${0.4 + voice.audioLevel * 0.6})`,
              }}
            />
          );
        })}
      </div>
    );
  }, [voice.isListening, voice.audioLevel]);

  // Speaking rhythm bars
  const speakBars = useMemo(() => {
    if (!voice.isSpeaking) return null;
    return (
      <div className="flex items-center gap-[2px] h-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="rounded-full"
            style={{ width: "2px", background: "hsla(200, 40%, 62%, 0.7)" }}
            animate={{ height: [4, 12, 6, 14, 4] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.12,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    );
  }, [voice.isSpeaking]);

  const toggleAlwaysListening = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setAlwaysListening(prev => !prev);
  }, []);

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
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              maxWidth: "300px",
              padding: "12px 16px",
              borderRadius: "16px",
              background: "hsla(0, 0%, 5%, 0.92)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid hsla(38, 20%, 30%, 0.15)",
              boxShadow: "0 8px 32px hsla(0, 0%, 0%, 0.4)",
            }}
          >
            {voice.lastTranscript && (
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  color: "hsla(38, 12%, 70%, 0.5)",
                  marginBottom: voice.lastResponse ? "8px" : 0,
                  lineHeight: 1.55,
                  fontStyle: "italic",
                }}
              >
                "{voice.lastTranscript}"
              </p>
            )}

            {voice.lastResponse && (voice.isThinking || voice.isSpeaking) && (
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "12px",
                  fontWeight: 300,
                  color: "hsla(38, 15%, 90%, 0.85)",
                  lineHeight: 1.6,
                  maxHeight: "120px",
                  overflow: "hidden",
                }}
              >
                {voice.lastResponse.slice(0, 250)}
                {voice.lastResponse.length > 250 ? "…" : ""}
              </p>
            )}

            {hasObserver && voice.isActive && (
              <div
                className="flex items-center gap-1.5 mt-2 pt-2"
                style={{ borderTop: "1px solid hsla(38, 20%, 30%, 0.1)" }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: "4px",
                    height: "4px",
                    background: "hsla(150, 40%, 55%, 0.6)",
                    animation: "heartbeat-love 3s ease-in-out infinite",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    color: "hsla(150, 30%, 65%, 0.45)",
                    textTransform: "uppercase",
                  }}
                >
                  Observer active
                </span>
              </div>
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
        {/* Wake word sentinel ring — outermost, subtle cyan pulse when always-listening */}
        <AnimatePresence>
          {alwaysListening && voice.isIdle && (
            <motion.div
              initial={{ opacity: 0, scale: 2.0 }}
              animate={{ opacity: 1, scale: 2.8 }}
              exit={{ opacity: 0, scale: 2.0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, hsla(185, 40%, 50%, ${
                  wakeWord.isDetecting ? 0.12 : wakeWord.isChecking ? 0.18 : 0.04
                }) 0%, transparent 70%)`,
                animation: "ring-breathe 4s ease-in-out infinite",
                transition: "background 0.5s ease",
              }}
            />
          )}
        </AnimatePresence>

        {/* Observer awareness halo */}
        {hasObserver && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              transform: "scale(2.4)",
              background: `radial-gradient(circle, hsla(150, 35%, 50%, ${voice.isActive ? 0.06 : 0.03}) 0%, transparent 70%)`,
              animation: "ring-breathe 5s ease-in-out infinite",
              transition: "background 1s ease",
            }}
          />
        )}

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
            border: `1.5px solid ${
              alwaysListening && voice.isIdle
                ? `hsla(185, 35%, 55%, ${wakeWord.isDetecting ? 0.55 : 0.35})`
                : colors.ring
            }`,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: voice.isActive
              ? `0 0 24px ${colors.glow}, inset 0 0 10px ${colors.glow}`
              : alwaysListening && voice.isIdle
                ? `0 0 12px hsla(185, 30%, 50%, 0.08)`
                : hovered
                  ? `0 0 12px hsla(38, 30%, 50%, 0.08)`
                  : "0 2px 8px hsla(0, 0%, 0%, 0.2)",
          }}
        >
          {/* Thinking/Processing spinner */}
          {(voice.isThinking || voice.isProcessing) && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: "1.5px solid transparent",
                borderTopColor: voice.isThinking
                  ? "hsla(38, 50%, 60%, 0.55)"
                  : "hsla(38, 40%, 55%, 0.4)",
                animation: `spin ${voice.isThinking ? "1s" : "1.4s"} linear infinite`,
              }}
            />
          )}

          {/* Wake word checking spinner */}
          {alwaysListening && voice.isIdle && wakeWord.isChecking && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: "1.5px solid transparent",
                borderTopColor: "hsla(185, 40%, 55%, 0.5)",
                animation: "spin 0.8s linear infinite",
              }}
            />
          )}

          {/* Icon, waveform, or speak bars */}
          {voice.isListening ? (
            waveBars
          ) : voice.isSpeaking ? (
            speakBars
          ) : (
            <Icon
              size={16}
              strokeWidth={1.5}
              style={{
                color: voice.isActive
                  ? "hsla(38, 20%, 92%, 0.9)"
                  : alwaysListening
                    ? "hsla(185, 20%, 85%, 0.65)"
                    : hovered
                      ? "hsla(38, 20%, 85%, 0.75)"
                      : "hsla(38, 15%, 75%, 0.45)",
                transition: "color 0.4s ease",
              }}
            />
          )}
        </div>
      </button>

      {/* State label + always-listening toggle */}
      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          <motion.span
            key={voice.state + (alwaysListening ? "-al" : "")}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.25 }}
            className="tracking-[0.15em] uppercase"
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: "9px",
              fontWeight: 500,
              color: alwaysListening && voice.isIdle
                ? "hsla(185, 15%, 75%, 0.55)"
                : voice.isActive
                  ? "hsla(38, 15%, 85%, 0.65)"
                  : hovered
                    ? "hsla(38, 15%, 80%, 0.45)"
                    : "hsla(38, 15%, 75%, 0.25)",
            }}
          >
            {alwaysListening && voice.isIdle
              ? wakeWord.isChecking ? "Checking…" : wakeWord.isDetecting ? "Hearing…" : "Hey Lumen"
              : STATE_LABELS[voice.state]
            }
          </motion.span>
        </AnimatePresence>

        {/* Always-listening toggle */}
        <button
          onClick={toggleAlwaysListening}
          className="group/ear relative"
          aria-label={alwaysListening ? "Disable wake word" : "Enable wake word (Hey Lumen)"}
          title={alwaysListening ? "Always listening — say 'Hey Lumen'" : "Enable hands-free: 'Hey Lumen'"}
          style={{ touchAction: "none" }}
        >
          <motion.div
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="flex items-center justify-center rounded-full"
            style={{
              width: "22px",
              height: "22px",
              background: alwaysListening
                ? "hsla(185, 25%, 20%, 0.6)"
                : "hsla(0, 0%, 15%, 0.3)",
              border: `1px solid ${
                alwaysListening
                  ? "hsla(185, 30%, 50%, 0.3)"
                  : "hsla(38, 15%, 40%, 0.15)"
              }`,
              transition: "all 0.3s ease",
            }}
          >
            {alwaysListening ? (
              <Ear
                size={10}
                strokeWidth={1.5}
                style={{ color: "hsla(185, 30%, 65%, 0.8)" }}
              />
            ) : (
              <EarOff
                size={10}
                strokeWidth={1.5}
                style={{ color: "hsla(38, 10%, 60%, 0.35)" }}
              />
            )}
          </motion.div>

          {/* Subtle pulse when actively listening for wake word */}
          {alwaysListening && voice.isIdle && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              animate={{
                boxShadow: [
                  "0 0 0 0 hsla(185, 35%, 50%, 0.15)",
                  "0 0 0 4px hsla(185, 35%, 50%, 0.0)",
                ],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          )}
        </button>
      </div>

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
              color: "hsla(0, 50%, 60%, 0.6)",
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
