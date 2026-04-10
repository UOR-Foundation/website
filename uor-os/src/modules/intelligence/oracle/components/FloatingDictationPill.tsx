/**
 * FloatingDictationPill — Wispr Flow-style floating dictation indicator.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Small pill that appears when global dictation is active.
 * Shows waveform visualization, interim text, and privacy badge.
 * Extended for voice-to-voice: shows speaking state + reply toggle.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Mic, Loader2, X, Volume2 } from "lucide-react";
import type { VoicePhase } from "@/modules/intelligence/oracle/hooks/useVoiceToVoice";
import type { DictationState } from "@/modules/intelligence/oracle/hooks/useGlobalDictation";

interface Props {
  state: DictationState;
  phase?: VoicePhase;
  responseText?: string;
  voiceReplyEnabled?: boolean;
  onStop: () => void;
  onCancel: () => void;
  onToggleVoiceReply?: (enabled: boolean) => void;
}

/** Mini waveform bars driven by audio level */
function WaveformBars({ level, active }: { level: number; active: boolean }) {
  const bars = 5;
  return (
    <div className="flex items-center gap-[2px] h-4">
      {Array.from({ length: bars }).map((_, i) => {
        const delay = i * 0.08;
        const height = active
          ? 4 + level * 12 * (1 + Math.sin(Date.now() / 200 + i * 1.5) * 0.3)
          : 3;
        return (
          <motion.div
            key={i}
            className="w-[2px] rounded-full bg-primary"
            animate={{ height: Math.max(3, Math.min(16, height)) }}
            transition={{ duration: 0.1, delay }}
          />
        );
      })}
    </div>
  );
}

/** Speaker waveform for TTS playback */
function SpeakerWaveform() {
  const bars = 4;
  return (
    <div className="flex items-center gap-[2px] h-4">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full bg-accent"
          animate={{
            height: [4, 10 + Math.random() * 6, 4],
          }}
          transition={{
            duration: 0.6 + i * 0.1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.12,
          }}
        />
      ))}
    </div>
  );
}

export default function FloatingDictationPill({
  state,
  phase = "idle",
  responseText,
  voiceReplyEnabled,
  onStop,
  onCancel,
  onToggleVoiceReply,
}: Props) {
  const { active, interim, committed, level, engine, cleaning } = state;
  const isSpeaking = phase === "speaking";
  const isProcessing = phase === "processing" && !cleaning;
  const show = active || cleaning || isSpeaking || isProcessing;

  const displayText = isSpeaking
    ? responseText
    : isProcessing
    ? "Thinking…"
    : interim || committed;

  const privacyLabel = isSpeaking
    ? "ElevenLabs"
    : engine === "whisper"
    ? "On-device"
    : engine === "elevenlabs"
    ? "ElevenLabs"
    : "Browser";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-20 left-1/2 z-[210] -translate-x-1/2 pointer-events-auto"
          initial={{ y: 30, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-border/20 shadow-2xl"
            style={{
              background: "hsl(var(--background) / 0.85)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              minWidth: 280,
              maxWidth: 520,
            }}
          >
            {/* Status indicator */}
            {cleaning || isProcessing ? (
              <Loader2 size={16} className="text-primary animate-spin shrink-0" />
            ) : isSpeaking ? (
              <Volume2 size={16} className="text-accent shrink-0" />
            ) : (
              <div className="relative shrink-0">
                <Mic size={16} className="text-primary" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              </div>
            )}

            {/* Waveform */}
            {isSpeaking ? (
              <SpeakerWaveform />
            ) : !cleaning && !isProcessing ? (
              <WaveformBars level={level} active={active} />
            ) : null}

            {/* Text display */}
            <div className="flex-1 min-w-0">
              {cleaning ? (
                <span className="text-xs text-muted-foreground">Cleaning up…</span>
              ) : displayText ? (
                <p className="text-sm text-foreground/80 truncate">{displayText}</p>
              ) : (
                <span className="text-xs text-muted-foreground/50">Listening…</span>
              )}
            </div>

            {/* Privacy badge */}
            <span className="text-[10px] text-muted-foreground/40 font-mono shrink-0">
              {privacyLabel}
            </span>

            {/* Voice reply toggle */}
            {onToggleVoiceReply && (active || isSpeaking) && (
              <button
                onClick={() => onToggleVoiceReply(!voiceReplyEnabled)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors ${
                  voiceReplyEnabled
                    ? "bg-accent/20 text-accent"
                    : "bg-muted/20 text-muted-foreground/40"
                }`}
                title={voiceReplyEnabled ? "Voice reply on" : "Voice reply off"}
              >
                {voiceReplyEnabled ? "V2V" : "V2V"}
              </button>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {(active || isSpeaking) && (
                <button
                  onClick={onStop}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  Done
                </button>
              )}
              <button
                onClick={onCancel}
                className="p-1 rounded-lg text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted/20 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Keyboard hint */}
          <motion.div
            className="text-center mt-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-[10px] text-muted-foreground/20 font-mono">
              {isSpeaking ? "Press again to stop" : "Esc to cancel · ⌘⇧V to toggle"}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
