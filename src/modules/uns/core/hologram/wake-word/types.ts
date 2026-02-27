/**
 * WakeWordEngine — Pluggable Wake Word Detection Interface
 * ════════════════════════════════════════════════════════
 *
 * Abstraction layer for wake word detection engines.
 * Implementations:
 *   - PorcupineEngine: High-perf, ~1MB WASM, <20ms latency (requires AccessKey)
 *   - WhisperVadEngine: Sovereign fallback, no API keys, higher latency
 *
 * @module uns/core/hologram/wake-word/types
 */

export type WakeWordBackend = "porcupine" | "whisper-vad";

export type WakeWordStatus =
  | "off"         // Not listening
  | "standby"     // Mic open, passive listening
  | "detecting"   // Speech / keyword detected, processing
  | "checking"    // Running model inference
  | "cooldown";   // Brief pause after detection

export interface WakeWordDetection {
  /** Which backend produced the detection */
  backend: WakeWordBackend;
  /** The keyword/phrase that was detected */
  keyword: string;
  /** Detection timestamp */
  timestamp: number;
  /** Confidence score (0-1), if available */
  confidence?: number;
}

export interface WakeWordEngineCallbacks {
  onDetection: (detection: WakeWordDetection) => void;
  onStatusChange: (status: WakeWordStatus) => void;
  onError: (error: string) => void;
  onAudioLevel?: (level: number) => void;
}

/**
 * Pluggable wake word engine interface.
 * All implementations must satisfy this contract.
 */
export interface IWakeWordEngine {
  /** Which backend this engine uses */
  readonly backend: WakeWordBackend;
  /** Whether the engine is ready to start listening */
  readonly isReady: boolean;
  /** Current status */
  readonly status: WakeWordStatus;

  /**
   * Initialize the engine. May download models, configure mic, etc.
   * Returns true if initialization succeeded.
   */
  init(callbacks: WakeWordEngineCallbacks): Promise<boolean>;

  /** Start listening for the wake word */
  start(): Promise<void>;

  /** Stop listening and release mic */
  stop(): Promise<void>;

  /** Release all resources (WASM, workers, etc.) */
  destroy(): Promise<void>;
}
