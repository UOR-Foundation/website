/**
 * Wake Word Engine — Pluggable Detection System
 * ══════════════════════════════════════════════
 *
 * Auto-selects the best available wake word engine:
 *   1. Porcupine (if AccessKey available) — <20ms, ~1MB WASM
 *   2. Whisper VAD (sovereign fallback)   — ~2-3s, no API keys
 *
 * Usage:
 *   const engine = await createWakeWordEngine({ accessKey: "..." });
 *   await engine.init(callbacks);
 *   await engine.start();
 *
 * @module uns/core/hologram/wake-word
 */

export type { IWakeWordEngine, WakeWordDetection, WakeWordEngineCallbacks, WakeWordStatus, WakeWordBackend } from "./types";
export { PorcupineWakeWordEngine, type PorcupineEngineConfig, type PorcupineBuiltinKeyword } from "./porcupine-engine";
export { WhisperVadWakeWordEngine, type WhisperVadConfig } from "./whisper-vad-engine";

import type { IWakeWordEngine } from "./types";
import { PorcupineWakeWordEngine, type PorcupineEngineConfig } from "./porcupine-engine";
import { WhisperVadWakeWordEngine, type WhisperVadConfig } from "./whisper-vad-engine";

export interface CreateWakeWordEngineOptions {
  /** Picovoice AccessKey — if provided, Porcupine is used as primary */
  accessKey?: string;
  /** Porcupine keyword config (only used if accessKey is provided) */
  porcupineKeywords?: PorcupineEngineConfig["keywords"];
  /** Porcupine model config */
  porcupineModel?: PorcupineEngineConfig["model"];
  /** Whisper VAD config (used for fallback or if no accessKey) */
  whisperConfig?: WhisperVadConfig;
  /** Force a specific backend */
  forceBackend?: "porcupine" | "whisper-vad";
}

/**
 * Create the best available wake word engine.
 * Porcupine is preferred when an AccessKey is available.
 */
export function createWakeWordEngine(
  options: CreateWakeWordEngineOptions = {},
): IWakeWordEngine {
  const {
    accessKey,
    porcupineKeywords,
    porcupineModel,
    whisperConfig,
    forceBackend,
  } = options;

  // Force specific backend
  if (forceBackend === "porcupine" && accessKey) {
    console.log("[WakeWord] Forced: Porcupine");
    return new PorcupineWakeWordEngine({
      accessKey,
      keywords: porcupineKeywords ?? [{ builtin: "Jarvis" as const, sensitivity: 0.65 }],
      model: porcupineModel,
    });
  }
  if (forceBackend === "whisper-vad") {
    console.log("[WakeWord] Forced: Whisper VAD (sovereign)");
    return new WhisperVadWakeWordEngine(whisperConfig);
  }

  // Auto-select: Porcupine if we have a key, else Whisper VAD
  if (accessKey) {
    console.log("[WakeWord] Auto-selected: Porcupine (access key available)");
    return new PorcupineWakeWordEngine({
      accessKey,
      keywords: porcupineKeywords ?? [{ builtin: "Jarvis" as const, sensitivity: 0.65 }],
      model: porcupineModel,
    });
  }

  console.log("[WakeWord] Auto-selected: Whisper VAD (no access key — sovereign fallback)");
  return new WhisperVadWakeWordEngine(whisperConfig);
}
