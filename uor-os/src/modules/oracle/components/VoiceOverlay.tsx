/**
 * VoiceOverlay — Full-screen immersive voice dictation overlay.
 * Pulsing mic orb, live transcript, privacy badge, Whisper download prompt.
 * Now uses real AudioWorklet for audio level visualization.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Shield, ShieldCheck, Download, X } from "lucide-react";
import { getHologramStt } from "@/modules/uns/core/hologram/stt-engine";
import { getWhisperEngine, type WhisperLoadProgress } from "@/modules/uns/core/hologram/whisper-engine";
import { startElevenLabsScribe, type ElevenLabsSttHandle } from "@/modules/uns/core/hologram/elevenlabs-stt";
import { cleanVoiceTranscript } from "@/modules/oracle/lib/voice-cleanup";
import { usePlatform } from "@/modules/desktop/hooks/usePlatform";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export default function VoiceOverlay({ open, onClose, onSubmit }: Props) {
  const { modKey } = usePlatform();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [final, setFinal] = useState("");
  const [level, setLevel] = useState(0);
  const [cleaning, setCleaning] = useState(false);
  const [whisperLoading, setWhisperLoading] = useState(false);
  const [whisperProgress, setWhisperProgress] = useState(0);
  const handleRef = useRef<ElevenLabsSttHandle | { stop: () => void; abort: () => void } | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);

  const stt = getHologramStt();
  const privacy = stt.privacy;
  const whisperReady = stt.whisperAvailable;
  const useElevenLabs = stt.elevenLabsAvailable;

  // Start listening when overlay opens
  useEffect(() => {
    if (!open) {
      handleRef.current?.abort();
      handleRef.current = null;
      cleanupAudio();
      setListening(false);
      setInterim("");
      setFinal("");
      setLevel(0);
      setCleaning(false);
      return;
    }

    stt.autoSelect();
    startListening();

    return () => {
      handleRef.current?.abort();
      handleRef.current = null;
      cleanupAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cleanupAudio = useCallback(() => {
    workletRef.current?.disconnect();
    workletRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;
  }, []);

  /** Set up real AudioWorklet for level metering */
  const setupAudioLevels = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      audioStreamRef.current = stream;

      const ctx = new AudioContext();
      await ctx.audioWorklet.addModule("/audio-capture-worklet.js");
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(ctx, "audio-capture-processor");
      workletRef.current = worklet;

      worklet.port.onmessage = (event) => {
        if (event.data.type === "level") {
          setLevel(event.data.level);
        }
      };

      source.connect(worklet);
      worklet.connect(ctx.destination);
    } catch {
      // Fallback: no audio levels
    }
  }, []);

  const startListening = useCallback(async () => {
    setFinal("");
    setInterim("");

    if (useElevenLabs) {
      // Use ElevenLabs Scribe — it handles its own audio capture
      try {
        const handle = await startElevenLabsScribe({
          onPartial: (text) => setInterim(text),
          onCommitted: (text) => {
            setFinal((prev) => (prev ? prev + " " : "") + text);
            setInterim("");
          },
          onLevel: (l) => setLevel(l),
          onError: (err) => {
            console.warn("[VoiceOverlay] ElevenLabs error:", err);
            // Fall back to native
            startNativeFallback();
          },
          onEnd: () => {
            setListening(false);
          },
        });
        handleRef.current = handle;
        setListening(true);
      } catch {
        startNativeFallback();
      }
    } else {
      startNativeFallback();
    }
  }, [useElevenLabs, stt]);

  const startNativeFallback = useCallback(async () => {
    // Set up real audio levels
    await setupAudioLevels();

    const handle = stt.startContinuousNative({
      onInterim: (text) => setInterim(text),
      onFinal: (text) => {
        setFinal(text);
        setInterim("");
      },
      onEnd: async (finalText) => {
        setListening(false);
        const result = finalText.trim();
        if (result.length >= 2) {
          // AI cleanup
          setCleaning(true);
          try {
            const cleaned = await cleanVoiceTranscript(result, "search");
            onSubmit(cleaned);
          } catch {
            onSubmit(result);
          } finally {
            setCleaning(false);
          }
          onClose();
        }
      },
      onError: () => setListening(false),
    });

    handleRef.current = handle;
    setListening(true);
  }, [stt, onSubmit, onClose, setupAudioLevels]);

  const stopListening = useCallback(async () => {
    handleRef.current?.stop();
    handleRef.current = null;
    cleanupAudio();
    setLevel(0);

    // If using ElevenLabs, run cleanup on accumulated text
    if (useElevenLabs && final) {
      setCleaning(true);
      try {
        const cleaned = await cleanVoiceTranscript(final, "search");
        onSubmit(cleaned);
      } catch {
        onSubmit(final);
      } finally {
        setCleaning(false);
      }
      onClose();
    }
  }, [useElevenLabs, final, cleanupAudio, onSubmit, onClose]);

  const handleDownloadWhisper = async () => {
    setWhisperLoading(true);
    setWhisperProgress(0);
    try {
      const engine = getWhisperEngine();
      await engine.load((p: WhisperLoadProgress) => {
        if (p.progress != null) setWhisperProgress(Math.round(p.progress));
      });
      stt.autoSelect();
    } catch {
      // Whisper load failed — stay on current strategy
    } finally {
      setWhisperLoading(false);
    }
  };

  const displayText = cleaning ? "Cleaning up…" : (final || interim);
  const isFinalText = !!final && !interim;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-2xl"
            onClick={() => { stopListening(); onClose(); }}
          />

          {/* Close button */}
          <button
            onClick={() => { stopListening(); onClose(); }}
            className="absolute top-6 right-6 z-10 p-2 rounded-full bg-muted/20 hover:bg-muted/40 text-muted-foreground/60 hover:text-foreground transition-all"
          >
            <X size={20} />
          </button>

          {/* Privacy badge */}
          <motion.div
            className="absolute top-6 left-6 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/20 bg-muted/10"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {privacy === "local" ? (
              <>
                <ShieldCheck size={14} className="text-emerald-400" />
                <span className="text-xs text-emerald-400/80 font-medium">On-device</span>
              </>
            ) : (
              <>
                <Shield size={14} className="text-amber-400" />
                <span className="text-xs text-amber-400/80 font-medium">
                  {useElevenLabs ? "ElevenLabs Scribe" : "Cloud speech"}
                </span>
              </>
            )}
          </motion.div>

          {/* Shortcut hint */}
          <motion.div
            className="absolute top-6 left-1/2 -translate-x-1/2 z-10 text-xs text-muted-foreground/30 font-mono"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Ring (⌘.) → V to toggle • Esc to cancel
          </motion.div>

          {/* Mic orb */}
          <motion.div
            className="relative z-10 flex items-center justify-center"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
          >
            {/* Outer breathing ring — driven by real audio level */}
            {listening && (
              <motion.div
                className="absolute rounded-full border-2 border-primary/20"
                style={{ width: 120 + level * 60, height: 120 + level * 60 }}
                animate={{
                  scale: [1, 1 + level * 0.3, 1],
                  opacity: [0.3, 0.1, 0.3],
                }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            {/* Inner pulsing ring */}
            {listening && (
              <motion.div
                className="absolute w-24 h-24 rounded-full border border-primary/30"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.2, 0.5],
                }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}

            {/* Mic button */}
            <button
              onClick={listening ? stopListening : startListening}
              className={`
                w-20 h-20 rounded-full flex items-center justify-center transition-all
                ${listening
                  ? "bg-primary text-primary-foreground shadow-[0_0_40px_-8px_hsl(var(--primary)/0.5)]"
                  : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                }
              `}
            >
              {listening ? <Mic size={32} /> : <MicOff size={32} />}
            </button>
          </motion.div>

          {/* Live transcript */}
          <motion.div
            className="relative z-10 mt-8 max-w-lg px-6 text-center min-h-[48px]"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {displayText ? (
              <p className={`text-xl font-medium leading-relaxed ${isFinalText || cleaning ? "text-foreground" : "text-foreground/50"}`}>
                {displayText}
                {!isFinalText && !cleaning && (
                  <motion.span
                    className="inline-block w-0.5 h-5 bg-primary/60 ml-1 align-middle"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                )}
              </p>
            ) : listening ? (
              <p className="text-muted-foreground/40 text-lg">Listening…</p>
            ) : (
              <p className="text-muted-foreground/30 text-lg">Tap the mic to start</p>
            )}
          </motion.div>

          {/* Whisper download prompt (only when using cloud) */}
          {!whisperReady && privacy === "cloud" && (
            <motion.div
              className="relative z-10 mt-12"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 0.7 }}
              transition={{ delay: 0.5 }}
            >
              {whisperLoading ? (
                <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-border/20 bg-muted/10">
                  <div className="w-32 h-1.5 rounded-full bg-muted/20 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${whisperProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground/50">{whisperProgress}%</span>
                </div>
              ) : (
                <button
                  onClick={handleDownloadWhisper}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/10 bg-muted/5 text-muted-foreground/40 hover:text-muted-foreground/60 hover:border-border/20 transition-all text-xs"
                >
                  <Download size={12} />
                  Download Whisper (40MB) for private on-device voice
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
