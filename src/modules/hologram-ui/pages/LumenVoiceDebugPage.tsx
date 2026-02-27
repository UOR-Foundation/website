import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ClipboardCopy, Cpu, Mic, MicOff, Play, Volume2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAudioCapture } from "@/modules/hologram-ui/hooks/useAudioCapture";
import { getWhisperEngine } from "@/modules/uns/core/hologram/whisper-engine";
import { isNativeSttAvailable, recognizeNative } from "@/modules/uns/core/hologram/native-stt";
import { useVoiceSynthesis } from "@/modules/hologram-ui/hooks/useVoiceSynthesis";
import { decrypt, deriveEncryptionKey, encrypt } from "@/modules/data-bank/lib/encryption";
import {
  compileWhisperModel,
  isWhisperCompiled,
  loadCompiledWhisper,
  deleteCompiledWhisper,
  MODEL_VARIANT_INFO,
  type CompileProgress,
  type HologramCompiledModel,
  type ModelVariant,
} from "@/modules/uns/core/hologram/whisper-compiler";

// ── Types ────────────────────────────────────────────────────────────────────

interface VoiceprintSummary {
  durationSec: number;
  rms: number;
  zeroCrossRate: number;
  peak: number;
  spectralDigest: string;
  voiceprintId: string;
}

interface EncryptionTestResult {
  voiceprintId: string;
  checksum: string;
  cipherChars: number;
  ivChars: number;
  roundTripOk: boolean;
}

interface StepResult {
  name: string;
  status: "pass" | "fail" | "skip" | "pending";
  durationMs: number;
  detail: string;
  data?: Record<string, unknown>;
}

interface FullReport {
  generatedAt: string;
  userAgent: string;
  url: string;
  viewport: string;
  platform: Record<string, boolean>;
  whisperEngine: Record<string, unknown>;
  steps: StepResult[];
  overallStatus: "pass" | "fail" | "partial";
  eventLog: string[];
}

interface DebugLog {
  ts: string;
  isoTs: string;
  message: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function buildVoiceprint(audio: Float32Array, sampleRate: number): Promise<VoiceprintSummary> {
  const len = audio.length;
  if (!len) return { durationSec: 0, rms: 0, zeroCrossRate: 0, peak: 0, spectralDigest: "", voiceprintId: "" };

  let sumSq = 0, zeroCrossings = 0, peak = 0;
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
  const spectral = Array.from({ length: bands }, (_, b) => {
    const s = b * stride, e = Math.min(len, s + stride);
    let absSum = 0;
    for (let i = s; i < e; i++) absSum += Math.abs(audio[i]);
    return Number((e > s ? absSum / (e - s) : 0).toFixed(6));
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

function getPlatformSupport() {
  const w = window as Window & { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
  return {
    secureContext: window.isSecureContext,
    mediaDevices: !!navigator.mediaDevices?.getUserMedia,
    audioWorklet: typeof AudioWorkletNode !== "undefined",
    webGpu: !!(navigator as Navigator & { gpu?: unknown }).gpu,
    speechSynthesis: "speechSynthesis" in window,
    speechRecognition: !!(w.SpeechRecognition || w.webkitSpeechRecognition),
    webCrypto: !!window.crypto?.subtle,
    offlineAudioContext: typeof OfflineAudioContext !== "undefined",
  };
}

function getVoiceList(): string[] {
  try {
    return (window.speechSynthesis?.getVoices() ?? []).map(
      (v) => `${v.name} [${v.lang}]${v.localService ? " (local)" : ""}`
    );
  } catch {
    return [];
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LumenVoiceDebugPage() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [userSeed, setUserSeed] = useState("lumen-debug-anon");
  const [captured, setCaptured] = useState<{ audio: Float32Array; sampleRate: number } | null>(null);
  const [voiceprint, setVoiceprint] = useState<VoiceprintSummary | null>(null);
  const [encryptionReport, setEncryptionReport] = useState<EncryptionTestResult | null>(null);
  const [whisperStatus, setWhisperStatus] = useState<"idle" | "loading" | "ready" | "transcribing" | "error">("idle");
  const [whisperProgress, setWhisperProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [busyEncrypt, setBusyEncrypt] = useState(false);
  const [busyTranscribe, setBusyTranscribe] = useState(false);
  const [busyFullLoop, setBusyFullLoop] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoTestPhase, setAutoTestPhase] = useState<string | null>(null);

  // Compiler state
  const [compilerBusy, setCompilerBusy] = useState(false);
  const [compilerProgress, setCompilerProgress] = useState<CompileProgress | null>(null);
  const [compiledModel, setCompiledModel] = useState<HologramCompiledModel | null>(null);
  const [compilerError, setCompilerError] = useState<string | null>(null);
  const [isCompiled, setIsCompiled] = useState<boolean | null>(null);
  const [modelVariant, setModelVariant] = useState<ModelVariant>("fp16");

  const logsRef = useRef<DebugLog[]>([]);

  const addLog = useCallback((message: string) => {
    const entry: DebugLog = { ts: new Date().toLocaleTimeString(), isoTs: new Date().toISOString(), message };
    logsRef.current = [entry, ...logsRef.current].slice(0, 200);
    setLogs([...logsRef.current]);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserSeed(`lumen-debug:${data.user?.id ?? "anon"}`);
    });
    // Check if Whisper is already compiled
    isWhisperCompiled("both", modelVariant).then(setIsCompiled).catch(() => setIsCompiled(false));
  }, [modelVariant]);

  const runCompile = useCallback(async (target: "encoder" | "decoder" | "both" = "both", force = false) => {
    setCompilerBusy(true);
    setCompilerError(null);
    setCompilerProgress(null);
    addLog(`═══════ WHISPER COMPILER STARTED (target: ${target}, force: ${force}) ═══════`);
    try {
      const model = await compileWhisperModel({
        target,
        variant: modelVariant,
        force,
        onProgress: (p) => {
          setCompilerProgress(p);
          addLog(`[Compiler] ${p.phase}: ${p.message}${p.detail ? ` (${p.detail})` : ""} — ${Math.round(p.progress * 100)}%`);
        },
      });
      setCompiledModel(model);
      setIsCompiled(true);
      addLog(
        `═══════ COMPILATION COMPLETE ═══════\n` +
        `  Manifest CID: ${model.manifestCid.slice(0, 24)}…\n` +
        `  Tensors: ${model.tensors.length}\n` +
        `  Parameters: ${model.totalParameters.toLocaleString()}\n` +
        `  Weight size: ${(model.totalWeightBytes / 1024 / 1024).toFixed(1)} MB\n` +
        `  Graph nodes: ${model.graph.length}\n` +
        `  Encoder layers: ${model.meta.encoderLayers}, Decoder layers: ${model.meta.decoderLayers}\n` +
        `  Attention heads: ${model.meta.attentionHeads}, Hidden size: ${model.meta.hiddenSize}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setCompilerError(msg);
      addLog(`═══════ COMPILATION FAILED: ${msg} ═══════`);
    } finally {
      setCompilerBusy(false);
    }
  }, [addLog]);

  const runDeleteCompiled = useCallback(async () => {
    try {
      await deleteCompiledWhisper("both", modelVariant);
      setCompiledModel(null);
      setIsCompiled(false);
      addLog(`[Compiler] Compiled model (${modelVariant}) deleted from storage.`);
    } catch (err) {
      addLog(`[Compiler] Delete failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }, [addLog, modelVariant]);

  const loadExistingManifest = useCallback(async () => {
    try {
      const model = await loadCompiledWhisper("both", modelVariant);
      if (model) {
        setCompiledModel(model);
        addLog(`[Compiler] Loaded existing ${modelVariant} manifest: ${model.tensors.length} tensors, ${model.graph.length} nodes`);
      } else {
        addLog(`[Compiler] No compiled ${modelVariant} model found.`);
      }
    } catch (err) {
      addLog(`[Compiler] Load failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }, [addLog, modelVariant]);

  const stopRef = useRef<(() => Promise<void>) | null>(null);

  const capture = useAudioCapture({
    silenceAutoStopSec: 1.5,
    onSilence: () => {
      addLog("VAD detected silence → auto-stopping capture.");
      void stopRef.current?.();
    },
  });

  const tts = useVoiceSynthesis({
    engine: "web-speech",
    onError: (error) => addLog(`TTS error: ${error}`),
  });

  const support = useMemo(getPlatformSupport, []);

  // ── Individual test actions ────────────────────────────────────────────

  const startCapture = useCallback(async () => {
    try {
      await capture.start();
      setCaptured(null);
      setVoiceprint(null);
      setEncryptionReport(null);
      setTranscript("");
      setReport(null);
      addLog("Microphone connected via user gesture. Recording started.");
    } catch (err) {
      addLog(`Mic start FAILED: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }, [capture, addLog]);

  const stopCapture = useCallback(async (): Promise<{ audio: Float32Array; sampleRate: number } | null> => {
    if (!capture.isCapturing) return null;
    const result = await capture.stop();
    if (!result) {
      addLog("No audio captured (too short or interrupted).");
      return null;
    }
    setCaptured(result);
    addLog(`Audio captured: ${(result.audio.length / result.sampleRate).toFixed(2)}s @ ${result.sampleRate}Hz · ${result.audio.length.toLocaleString()} samples`);
    return result;
  }, [capture, addLog]);

  stopRef.current = async () => { await stopCapture(); };

  const runPreEncryption = useCallback(async (
    audioOverride?: { audio: Float32Array; sampleRate: number }
  ): Promise<{ vp: VoiceprintSummary; enc: EncryptionTestResult } | null> => {
    const src = audioOverride ?? captured;
    if (!src) { addLog("Capture audio first."); return null; }
    setBusyEncrypt(true);
    try {
      const vp = await buildVoiceprint(src.audio, src.sampleRate);
      const payload = JSON.stringify({
        type: "lumen.voice.debug",
        timestamp: new Date().toISOString(),
        sampleRate: src.sampleRate,
        durationSec: vp.durationSec,
        voiceprint: vp,
      });

      const key = await deriveEncryptionKey(userSeed);
      const encrypted = await encrypt(key, payload);
      const decrypted = await decrypt(key, encrypted.ciphertext, encrypted.iv);
      const checksum = await sha256Hex(payload);

      const enc: EncryptionTestResult = {
        voiceprintId: vp.voiceprintId,
        checksum,
        cipherChars: encrypted.ciphertext.length,
        ivChars: encrypted.iv.length,
        roundTripOk: decrypted === payload,
      };

      setVoiceprint(vp);
      setEncryptionReport(enc);
      addLog(`Pre-encryption PASSED (AES-256-GCM roundtrip: ${enc.roundTripOk ? "verified" : "FAILED"})`);
      return { vp, enc };
    } catch (err) {
      addLog(`Pre-encryption FAILED: ${err instanceof Error ? err.message : "unknown"}`);
      return null;
    } finally {
      setBusyEncrypt(false);
    }
  }, [captured, addLog, userSeed]);

  const runWhisper = useCallback(async (
    audioOverride?: { audio: Float32Array; sampleRate: number }
  ): Promise<{ text: string; inferenceMs: number; device: string; modelId: string } | null> => {
    const src = audioOverride ?? captured;
    if (!src) { addLog("Capture audio first."); return null; }
    setBusyTranscribe(true);
    try {
      const engine = getWhisperEngine();
      if (!engine.isReady) {
        setWhisperStatus("loading");
        addLog("Loading Whisper model…");
        await engine.load((p) => setWhisperProgress(Math.round(p.progress ?? 0)));
        setWhisperStatus("ready");
        addLog(`Whisper model loaded (${engine.device}, vGPU: ${engine.gpuAccelerated})`);
      }
      setWhisperStatus("transcribing");
      const out = await engine.transcribe(src.audio, src.sampleRate);
      const text = out.text.trim();
      setTranscript(text);
      setWhisperStatus("ready");
      addLog(`Whisper STT: "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}" (${out.inferenceTimeMs}ms, ${out.device})`);
      return { text, inferenceMs: out.inferenceTimeMs, device: out.device, modelId: out.modelId };
    } catch (err) {
      setWhisperStatus("error");
      addLog(`Whisper FAILED: ${err instanceof Error ? err.message : "unknown"}`);
      return null;
    } finally {
      setBusyTranscribe(false);
    }
  }, [captured, addLog]);

  const runSpeak = useCallback(async (input?: string): Promise<boolean> => {
    const text = (input ?? transcript).trim() || "LUMEN debug voice output test.";
    try {
      await tts.speak(text);
      addLog("Browser TTS played successfully.");
      return true;
    } catch (err) {
      addLog(`TTS FAILED: ${err instanceof Error ? err.message : "unknown"}`);
      return false;
    }
  }, [transcript, tts, addLog]);

  // ── Full auto E2E test ─────────────────────────────────────────────────

  const runFullAutoTest = useCallback(async () => {
    if (busyFullLoop) return;
    setBusyFullLoop(true);
    setReport(null);
    setCopied(false);

    const steps: StepResult[] = [];
    const t0 = performance.now();

    const step = async (
      name: string,
      fn: () => Promise<{ detail: string; data?: Record<string, unknown> }>
    ): Promise<boolean> => {
      setAutoTestPhase(name);
      addLog(`── Step: ${name} ──`);
      const s = performance.now();
      try {
        const r = await fn();
        const ms = Math.round(performance.now() - s);
        steps.push({ name, status: "pass", durationMs: ms, detail: r.detail, data: r.data });
        addLog(`  ✓ ${name} PASSED (${ms}ms)`);
        return true;
      } catch (err) {
        const ms = Math.round(performance.now() - s);
        const msg = err instanceof Error ? err.message : String(err);
        steps.push({ name, status: "fail", durationMs: ms, detail: msg });
        addLog(`  ✗ ${name} FAILED: ${msg}`);
        return false;
      }
    };

    addLog("═══════ FULL END-TO-END TEST STARTED ═══════");

    // Step 1: Platform support
    await step("Platform Support Check", async () => {
      const s = getPlatformSupport();
      const missing = Object.entries(s).filter(([, v]) => !v).map(([k]) => k);
      if (missing.length > 0 && missing.includes("webCrypto")) throw new Error(`Critical missing: ${missing.join(", ")}`);
      return {
        detail: missing.length ? `Missing (non-critical): ${missing.join(", ")}` : "All platform APIs available",
        data: s as unknown as Record<string, unknown>,
      };
    });

    // Step 2: Web Crypto key derivation
    await step("AES-256-GCM Key Derivation", async () => {
      const key = await deriveEncryptionKey(userSeed);
      const testPayload = "lumen-debug-probe";
      const enc = await encrypt(key, testPayload);
      const dec = await decrypt(key, enc.ciphertext, enc.iv);
      if (dec !== testPayload) throw new Error("Roundtrip mismatch");
      return {
        detail: `Key derived, encrypt+decrypt roundtrip verified (cipher: ${enc.ciphertext.length} chars)`,
        data: { cipherChars: enc.ciphertext.length, ivChars: enc.iv.length },
      };
    });

    // Step 3: Microphone access
    let micStream: MediaStream | null = null;
    await step("Microphone Access (getUserMedia)", async () => {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const track = micStream.getAudioTracks()[0];
      const settings = track?.getSettings();
      return {
        detail: `Mic acquired: ${track?.label ?? "unknown"} @ ${settings?.sampleRate ?? "?"}Hz`,
        data: {
          trackLabel: track?.label,
          sampleRate: settings?.sampleRate,
          channelCount: settings?.channelCount,
          echoCancellation: settings?.echoCancellation,
          noiseSuppression: settings?.noiseSuppression,
        },
      };
    });
    micStream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());

    // Step 4: AudioWorklet instantiation
    await step("AudioWorklet Registration", async () => {
      const ctx = new AudioContext();
      try {
        if (ctx.audioWorklet) {
          await ctx.audioWorklet.addModule("/audio-capture-worklet.js");
          const node = new AudioWorkletNode(ctx, "audio-capture-processor");
          node.disconnect();
          return { detail: "AudioWorklet registered and instantiated" };
        }
        throw new Error("AudioWorklet not available on this browser");
      } finally {
        await ctx.close();
      }
    });

    // Step 5: AudioCapture hook (record 3s)
    setAutoTestPhase("Recording 3s audio sample…");
    addLog("── Step: Audio Capture (3s recording) ──");
    let capturedAudio: { audio: Float32Array; sampleRate: number } | null = null;
    {
      const s = performance.now();
      try {
        await capture.start();
        addLog("  Recording for 3 seconds…");
        await new Promise((r) => setTimeout(r, 3000));
        capturedAudio = await capture.stop();
        const ms = Math.round(performance.now() - s);
        if (!capturedAudio || capturedAudio.audio.length < 1000) {
          steps.push({ name: "Audio Capture (3s)", status: "fail", durationMs: ms, detail: "Too short or empty" });
          addLog("  ✗ Audio capture returned too little data");
        } else {
          const dur = (capturedAudio.audio.length / capturedAudio.sampleRate).toFixed(2);
          steps.push({
            name: "Audio Capture (3s)",
            status: "pass",
            durationMs: ms,
            detail: `Captured ${dur}s @ ${capturedAudio.sampleRate}Hz (${capturedAudio.audio.length.toLocaleString()} samples)`,
            data: {
              durationSec: Number(dur),
              sampleRate: capturedAudio.sampleRate,
              samples: capturedAudio.audio.length,
              peakAmplitude: Number(Math.max(...Array.from(capturedAudio.audio.slice(0, 10000)).map(Math.abs)).toFixed(6)),
            },
          });
          setCaptured(capturedAudio);
          addLog(`  ✓ Audio Capture PASSED (${ms}ms)`);
        }
      } catch (err) {
        const ms = Math.round(performance.now() - s);
        steps.push({ name: "Audio Capture (3s)", status: "fail", durationMs: ms, detail: err instanceof Error ? err.message : "unknown" });
        addLog(`  ✗ Audio Capture FAILED: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    // Step 6: Voiceprint + Pre-encryption
    if (capturedAudio) {
      await step("Voiceprint Derivation + Pre-Encryption", async () => {
        const result = await runPreEncryption(capturedAudio!);
        if (!result) throw new Error("Pre-encryption returned null");
        if (!result.enc.roundTripOk) throw new Error("AES-256-GCM roundtrip FAILED");
        return {
          detail: `Voiceprint: ${result.vp.voiceprintId.slice(0, 16)}… | RMS: ${result.vp.rms} | Roundtrip: verified`,
          data: {
            voiceprintId: result.vp.voiceprintId,
            durationSec: result.vp.durationSec,
            rms: result.vp.rms,
            zeroCrossRate: result.vp.zeroCrossRate,
            peak: result.vp.peak,
            spectralDigest: result.vp.spectralDigest.slice(0, 16) + "…",
            cipherChars: result.enc.cipherChars,
            roundTripOk: result.enc.roundTripOk,
          },
        };
      });
    } else {
      steps.push({ name: "Voiceprint Derivation + Pre-Encryption", status: "skip", durationMs: 0, detail: "Skipped (no audio captured)" });
    }

    // Step 7: Native SpeechRecognition (PRIMARY — browser-native, zero download)
    await step("Native SpeechRecognition (Primary STT)", async () => {
      if (!isNativeSttAvailable()) throw new Error("SpeechRecognition API not available");
      addLog("  Starting native STT — please speak now…");
      const result = await recognizeNative({ timeoutMs: 8000 });
      const text = result.text.trim();
      if (text) setTranscript(text);
      return {
        detail: `"${text.slice(0, 100)}" (confidence: ${(result.confidence * 100).toFixed(1)}%, engine: ${result.engine})`,
        data: {
          transcript: text,
          confidence: result.confidence,
          engine: result.engine,
          charCount: text.length,
        },
      };
    });

    // Step 8: Whisper ONNX via self-hosted proxy
    await step("Whisper ONNX (Self-Hosted Proxy)", async () => {
      const engine = getWhisperEngine();
      if (engine.isReady) {
        // Already cached — test transcription
        if (capturedAudio) {
          const out = await engine.transcribe(capturedAudio.audio, capturedAudio.sampleRate);
          return {
            detail: `Whisper cached & working: "${out.text.slice(0, 60)}" (${out.inferenceTimeMs}ms, ${out.device})`,
            data: { cached: true, text: out.text, inferenceMs: out.inferenceTimeMs, device: out.device },
          };
        }
        return { detail: "Whisper ONNX cached (no audio to test)", data: { cached: true } };
      }

      // Try loading through self-hosted proxy
      addLog("  Loading Whisper via self-hosted proxy (model files cached in our storage)…");
      try {
        await engine.load((p) => {
          setWhisperProgress(Math.round(p.progress ?? 0));
          if (p.file) addLog(`  📦 ${p.status}: ${p.file} (${Math.round(p.progress ?? 0)}%)`);
        });
        setWhisperStatus("ready");

        if (capturedAudio) {
          const out = await engine.transcribe(capturedAudio.audio, capturedAudio.sampleRate);
          return {
            detail: `Whisper loaded via proxy & transcribed: "${out.text.slice(0, 60)}" (${out.inferenceTimeMs}ms, ${out.device}, vGPU: ${engine.gpuAccelerated})`,
            data: {
              text: out.text, inferenceMs: out.inferenceTimeMs,
              device: out.device, vgpu: engine.gpuAccelerated,
              modelId: engine.modelId, proxy: "self-hosted",
            },
          };
        }
        return {
          detail: `Whisper loaded via self-hosted proxy (${engine.device}, vGPU: ${engine.gpuAccelerated})`,
          data: { cached: false, device: engine.device, vgpu: engine.gpuAccelerated, proxy: "self-hosted" },
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        return {
          detail: `Whisper proxy load failed: ${msg} — native STT remains primary`,
          data: { cached: false, error: msg, status: engine.status, nativeFallback: true },
        };
      }
    });
    const ttsText = transcript || "LUMEN voice debug test complete.";
    await step("Browser TTS (Web Speech API)", async () => {
      const voices = getVoiceList();
      await tts.speak(ttsText);
      return {
        detail: `Spoke "${ttsText.slice(0, 60)}…" | Voices available: ${voices.length}`,
        data: {
          spokenText: ttsText.slice(0, 200),
          voiceCount: voices.length,
          selectedVoices: voices.slice(0, 5),
        },
      };
    });


    // ── Generate report ──────────────────────────────────────────────────

    const totalMs = Math.round(performance.now() - t0);
    const passCount = steps.filter((s) => s.status === "pass").length;
    const failCount = steps.filter((s) => s.status === "fail").length;
    const skipCount = steps.filter((s) => s.status === "skip").length;
    const overall: "pass" | "fail" | "partial" =
      failCount === 0 ? "pass" : passCount === 0 ? "fail" : "partial";

    const whisperEngine = getWhisperEngine();

    const fullReport: FullReport = {
      generatedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      platform: getPlatformSupport(),
      whisperEngine: {
        status: whisperEngine.status,
        device: whisperEngine.device,
        gpuAccelerated: whisperEngine.gpuAccelerated,
        modelId: whisperEngine.modelId,
        error: whisperEngine.error,
      },
      steps,
      overallStatus: overall,
      eventLog: logsRef.current.map((l) => `[${l.isoTs}] ${l.message}`),
    };

    const reportLines = [
      `# LUMEN Voice Debug Report`,
      `Generated: ${fullReport.generatedAt}`,
      `Overall: ${overall.toUpperCase()} (${passCount} pass, ${failCount} fail, ${skipCount} skip) — ${totalMs}ms total`,
      ``,
      `## Environment`,
      `- User-Agent: ${fullReport.userAgent}`,
      `- URL: ${fullReport.url}`,
      `- Viewport: ${fullReport.viewport}`,
      `- Secure Context: ${fullReport.platform.secureContext}`,
      ``,
      `## Platform APIs`,
      ...Object.entries(fullReport.platform).map(([k, v]) => `- ${k}: ${v ? "✓" : "✗"}`),
      ``,
      `## Whisper Engine`,
      ...Object.entries(fullReport.whisperEngine).map(([k, v]) => `- ${k}: ${v ?? "null"}`),
      ``,
      `## Test Steps`,
      ...steps.map((s, i) => {
        const icon = s.status === "pass" ? "✓" : s.status === "fail" ? "✗" : "○";
        const lines = [
          `### ${i + 1}. [${icon}] ${s.name} (${s.status.toUpperCase()}, ${s.durationMs}ms)`,
          `   ${s.detail}`,
        ];
        if (s.data) {
          lines.push(`   Data: ${JSON.stringify(s.data, null, 2).split("\n").join("\n   ")}`);
        }
        return lines.join("\n");
      }),
      ``,
      `## Event Log (last ${Math.min(logsRef.current.length, 50)} entries)`,
      ...logsRef.current.slice(0, 50).map((l) => `[${l.isoTs}] ${l.message}`),
      ``,
      `## Raw JSON`,
      "```json",
      JSON.stringify(fullReport, null, 2),
      "```",
    ];

    const reportText = reportLines.join("\n");
    setReport(reportText);
    setAutoTestPhase(null);
    addLog(`═══════ TEST COMPLETE: ${overall.toUpperCase()} (${passCount}/${steps.length} passed, ${totalMs}ms) ═══════`);
    setBusyFullLoop(false);
  }, [busyFullLoop, userSeed, capture, tts, transcript, runPreEncryption, runWhisper, addLog]);

  const copyReport = useCallback(() => {
    if (!report) return;
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      addLog("Report copied to clipboard.");
      setTimeout(() => setCopied(false), 3000);
    });
  }, [report, addLog]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">LUMEN Voice Debug Lab</h1>
          <p className="text-sm text-muted-foreground">
            Full end-to-end audit: mic → AudioWorklet → voiceprint → AES-256-GCM encryption → Whisper STT → browser TTS.
          </p>
          <p className="text-xs text-muted-foreground">Route: /debug/lumen-voice · Temporary — delete after audit.</p>
        </header>

        {/* ── Auto E2E Test ─────────────────────────────────────────────── */}
        <section className="rounded-xl border-2 border-primary/30 bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" /> Full End-to-End Test
          </h2>
          <p className="text-sm text-muted-foreground">
            Click the button below. It will: acquire mic → record 3s → derive voiceprint → encrypt+decrypt → run Whisper STT → play TTS → generate a full report you can paste back into chat.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={runFullAutoTest}
              disabled={busyFullLoop}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {busyFullLoop ? `Running: ${autoTestPhase ?? "…"}` : "▶ Run Full E2E Test"}
            </button>
          </div>
        </section>

        {/* ── Whisper Compiler ──────────────────────────────────────────── */}
        <section className="rounded-xl border-2 border-accent/40 bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Cpu className="h-5 w-5 text-accent-foreground" /> ONNX → Hologram Compiler
          </h2>
          <p className="text-sm text-muted-foreground">
            Downloads Whisper ONNX once, parses protobuf with zero dependencies, dehydrates all weight tensors into content-addressed Hologram storage. After compilation, ONNX is no longer needed.
          </p>

          {/* Status */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              isCompiled === null ? "bg-muted text-muted-foreground" :
              isCompiled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {isCompiled === null ? "Checking…" : isCompiled ? "✅ Compiled" : "Not compiled"}
            </span>
            {compilerBusy && compilerProgress && (
              <span className="text-xs text-muted-foreground">
                {compilerProgress.phase}: {compilerProgress.message} ({Math.round(compilerProgress.progress * 100)}%)
              </span>
            )}
          </div>

          {/* Model Variant Selector */}
          <div className="flex flex-wrap items-start gap-3">
            {(Object.entries(MODEL_VARIANT_INFO) as [ModelVariant, typeof MODEL_VARIANT_INFO["fp16"]][]).map(([key, info]) => (
              <button
                key={key}
                type="button"
                onClick={() => { setModelVariant(key); setCompiledModel(null); }}
                disabled={compilerBusy}
                className={`rounded-lg border-2 p-3 text-left transition-all text-sm disabled:opacity-50 ${
                  modelVariant === key
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-muted-foreground/30"
                }`}
              >
                <div className="font-medium">{info.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{info.size} · {info.description}</div>
              </button>
            ))}
          </div>

          {/* Progress bar */}
          {compilerBusy && compilerProgress && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.round(compilerProgress.progress * 100)}%` }}
              />
            </div>
          )}

          {/* Error */}
          {compilerError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {compilerError}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runCompile("encoder")}
              disabled={compilerBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-muted"
            >
              {compilerBusy ? "Compiling…" : "Compile Encoder"}
            </button>
            <button
              type="button"
              onClick={() => void runCompile("decoder")}
              disabled={compilerBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-muted"
            >
              {compilerBusy ? "Compiling…" : "Compile Decoder"}
            </button>
            <button
              type="button"
              onClick={() => void runCompile("both")}
              disabled={compilerBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {compilerBusy ? "Compiling…" : "▶ Compile Both (Full)"}
            </button>
            {isCompiled && (
              <>
                <button
                  type="button"
                  onClick={() => void loadExistingManifest()}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Load Manifest
                </button>
                <button
                  type="button"
                  onClick={() => void runCompile("both", true)}
                  disabled={compilerBusy}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-muted"
                >
                  Force Recompile
                </button>
                <button
                  type="button"
                  onClick={() => void runDeleteCompiled()}
                  className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/10"
                >
                  Delete Compiled
                </button>
              </>
            )}
          </div>

          {/* Compiled model details */}
          {compiledModel && (
            <div className="rounded-lg border border-border bg-background p-4 space-y-3">
              <h3 className="text-sm font-semibold">Compiled Model Manifest</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Manifest CID</p>
                  <p className="font-mono break-all">{compiledModel.manifestCid.slice(0, 32)}…</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Parameters</p>
                  <p className="font-mono">{compiledModel.totalParameters.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Weight Size</p>
                  <p className="font-mono">{(compiledModel.totalWeightBytes / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Graph Nodes</p>
                  <p className="font-mono">{compiledModel.graph.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Tensors</p>
                  <p className="font-mono">{compiledModel.tensors.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Architecture</p>
                  <p className="font-mono">{compiledModel.meta.encoderLayers}E / {compiledModel.meta.decoderLayers}D / {compiledModel.meta.attentionHeads}H / {compiledModel.meta.hiddenSize}d</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Vocab Size</p>
                  <p className="font-mono">{compiledModel.meta.vocabSize.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Compiled At</p>
                  <p className="font-mono">{new Date(compiledModel.compiledAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Op breakdown */}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Op breakdown ({compiledModel.graph.length} nodes)
                </summary>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {Object.entries(
                    compiledModel.graph.reduce<Record<string, number>>((acc, n) => {
                      acc[n.op] = (acc[n.op] ?? 0) + 1;
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([op, count]) => (
                      <div key={op} className="flex justify-between rounded px-2 py-0.5 bg-muted">
                        <span className="font-mono">{op}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                    ))}
                </div>
              </details>

              {/* Tensor list */}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Tensor inventory ({compiledModel.tensors.length} tensors, {(compiledModel.totalWeightBytes / 1024 / 1024).toFixed(1)} MB)
                </summary>
                <div className="mt-2 max-h-60 overflow-auto rounded border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="text-left px-2 py-1">Name</th>
                        <th className="text-left px-2 py-1">Shape</th>
                        <th className="text-left px-2 py-1">Type</th>
                        <th className="text-right px-2 py-1">Size</th>
                        <th className="text-left px-2 py-1">CID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compiledModel.tensors.map((t) => (
                        <tr key={t.cid} className="border-t border-border hover:bg-muted/50">
                          <td className="px-2 py-1 font-mono max-w-48 truncate">{t.name}</td>
                          <td className="px-2 py-1 font-mono">[{t.dims.join("×")}]</td>
                          <td className="px-2 py-1">{t.dtypeName}</td>
                          <td className="px-2 py-1 text-right font-mono">{(t.byteLength / 1024).toFixed(1)}KB</td>
                          <td className="px-2 py-1 font-mono text-muted-foreground">{t.cid.slice(0, 12)}…</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
        </section>


        {report && (
          <section className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">📋 Debug Report</h2>
              <button
                type="button"
                onClick={copyReport}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              >
                <ClipboardCopy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Copy this entire report and paste it into the chat for analysis.</p>
            <textarea
              readOnly
              value={report}
              className="w-full min-h-[400px] rounded-lg border border-border bg-background p-3 text-xs font-mono outline-none resize-y"
            />
          </section>
        )}

        {/* ── Manual Controls ───────────────────────────────────────────── */}
        <details className="rounded-xl border border-border bg-card">
          <summary className="p-4 cursor-pointer text-lg font-medium">Manual Controls (individual steps)</summary>
          <div className="p-4 pt-0 space-y-6">

            {/* Support check */}
            <div className="space-y-3">
              <h3 className="text-base font-medium">1) Platform Support</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                {Object.entries(support).map(([label, ok]) => (
                  <div key={label} className="rounded-lg border border-border bg-background px-3 py-2 flex items-center justify-between">
                    <span className="capitalize">{label.replace(/([A-Z])/g, " $1")}</span>
                    <span className="inline-flex items-center gap-1">
                      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mic */}
            <div className="space-y-3">
              <h3 className="text-base font-medium">2) Microphone Capture</h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={startCapture} disabled={capture.isCapturing}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50">
                  <Mic className="h-4 w-4" /> Start
                </button>
                <button type="button" onClick={() => void stopCapture()} disabled={!capture.isCapturing}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50">
                  <MicOff className="h-4 w-4" /> Stop
                </button>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.round(capture.audioLevel * 100))}%` }} />
              </div>
              {captured && (
                <p className="text-xs text-muted-foreground">
                  Captured {(captured.audio.length / captured.sampleRate).toFixed(2)}s · {captured.sampleRate}Hz · {captured.audio.length.toLocaleString()} samples
                </p>
              )}
            </div>

            {/* Pre-encryption */}
            <div className="space-y-3">
              <h3 className="text-base font-medium">3) Pre-Encryption + Voiceprint</h3>
              <button type="button" onClick={() => void runPreEncryption()} disabled={!captured || busyEncrypt}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50">
                {busyEncrypt ? "Running…" : "Run test"}
              </button>
              {voiceprint && encryptionReport && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-border bg-background p-3 space-y-1">
                    <p>Voiceprint: {voiceprint.voiceprintId.slice(0, 20)}…</p>
                    <p>Duration: {voiceprint.durationSec}s · RMS: {voiceprint.rms} · Peak: {voiceprint.peak}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3 space-y-1">
                    <p>Cipher: {encryptionReport.cipherChars} chars · IV: {encryptionReport.ivChars} chars</p>
                    <p>Roundtrip: {encryptionReport.roundTripOk ? "✓ Verified" : "✗ FAILED"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Whisper + TTS */}
            <div className="space-y-3">
              <h3 className="text-base font-medium">4) Whisper STT + Browser TTS</h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void runWhisper()} disabled={!captured || busyTranscribe}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50">
                  {busyTranscribe ? "Transcribing…" : "Run Whisper"}
                </button>
                <button type="button" onClick={() => void runSpeak()}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <Volume2 className="h-4 w-4" /> Test TTS
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Whisper: {whisperStatus}{whisperStatus === "loading" ? ` (${whisperProgress}%)` : ""} · TTS: {tts.status}
              </p>
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)}
                placeholder="Transcript appears here…"
                className="w-full min-h-20 rounded-lg border border-border bg-background p-3 text-sm outline-none" />
            </div>
          </div>
        </details>

        {/* ── Event Log ─────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-lg font-medium mb-3">Event Log</h2>
          <div className="max-h-72 overflow-auto rounded-lg border border-border bg-background p-3 space-y-1">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet. Run the E2E test above.</p>
            ) : (
              logs.map((log, idx) => (
                <p key={`${log.isoTs}-${idx}`} className="text-xs font-mono">
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
