/**
 * MicDiagnostics — Guided microphone check panel
 * ════════════════════════════════════════════════
 *
 * Three-step flow:
 *  1. Device check   — enumerates audio input devices
 *  2. Permission gate — requests mic permission (must be in user gesture)
 *  3. Level meter     — shows live input level so user can verify audio
 *
 * Resolves with "ready" or can be dismissed.
 *
 * @module hologram-ui/components/MicDiagnostics
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, CheckCircle, AlertTriangle, Volume2, X } from "lucide-react";

type Step = "idle" | "checking" | "permission" | "level" | "ready" | "error";

interface MicDiagnosticsProps {
  onReady: () => void;
  onDismiss: () => void;
}

export default function MicDiagnostics({ onReady, onDismiss }: MicDiagnosticsProps) {
  const [step, setStep] = useState<Step>("idle");
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [permState, setPermState] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), []);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (ctxRef.current?.state !== "closed") {
      void ctxRef.current?.close();
    }
    ctxRef.current = null;
  }, []);

  /** Step 1: Check device availability */
  const checkDevices = useCallback(async () => {
    setStep("checking");
    setErrorMsg("");
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === "audioinput");
      setDeviceCount(audioInputs.length);

      if (audioInputs.length === 0) {
        setStep("error");
        setErrorMsg("No microphone found. Please connect a microphone and try again.");
        return;
      }

      // Check permission state
      try {
        const perm = await navigator.permissions.query({ name: "microphone" as PermissionName });
        setPermState(perm.state);
        if (perm.state === "denied") {
          setStep("error");
          setErrorMsg("Microphone access is blocked. Please allow microphone access in your browser settings.");
          return;
        }
      } catch {
        // Some browsers don't support permissions.query for microphone
        setPermState("prompt");
      }

      setStep("permission");
    } catch (err) {
      setStep("error");
      setErrorMsg("Could not check audio devices.");
    }
  }, []);

  /** Step 2: Request permission — MUST be in direct user gesture */
  const requestPermission = useCallback(async () => {
    setStep("checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });

      streamRef.current = stream;
      setPermState("granted");

      // Step 3: Start level meter
      const audioCtx = new AudioContext();
      ctxRef.current = audioCtx;
      const src = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      src.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        setLevel(sum / data.length / 255);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      setStep("level");
    } catch (err: any) {
      cleanup();
      if (err?.name === "NotAllowedError") {
        setStep("error");
        setErrorMsg("Microphone permission was denied. Please allow access in your browser settings.");
      } else if (err?.name === "NotFoundError") {
        setStep("error");
        setErrorMsg("No microphone detected. Please connect one and try again.");
      } else {
        setStep("error");
        setErrorMsg("Failed to access microphone. Please try again.");
      }
    }
  }, [cleanup]);

  /** Step 3 confirmed: mic is ready */
  const confirmReady = useCallback(() => {
    cleanup();
    setStep("ready");
    onReady();
  }, [cleanup, onReady]);

  const handleDismiss = useCallback(() => {
    cleanup();
    onDismiss();
  }, [cleanup, onDismiss]);

  // Level bar segments
  const levelBars = Array.from({ length: 12 }, (_, i) => {
    const threshold = i / 12;
    const active = level > threshold;
    const hue = i < 8 ? 150 - i * 5 : i < 10 ? 45 : 0;
    return (
      <div
        key={i}
        className="rounded-sm transition-all duration-75"
        style={{
          width: "100%",
          height: "4px",
          background: active
            ? `hsla(${hue}, 55%, 55%, 0.85)`
            : "hsla(0, 0%, 30%, 0.2)",
        }}
      />
    );
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
        style={{
          width: "260px",
          padding: "16px",
          borderRadius: "16px",
          background: "hsla(0, 0%, 6%, 0.94)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid hsla(38, 20%, 25%, 0.2)",
          boxShadow: "0 12px 40px hsla(0, 0%, 0%, 0.5)",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 rounded-full p-1 hover:bg-white/5 transition-colors"
          aria-label="Close"
        >
          <X size={12} style={{ color: "hsla(0, 0%, 60%, 0.5)" }} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-4">
          <Mic size={14} style={{ color: "hsla(38, 30%, 70%, 0.7)" }} />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              color: "hsla(38, 15%, 85%, 0.85)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Microphone Setup
          </span>
        </div>

        {/* ── Step: Idle — Start button ── */}
        {step === "idle" && (
          <div className="space-y-3">
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "hsla(0, 0%, 70%, 0.7)",
              lineHeight: 1.5,
            }}>
              We'll check your microphone before starting the conversation.
            </p>
            <button
              onClick={checkDevices}
              className="w-full py-2 rounded-lg text-center transition-all hover:brightness-110"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                color: "hsla(38, 15%, 92%, 0.9)",
                background: "hsla(38, 30%, 25%, 0.4)",
                border: "1px solid hsla(38, 25%, 40%, 0.25)",
                letterSpacing: "0.06em",
              }}
            >
              Check Microphone
            </button>
          </div>
        )}

        {/* ── Step: Checking — spinner ── */}
        {step === "checking" && (
          <div className="flex items-center justify-center py-4">
            <motion.div
              className="rounded-full"
              style={{
                width: "24px",
                height: "24px",
                border: "2px solid hsla(38, 30%, 50%, 0.15)",
                borderTopColor: "hsla(38, 40%, 60%, 0.7)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}

        {/* ── Step: Permission — prompt user to allow ── */}
        {step === "permission" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={13} style={{ color: "hsla(150, 45%, 55%, 0.8)" }} />
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                color: "hsla(150, 30%, 75%, 0.8)",
              }}>
                {deviceCount} microphone{deviceCount !== 1 ? "s" : ""} found
              </span>
            </div>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "hsla(0, 0%, 70%, 0.7)",
              lineHeight: 1.5,
            }}>
              {permState === "granted"
                ? "Permission already granted. Tap below to verify audio input."
                : "Tap below to grant microphone access. Your browser will ask for permission."
              }
            </p>
            <button
              onClick={requestPermission}
              className="w-full py-2 rounded-lg text-center transition-all hover:brightness-110"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                color: "hsla(38, 15%, 92%, 0.9)",
                background: "hsla(150, 25%, 22%, 0.5)",
                border: "1px solid hsla(150, 25%, 40%, 0.25)",
                letterSpacing: "0.06em",
              }}
            >
              {permState === "granted" ? "Verify Input" : "Allow Microphone"}
            </button>
          </div>
        )}

        {/* ── Step: Level — live input meter ── */}
        {step === "level" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={13} style={{ color: "hsla(150, 45%, 55%, 0.8)" }} />
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                color: "hsla(150, 30%, 75%, 0.8)",
              }}>
                Microphone active
              </span>
            </div>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "hsla(0, 0%, 70%, 0.7)",
              lineHeight: 1.5,
            }}>
              Speak into your microphone. The level meter should respond.
            </p>

            {/* Level meter */}
            <div className="flex items-center gap-3">
              <Volume2 size={14} style={{ color: `hsla(${level > 0.05 ? 150 : 0}, 30%, 60%, 0.6)` }} />
              <div className="flex-1 flex flex-col-reverse gap-[2px]" style={{ height: "56px" }}>
                {levelBars}
              </div>
              <span style={{
                fontFamily: "'DM Sans', monospace",
                fontSize: "10px",
                color: "hsla(0, 0%, 65%, 0.5)",
                minWidth: "32px",
                textAlign: "right",
              }}>
                {Math.round(level * 100)}%
              </span>
            </div>

            <button
              onClick={confirmReady}
              className="w-full py-2 rounded-lg text-center transition-all hover:brightness-110"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                color: "hsla(38, 15%, 92%, 0.9)",
                background: level > 0.02
                  ? "hsla(150, 30%, 25%, 0.5)"
                  : "hsla(38, 20%, 22%, 0.4)",
                border: `1px solid ${level > 0.02
                  ? "hsla(150, 30%, 45%, 0.3)"
                  : "hsla(38, 20%, 35%, 0.2)"
                }`,
                letterSpacing: "0.06em",
                transition: "all 0.3s ease",
              }}
            >
              {level > 0.02 ? "Sounds Good — Start" : "Start Anyway"}
            </button>
          </div>
        )}

        {/* ── Step: Error ── */}
        {step === "error" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} style={{ color: "hsla(0, 50%, 60%, 0.8)", flexShrink: 0, marginTop: "2px" }} />
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "hsla(0, 30%, 75%, 0.85)",
                lineHeight: 1.5,
              }}>
                {errorMsg}
              </span>
            </div>
            <button
              onClick={checkDevices}
              className="w-full py-2 rounded-lg text-center transition-all hover:brightness-110"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                color: "hsla(38, 15%, 85%, 0.8)",
                background: "hsla(0, 0%, 15%, 0.4)",
                border: "1px solid hsla(0, 0%, 30%, 0.2)",
                letterSpacing: "0.06em",
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {["device", "permission", "level"].map((s, i) => {
            const stepIdx = step === "idle" || step === "checking" ? 0
              : step === "permission" ? 1
              : step === "level" || step === "ready" ? 2 : -1;
            return (
              <div
                key={s}
                className="rounded-full transition-all duration-300"
                style={{
                  width: stepIdx === i ? "16px" : "5px",
                  height: "5px",
                  background: i <= stepIdx
                    ? `hsla(150, 40%, 55%, ${stepIdx === i ? 0.8 : 0.4})`
                    : "hsla(0, 0%, 30%, 0.25)",
                }}
              />
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
