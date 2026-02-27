/**
 * PorcupineWakeWordEngine — Picovoice Porcupine Adapter
 * ═════════════════════════════════════════════════════
 *
 * High-performance wake word detection using Porcupine WASM.
 * ~1MB model, <20ms latency, ~2% CPU usage.
 *
 * Requires a Picovoice AccessKey (fetched securely from edge function).
 * Supports both built-in keywords (Jarvis, Computer, etc.) and
 * custom .ppn keywords (e.g., "a-lumina") trained via Picovoice Console.
 *
 * @module uns/core/hologram/wake-word/porcupine-engine
 */

import type {
  IWakeWordEngine,
  WakeWordEngineCallbacks,
  WakeWordStatus,
} from "./types";
import { unzipSync } from "fflate";

/** Extract .ppn from a zip, return base64 */
async function extractPpnFromZip(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = new Uint8Array(await res.arrayBuffer());
  const files = unzipSync(buf);
  const ppnKey = Object.keys(files).find(k => k.endsWith(".ppn"));
  if (!ppnKey) throw new Error("No .ppn file found in zip");
  const ppnBytes = files[ppnKey];
  // Convert to base64
  let binary = "";
  for (let i = 0; i < ppnBytes.length; i++) binary += String.fromCharCode(ppnBytes[i]);
  return btoa(binary);
}

// Built-in keywords from Porcupine
const PORCUPINE_BUILTINS = [
  "Alexa", "Americano", "Blueberry", "Bumblebee", "Computer",
  "Grapefruit", "Grasshopper", "Hey Google", "Hey Siri", "Jarvis",
  "Okay Google", "Picovoice", "Porcupine", "Terminator",
] as const;

export type PorcupineBuiltinKeyword = typeof PORCUPINE_BUILTINS[number];

export interface PorcupineEngineConfig {
  /** AccessKey from Picovoice Console */
  accessKey: string;
  /**
   * Keywords to listen for.
   * Can be built-in names, or custom keyword configs with base64 or publicPath.
   */
  keywords: Array<
    | { builtin: PorcupineBuiltinKeyword; sensitivity?: number }
    | { base64: string; label: string; sensitivity?: number }
    | { publicPath: string; label: string; sensitivity?: number }
  >;
  /** Porcupine model file — defaults to built-in English */
  model?: { publicPath?: string; base64?: string };
}

export class PorcupineWakeWordEngine implements IWakeWordEngine {
  readonly backend = "porcupine" as const;

  private _status: WakeWordStatus = "off";
  private _callbacks: WakeWordEngineCallbacks | null = null;
  private _config: PorcupineEngineConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _porcupine: any = null;
  private _ready = false;

  constructor(config: PorcupineEngineConfig) {
    this._config = config;
  }

  get isReady() { return this._ready; }
  get status() { return this._status; }

  private _setStatus(s: WakeWordStatus) {
    this._status = s;
    this._callbacks?.onStatusChange(s);
  }

  async init(callbacks: WakeWordEngineCallbacks): Promise<boolean> {
    this._callbacks = callbacks;

    try {
      const { PorcupineWorker, BuiltInKeyword } = await import("@picovoice/porcupine-web");
      type PorcupineKeywordType = import("@picovoice/porcupine-web").PorcupineKeyword;
      type PorcupineModelType = import("@picovoice/porcupine-web").PorcupineModel;

      // Map keywords to Porcupine's expected types
      type BuiltInKeywordType = import("@picovoice/porcupine-web").BuiltInKeyword;
      const keywords: Array<PorcupineKeywordType | BuiltInKeywordType> = [];
      for (const kw of this._config.keywords) {
          if ("builtin" in kw) {
            const enumKey = kw.builtin.replace(/\s/g, "") as keyof typeof BuiltInKeyword;
            keywords.push(BuiltInKeyword[enumKey]);
          } else if ("publicPath" in kw) {
            // If it's a .zip, extract the .ppn and use base64
            if (kw.publicPath.endsWith(".zip")) {
              const b64 = await extractPpnFromZip(kw.publicPath);
              keywords.push({
                base64: b64,
                label: kw.label,
                sensitivity: kw.sensitivity ?? 0.65,
              } as PorcupineKeywordType);
            } else {
              keywords.push({
                publicPath: kw.publicPath,
                label: kw.label,
                sensitivity: kw.sensitivity ?? 0.65,
              } as PorcupineKeywordType);
            }
          } else {
            keywords.push({
              base64: kw.base64,
              label: kw.label,
              sensitivity: kw.sensitivity ?? 0.65,
            } as PorcupineKeywordType);
          }
      }

      // Model — use default English model from public directory
      const model: PorcupineModelType = this._config.model ?? {
        publicPath: "/porcupine_params.pv",
      };

      this._porcupine = await PorcupineWorker.create(
        this._config.accessKey,
        keywords,
        (detection) => {
          console.log(`[Porcupine] 🎯 Detected: "${detection.label}" (index: ${detection.index})`);
          this._setStatus("detecting");

          this._callbacks?.onDetection({
            backend: "porcupine",
            keyword: detection.label,
            timestamp: Date.now(),
            confidence: 1.0, // Porcupine is binary detection
          });

          // Brief cooldown to avoid double-trigger
          setTimeout(() => {
            if (this._status === "detecting") this._setStatus("standby");
          }, 1500);
        },
        model,
        {
          processErrorCallback: (error) => {
            console.error("[Porcupine] Process error:", error);
            this._callbacks?.onError(String(error));
          },
        },
      );

      this._ready = true;
      console.log(`[Porcupine] ✓ Initialized (v${this._porcupine.version}, frameLen=${this._porcupine.frameLength}, sampleRate=${this._porcupine.sampleRate})`);
      return true;
    } catch (err) {
      console.error("[Porcupine] Init failed:", err);
      this._callbacks?.onError(`Porcupine init failed: ${err}`);
      return false;
    }
  }

  async start(): Promise<void> {
    if (!this._porcupine || !this._ready) {
      this._callbacks?.onError("Porcupine not initialized");
      return;
    }

    try {
      const { WebVoiceProcessor } = await import("@picovoice/web-voice-processor");
      await WebVoiceProcessor.subscribe(this._porcupine);
      this._setStatus("standby");
      console.log("[Porcupine] 🎤 Listening for wake word...");
    } catch (err) {
      console.error("[Porcupine] Start failed:", err);
      this._callbacks?.onError(`Porcupine start failed: ${err}`);
    }
  }

  async stop(): Promise<void> {
    if (!this._porcupine) return;

    try {
      const { WebVoiceProcessor } = await import("@picovoice/web-voice-processor");
      await WebVoiceProcessor.unsubscribe(this._porcupine);
      this._setStatus("off");
      console.log("[Porcupine] ⏹ Stopped listening");
    } catch (err) {
      console.error("[Porcupine] Stop error:", err);
    }
  }

  async destroy(): Promise<void> {
    await this.stop();
    if (this._porcupine) {
      try {
        await this._porcupine.release();
      } catch {
        this._porcupine.terminate();
      }
      this._porcupine = null;
    }
    this._ready = false;
    this._callbacks = null;
  }
}
