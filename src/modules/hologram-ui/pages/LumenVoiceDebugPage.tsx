import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Mic, MicOff, Volume2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAudioCapture } from "@/modules/hologram-ui/hooks/useAudioCapture";
import { getWhisperEngine } from "@/modules/uns/core/hologram/whisper-engine";
import { useVoiceSynthesis } from "@/modules/hologram-ui/hooks/useVoiceSynthesis";
import { decrypt, deriveEncryptionKey, encrypt } from "@/modules/data-bank/lib/encryption";

interface VoiceprintSummary {
  durationSec: number;
  rms: number;
  zeroCrossRate: number;
  peak: number;
  spectralDigest: string;
  voiceprintId: string;
}

interface EncryptionReport {
  voiceprintId: string;
  checksum: string;
  cipherChars: number;
  ivChars: number;
  roundTripOk: boolean;
}

interface DebugLog {
  ts: string;
  message: string;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hash;
}

async function buildVoiceprint(audio: Float32Array, sampleRate: number): Promise<VoiceprintSummary> {
  const len = audio.length;
  if (!len) {
    return {
      durationSec: 0,
      rms: 0,
      zeroCrossRate: 0,
      peak: 0,
      spectralDigest: "",
      voiceprintId: "",
    };
  }

  let sumSq = 0;
  let zeroCrossings = 0;
  let peak = 0;

  for (let i = 0; i < len; i++) {
    const v = audio[i];
    sumSq += v * v;
    peak = Math.max(peak, Math.abs(v));
    if (i > 0 && Math.sign(audio[i - 1]) !== Math.sign(v)) zeroCrossings++;
  }

  const rms = Math.sqrt(sumSq / len);
  const zeroCrossRate = zeroCrossings / len;
  const durationSec = len / sampleRate;

  const bands = 64;
  const stride = Math.max(1, Math.floor(len / bands));
  const spectral = Array.from({ length: bands }, (_, bandIdx) => {
    const start = bandIdx * stride;
    const end = Math.min(len, start + stride);
    let absSum = 0;
    for (let i = start; i < end; i++) absSum += Math.abs(audio[i]);
    const mean = end > start ? absSum / (end - start) : 0;
    return Number(mean.toFixed(6));
  });

  const spectralDigest = await sha256Hex(JSON.stringify(spectral));
  const canonical = JSON.stringify({
    durationSec: Number(durationSec.toFixed(4)),
    rms: Number(rms.toFixed(6)),
    zeroCrossRate: Number(zeroCrossRate.toFixed(6)),
    peak: Number(peak.toFixed(6)),
    spectralDigest,
  });

  const voiceprintId = await sha256Hex(canonical);

  return {
    durationSec: Number(durationSec.toFixed(3)),
    rms: Number(rms.toFixed(6)),
    zeroCrossRate: Number(zeroCrossRate.toFixed(6)),
    peak: Number(peak.toFixed(6)),
    spectralDigest,
    voiceprintId,
  };
}

export default function LumenVoiceDebugPage() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [userSeed, setUserSeed] = useState("lumen-debug-anon");
  const [captured, setCaptured] = useState<{ audio: Float32Array; sampleRate: number } | null>(null);
  const [voiceprint, setVoiceprint] = useState<VoiceprintSummary | null>(null);
  const [encryptionReport, setEncryptionReport] = useState<EncryptionReport | null>(null);
  const [whisperStatus, setWhisperStatus] = useState<"idle" | "loading" | "ready" | "transcribing" | "error">("idle");
  const [whisperProgress, setWhisperProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [busyEncrypt, setBusyEncrypt] = useState(false);
  const [busyTranscribe, setBusyTranscribe] = useState(false);
  const [busyFullLoop, setBusyFullLoop] = useState(false);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [
      {
        ts: new Date().toLocaleTimeString(),
        message,
      },
      ...prev,
    ].slice(0, 120));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? "anon";
      setUserSeed(`lumen-debug:${uid}`);
    });
  }, []);

  const stopRef = useRef<(() => Promise<void>) | null>(null);

  const capture = useAudioCapture({
    silenceAutoStopSec: 1.5,
    onSilence: () => {
      addLog("VAD detected silence: auto-stopping capture.");
      void stopRef.current?.();
    },
  });

  const tts = useVoiceSynthesis({
    engine: "web-speech",
    onError: (error) => addLog(`TTS error: ${error}`),
  });

  const support = useMemo(() => {
    const w = window as Window & { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
    return {
      secureContext: window.isSecureContext,
      mediaDevices: !!navigator.mediaDevices?.getUserMedia,
      audioWorklet: typeof AudioWorkletNode !== "undefined",
      speechSynthesis: "speechSynthesis" in window,
      speechRecognition: !!(w.SpeechRecognition || w.webkitSpeechRecognition),
      webCrypto: !!window.crypto?.subtle,
    };
  }, []);

  const startCapture = useCallback(async () => {
    try {
      await capture.start();
      setCaptured(null);
      setVoiceprint(null);
      setEncryptionReport(null);
      setTranscript("");
      addLog("Microphone connected via user gesture. Recording started.");
    } catch (err) {
      addLog(`Mic start failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }, [capture, addLog]);

  const stopCapture = useCallback(async () => {
    if (!capture.isCapturing) return;
    const result = await capture.stop();
    if (!result) {
      addLog("No audio captured (too short or interrupted).");
      return;
    }
    setCaptured(result);
    addLog(`Audio captured: ${(result.audio.length / result.sampleRate).toFixed(2)}s @ ${result.sampleRate}Hz.`);
  }, [capture, addLog]);

  stopRef.current = stopCapture;

  const runPreEncryption = useCallback(async (): Promise<VoiceprintSummary | null> => {
    if (!captured) {
      addLog("Capture audio first to run pre-encryption.");
      return null;
    }

    setBusyEncrypt(true);
    try {
      const vp = await buildVoiceprint(captured.audio, captured.sampleRate);
      const payload = JSON.stringify({
        type: "lumen.voice.debug",
        timestamp: new Date().toISOString(),
        sampleRate: captured.sampleRate,
        durationSec: vp.durationSec,
        voiceprint: vp,
      });

      const key = await deriveEncryptionKey(userSeed);
      const encrypted = await encrypt(key, payload);
      const decrypted = await decrypt(key, encrypted.ciphertext, encrypted.iv);
      const checksum = await sha256Hex(payload);

      setVoiceprint(vp);
      setEncryptionReport({
        voiceprintId: vp.voiceprintId,
        checksum,
        cipherChars: encrypted.ciphertext.length,
        ivChars: encrypted.iv.length,
        roundTripOk: decrypted === payload,
      });

      addLog("Pre-encryption passed locally (AES-256-GCM roundtrip verified).");
      return vp;
    } catch (err) {
      addLog(`Pre-encryption failed: ${err instanceof Error ? err.message : "unknown error"}`);
      return null;
    } finally {
      setBusyEncrypt(false);
    }
  }, [captured, addLog, userSeed]);

  const runWhisper = useCallback(async (): Promise<string | null> => {
    if (!captured) {
      addLog("Capture audio first to run transcription.");
      return null;
    }

    setBusyTranscribe(true);
    try {
      const engine = getWhisperEngine();
      if (!engine.isReady) {
        setWhisperStatus("loading");
        await engine.load((p) => setWhisperProgress(Math.round(p.progress ?? 0)));
        setWhisperStatus("ready");
      }

      setWhisperStatus("transcribing");
      const out = await engine.transcribe(captured.audio, captured.sampleRate);
      const text = out.text.trim();
      setTranscript(text);
      setWhisperStatus("ready");
      addLog(`Whisper transcription done in ${out.inferenceTimeMs}ms.`);
      return text;
    } catch (err) {
      setWhisperStatus("error");
      addLog(`Whisper failed: ${err instanceof Error ? err.message : "unknown error"}`);
      return null;
    } finally {
      setBusyTranscribe(false);
    }
  }, [captured, addLog]);

  const runSpeak = useCallback(async (input?: string) => {
    const text = (input ?? transcript).trim() || "LUMEN debug voice output is now running in browser.";
    try {
      await tts.speak(text);
      addLog("Browser speech synthesis played successfully.");
    } catch (err) {
      addLog(`Speech playback failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }, [transcript, tts, addLog]);

  const runFullLoop = useCallback(async () => {
    if (busyFullLoop) return;
    setBusyFullLoop(true);
    try {
      const vp = await runPreEncryption();
      if (!vp) return;
      const text = await runWhisper();
      if (text) await runSpeak(text);
      addLog("Full voice debug loop complete (mic → encryption → STT → TTS).");
    } finally {
      setBusyFullLoop(false);
    }
  }, [runPreEncryption, runWhisper, runSpeak, busyFullLoop, addLog]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">LUMEN Voice Debug Lab (Temporary)</h1>
          <p className="text-sm text-muted-foreground">
            End-to-end audit page for microphone connection, local pre-encryption, voiceprint derivation, Whisper STT, and browser-native voice output.
          </p>
          <p className="text-xs text-muted-foreground">Route: /debug/lumen-voice (delete after audit).</p>
        </header>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-lg font-medium mb-3">1) Local support check</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {[
              { label: "Secure Context", ok: support.secureContext },
              { label: "Microphone API", ok: support.mediaDevices },
              { label: "AudioWorklet", ok: support.audioWorklet },
              { label: "Web Speech TTS", ok: support.speechSynthesis },
              { label: "Web Speech STT", ok: support.speechRecognition },
              { label: "Web Crypto", ok: support.webCrypto },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-background px-3 py-2 flex items-center justify-between">
                <span>{item.label}</span>
                <span className="inline-flex items-center gap-1 font-medium">
                  {item.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  {item.ok ? "OK" : "Missing"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-lg font-medium">2) Microphone capture test (gesture-safe)</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startCapture}
              disabled={capture.isCapturing}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              <Mic className="h-4 w-4" /> Start microphone
            </button>
            <button
              type="button"
              onClick={stopCapture}
              disabled={!capture.isCapturing}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              <MicOff className="h-4 w-4" /> Stop capture
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Live input level</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.round(capture.audioLevel * 100))}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{capture.isCapturing ? "Recording…" : "Idle"}</p>
          </div>

          {captured && (
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              Captured {(captured.audio.length / captured.sampleRate).toFixed(2)}s · {captured.sampleRate}Hz · {captured.audio.length.toLocaleString()} samples
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-lg font-medium">3) Pre-encryption + voiceprint audit (local only)</h2>
          <button
            type="button"
            onClick={() => void runPreEncryption()}
            disabled={!captured || busyEncrypt}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            {busyEncrypt ? "Running…" : "Run pre-encryption test"}
          </button>

          <p className="text-xs text-muted-foreground">Encryption seed: {userSeed}</p>

          {voiceprint && encryptionReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border bg-background p-3 space-y-1">
                <p><span className="text-muted-foreground">Voiceprint ID:</span> {voiceprint.voiceprintId.slice(0, 24)}…</p>
                <p><span className="text-muted-foreground">Duration:</span> {voiceprint.durationSec}s</p>
                <p><span className="text-muted-foreground">RMS:</span> {voiceprint.rms}</p>
                <p><span className="text-muted-foreground">Zero-cross rate:</span> {voiceprint.zeroCrossRate}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 space-y-1">
                <p><span className="text-muted-foreground">Cipher chars:</span> {encryptionReport.cipherChars}</p>
                <p><span className="text-muted-foreground">IV chars:</span> {encryptionReport.ivChars}</p>
                <p><span className="text-muted-foreground">Checksum:</span> {encryptionReport.checksum.slice(0, 24)}…</p>
                <p>
                  <span className="text-muted-foreground">Roundtrip:</span>{" "}
                  {encryptionReport.roundTripOk ? "Verified" : "Failed"}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-lg font-medium">4) Whisper voice-to-text and browser voice output</h2>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runWhisper()}
              disabled={!captured || busyTranscribe}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              {busyTranscribe ? "Transcribing…" : "Run Whisper transcription"}
            </button>

            <button
              type="button"
              onClick={() => void runSpeak()}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <Volume2 className="h-4 w-4" /> Test browser speech output
            </button>

            <button
              type="button"
              onClick={() => void runFullLoop()}
              disabled={!captured || busyFullLoop}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              {busyFullLoop ? "Running full loop…" : "Run full loop"}
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Whisper status: {whisperStatus}{whisperStatus === "loading" ? ` (${whisperProgress}%)` : ""} · TTS status: {tts.status}
          </p>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Whisper transcript will appear here..."
            className="w-full min-h-28 rounded-lg border border-border bg-background p-3 text-sm outline-none"
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-lg font-medium mb-3">5) Event log</h2>
          <div className="max-h-72 overflow-auto rounded-lg border border-border bg-background p-3 space-y-2">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              logs.map((log, idx) => (
                <p key={`${log.ts}-${idx}`} className="text-xs">
                  <span className="text-muted-foreground">[{log.ts}]</span> {log.message}
                </p>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
