/**
 * VoiceOrb — Human ↔ Hologram Voice Interface
 * ═══════════════════════════════════════════════
 *
 * Visual states:
 *  - idle:       Subtle breathing glow, minimal presence
 *  - listening:  Coherence-spectrum aura + intensity-responsive pulsation
 *  - processing: Contemplative shimmer (transcribing)
 *  - thinking:   Golden orbital animation (Lumen reasoning)
 *  - speaking:   Rhythmic pulse synced to speech output
 *
 * @module hologram-ui/components/VoiceOrb
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVoiceConversation, type VoiceConversationState } from "../hooks/useVoiceConversation";
import { useVoiceCoherence, type VoiceCoherenceMetrics } from "../hooks/useVoiceCoherence";
import { useWakeWord } from "../hooks/useWakeWord";
import { Mic, Square, Volume2, Waves, Ear, EarOff } from "lucide-react";

interface VoiceOrbProps {
  screenContext?: string;
  observerBriefing?: string;
  fusionContext?: string;
  personaId?: string;
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

const COHERENCE_LABELS: Record<VoiceCoherenceMetrics["label"], string> = {
  harmonious: "Clear",
  moderate: "Steady",
  erratic: "Slow down",
  silent: "",
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
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<VoiceCoherenceMetrics>({
    intensity: 0, steadiness: 1, pace: 0, coherence: 1, hue: 150, label: "silent",
  });

  const coherence = useVoiceCoherence();
  const metricsRafRef = useRef<number | null>(null);

  const voice = useVoiceConversation({
    voiceEngine: "web-speech",
    personaId,
    screenContext,
    observerBriefing,
    fusionContext,
    onExchange,
    onError: (err) => {
      console.warn("[VoiceOrb]", err);
      if (/requested device not found/i.test(err)) setVoiceError("No microphone detected");
      else if (/permission|denied|notallowed/i.test(err)) setVoiceError("Microphone permission blocked");
      else if (/voice output|audio playback/i.test(err)) setVoiceError("Audio playback failed");
      else setVoiceError(err);
    },
  });

  // No diagnostics gate — go straight to listening
  const handleVoiceToggle = useCallback(() => {
    setVoiceError(null);
    voice.toggle();
  }, [voice.toggle]);

  // Analyze audio level while listening
  useEffect(() => {
    if (!voice.isListening) {
      coherence.reset();
      setMetrics({ intensity: 0, steadiness: 1, pace: 0, coherence: 1, hue: 150, label: "silent" });
      return;
    }

    let active = true;
    const tick = () => {
      if (!active) return;
      setMetrics(coherence.analyze(voice.audioLevel));
      metricsRafRef.current = requestAnimationFrame(tick);
    };
    metricsRafRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (metricsRafRef.current) cancelAnimationFrame(metricsRafRef.current);
    };
  }, [voice.isListening, voice.audioLevel, coherence]);

  const wakeWord = useWakeWord({
    onWake: useCallback(() => {
      if (voice.isIdle) voice.startListening();
    }, [voice.isIdle, voice.startListening]),
    enabled: alwaysListening && voice.isIdle,
  });

  const hasObserver = !!(observerBriefing && observerBriefing.length > 10);

  // Coherence-driven colors
  const coherenceRing = useMemo(() => {
    if (!voice.isListening) return STATE_COLORS[voice.state].ring;
    const { hue, coherence: c, intensity } = metrics;
    return `hsla(${hue}, ${40 + c * 20}%, ${50 + intensity * 10}%, ${0.4 + intensity * 0.4})`;
  }, [voice.isListening, voice.state, metrics]);

  const coherenceGlow = useMemo(() => {
    if (!voice.isListening) return STATE_COLORS[voice.state].glow;
    return `hsla(${metrics.hue}, 45%, 50%, ${0.05 + metrics.intensity * 0.2})`;
  }, [voice.isListening, voice.state, metrics]);

  const coherenceBg = useMemo(() => {
    if (!voice.isListening) return STATE_COLORS[voice.state].bg;
    return `hsla(${metrics.hue}, 8%, 10%, 0.85)`;
  }, [voice.isListening, voice.state, metrics]);

  const Icon = useMemo(() => {
    switch (voice.state) {
      case "idle": return Mic;
      case "listening": return Square;
      case "speaking": return Volume2;
      default: return Waves;
    }
  }, [voice.state]);

  // Waveform bars
  const waveBars = useMemo(() => {
    if (!voice.isListening) return null;
    const { hue, coherence: c, intensity } = metrics;
    return (
      <div className="flex items-center gap-[2px] h-4">
        {[0.2, 0.5, 1.0, 0.7, 0.35].map((offset, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            animate={{ height: Math.max(3, Math.round(intensity * offset * 20)) }}
            transition={{ duration: 0.06, ease: "easeOut" }}
            style={{
              width: "2.5px",
              background: `hsla(${hue}, ${40 + c * 25}%, 62%, ${0.35 + intensity * 0.65})`,
            }}
          />
        ))}
      </div>
    );
  }, [voice.isListening, metrics]);

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
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
          />
        ))}
      </div>
    );
  }, [voice.isSpeaking]);

  const toggleAlwaysListening = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setAlwaysListening(prev => !prev);
  }, []);

  const pulseScale = voice.isListening ? 1.4 + metrics.intensity * 1.2 : 1.8;

  return (
    <div
      className="relative flex flex-col items-center gap-2"
      style={{ minHeight: "70px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Transcript overlay */}
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
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                color: "hsla(38, 12%, 70%, 0.5)",
                marginBottom: voice.lastResponse ? "8px" : 0,
                lineHeight: 1.55,
                fontStyle: "italic",
              }}>
                "{voice.lastTranscript}"
              </p>
            )}
            {voice.lastResponse && (voice.isThinking || voice.isSpeaking) && (
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "12px",
                fontWeight: 300,
                color: "hsla(38, 15%, 90%, 0.85)",
                lineHeight: 1.6,
                maxHeight: "120px",
                overflow: "hidden",
              }}>
                {voice.lastResponse.slice(0, 250)}
                {voice.lastResponse.length > 250 ? "…" : ""}
              </p>
            )}
            {hasObserver && voice.isActive && (
              <div className="flex items-center gap-1.5 mt-2 pt-2" style={{ borderTop: "1px solid hsla(38, 20%, 30%, 0.1)" }}>
                <div className="rounded-full" style={{
                  width: "4px", height: "4px",
                  background: "hsla(150, 40%, 55%, 0.6)",
                  animation: "heartbeat-love 3s ease-in-out infinite",
                }} />
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "9px", letterSpacing: "0.12em",
                  color: "hsla(150, 30%, 65%, 0.45)",
                  textTransform: "uppercase",
                }}>Observer active</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Orb */}
      <button
        onClick={handleVoiceToggle}
        className="relative group cursor-pointer select-none"
        style={{ touchAction: "none" }}
        aria-label={STATE_LABELS[voice.state]}
      >
        {/* Wake word sentinel ring */}
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

        {/* Wake detection ripple */}
        <AnimatePresence>
          {wakeWord.wakeDetected && (
            <>
              <motion.div key="ripple-1"
                initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 3.5 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ border: "2px solid hsla(185, 50%, 60%, 0.5)" }}
              />
              <motion.div key="ripple-2"
                initial={{ opacity: 0.4, scale: 1 }} animate={{ opacity: 0, scale: 2.8 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.08 }}
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ border: "1.5px solid hsla(185, 45%, 55%, 0.35)" }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Listening: Coherence-spectrum pulsating rings */}
        <AnimatePresence>
          {voice.isListening && metrics.label !== "silent" && (
            <>
              <motion.div
                key="pulse-ring-1"
                initial={{ opacity: 0, scale: 1 }}
                animate={{
                  opacity: [0.3 + metrics.intensity * 0.4, 0.1],
                  scale: [1.2, pulseScale],
                }}
                exit={{ opacity: 0, scale: 1 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ border: `1.5px solid hsla(${metrics.hue}, 45%, 58%, ${0.3 + metrics.intensity * 0.5})` }}
              />
              <motion.div
                key="pulse-ring-2"
                initial={{ opacity: 0, scale: 1 }}
                animate={{
                  opacity: [0.15 + metrics.intensity * 0.2, 0.0],
                  scale: [1.1, pulseScale * 0.85],
                }}
                exit={{ opacity: 0, scale: 1 }}
                transition={{ duration: 1.0, repeat: Infinity, ease: "easeOut", delay: 0.15 }}
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ border: `1px solid hsla(${metrics.hue}, 40%, 55%, ${0.15 + metrics.intensity * 0.3})` }}
              />
              <motion.div
                key="coherence-glow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  transform: `scale(${1.6 + metrics.intensity * 0.6})`,
                  background: `radial-gradient(circle, hsla(${metrics.hue}, 45%, 50%, ${0.06 + metrics.intensity * 0.12}) 0%, transparent 70%)`,
                  transition: "transform 0.15s ease-out, background 0.3s ease",
                }}
              />
            </>
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
            transform: `scale(${voice.isListening ? 1.5 + metrics.intensity * 0.5 : 1.8})`,
            background: `radial-gradient(circle, ${coherenceGlow} 0%, transparent 70%)`,
            animation: voice.isActive && !voice.isListening ? "ring-breathe 3s ease-in-out infinite" : undefined,
            transition: "transform 0.15s ease-out, background 0.3s ease",
          }}
        />

        {/* Main Ring */}
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: "44px",
            height: "44px",
            background: coherenceBg,
            border: `1.5px solid ${
              alwaysListening && voice.isIdle
                ? `hsla(185, 35%, 55%, ${wakeWord.isDetecting ? 0.55 : 0.35})`
                : coherenceRing
            }`,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: voice.isListening
              ? `0 0 ${12 + metrics.intensity * 20}px ${coherenceGlow}, inset 0 0 ${6 + metrics.intensity * 8}px ${coherenceGlow}`
              : voice.isActive
                ? `0 0 24px ${STATE_COLORS[voice.state].glow}, inset 0 0 10px ${STATE_COLORS[voice.state].glow}`
                : alwaysListening && voice.isIdle
                  ? "0 0 12px hsla(185, 30%, 50%, 0.08)"
                  : hovered
                    ? "0 0 12px hsla(38, 30%, 50%, 0.08)"
                    : "0 2px 8px hsla(0, 0%, 0%, 0.2)",
            transition: "background 0.3s ease, border-color 0.15s ease, box-shadow 0.15s ease",
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

          {/* Icon / waveform / speak bars */}
          {voice.isListening ? waveBars : voice.isSpeaking ? speakBars : (
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

      {/* State label + STT engine badge + always-listening toggle */}
      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          <motion.span
            key={voice.state + (alwaysListening ? "-al" : "") + voice.sttEngine}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.25 }}
            className="tracking-[0.15em] uppercase flex items-center gap-1.5"
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: "9px",
              fontWeight: 500,
              color: voice.isListening && metrics.label !== "silent"
                ? `hsla(${metrics.hue}, 30%, 75%, 0.7)`
                : alwaysListening && voice.isIdle
                  ? "hsla(185, 15%, 75%, 0.55)"
                  : voice.isActive
                    ? "hsla(38, 15%, 85%, 0.65)"
                    : hovered
                      ? "hsla(38, 15%, 80%, 0.45)"
                      : "hsla(38, 15%, 75%, 0.25)",
              transition: "color 0.3s ease",
            }}
          >
            {voice.isListening && metrics.label !== "silent" && (
              <span
                className="rounded-full inline-block"
                style={{
                  width: "4px", height: "4px",
                  background: `hsla(${metrics.hue}, 50%, 60%, 0.8)`,
                  transition: "background 0.3s ease",
                }}
              />
            )}
            {alwaysListening && voice.isIdle
              ? wakeWord.isChecking ? "Checking…" : wakeWord.isDetecting ? "Hearing…" : "Hey Lumen"
              : voice.isListening && metrics.label !== "silent"
                ? COHERENCE_LABELS[metrics.label]
                : STATE_LABELS[voice.state]
            }
            {voice.isActive && (
              <span
                style={{
                  fontSize: "7px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  padding: "1px 4px",
                  borderRadius: "4px",
                  background: voice.sttEngine === "whisper"
                    ? "hsla(160, 35%, 25%, 0.5)"
                    : "hsla(38, 25%, 25%, 0.4)",
                  color: voice.sttEngine === "whisper"
                    ? "hsla(160, 40%, 70%, 0.8)"
                    : "hsla(38, 20%, 65%, 0.6)",
                  border: `1px solid ${
                    voice.sttEngine === "whisper"
                      ? "hsla(160, 30%, 45%, 0.25)"
                      : "hsla(38, 20%, 40%, 0.15)"
                  }`,
                }}
              >
                {voice.sttEngine === "whisper" ? "WHISPER·vGPU" : "NATIVE"}
              </span>
            )}
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
              background: alwaysListening ? "hsla(185, 25%, 20%, 0.6)" : "hsla(0, 0%, 15%, 0.3)",
              border: `1px solid ${alwaysListening ? "hsla(185, 30%, 50%, 0.3)" : "hsla(38, 15%, 40%, 0.15)"}`,
              transition: "all 0.3s ease",
            }}
          >
            {alwaysListening
              ? <Ear size={10} strokeWidth={1.5} style={{ color: "hsla(185, 30%, 65%, 0.8)" }} />
              : <EarOff size={10} strokeWidth={1.5} style={{ color: "hsla(38, 10%, 60%, 0.35)" }} />
            }
          </motion.div>

          {alwaysListening && voice.isIdle && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              animate={{
                boxShadow: [
                  "0 0 0 0 hsla(185, 35%, 50%, 0.15)",
                  "0 0 0 4px hsla(185, 35%, 50%, 0.0)",
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </button>
      </div>

      {/* Elapsed timer */}
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
              color: `hsla(${metrics.hue}, 40%, 60%, 0.6)`,
              letterSpacing: "0.05em",
              transition: "color 0.3s ease",
            }}
          >
            {Math.floor(voice.elapsed / 60)}:{String(voice.elapsed % 60).padStart(2, "0")}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Error display */}
      <AnimatePresence>
        {voiceError && !voice.isActive && (
          <motion.span
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: "10px",
              fontWeight: 500,
              color: "hsla(0, 45%, 70%, 0.82)",
              letterSpacing: "0.04em",
            }}
          >
            {voiceError}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
