/**
 * Sovereign Boot — Type Definitions
 * ═══════════════════════════════════════════════════════════════
 *
 * All types for the self-verifying boot sequence and UOR seal.
 * Pure types. Zero runtime.
 *
 * @module boot/types
 */

// ── Boot phases ─────────────────────────────────────────────────────────

export type BootPhase =
  | "idle"
  | "device-fingerprint"
  | "engine-init"
  | "bus-init"
  | "seal"
  | "monitor-start"
  | "complete"
  | "failed";

// ── Device provenance (self-reported) ───────────────────────────────────

export type ExecutionContext = "local" | "remote" | "hybrid";

export interface HardwareProfile {
  readonly cores: number;
  readonly memoryGb: number | null;
  readonly gpu: string | null;
  readonly wasmSupported: boolean;
  readonly simdSupported: boolean;
  readonly touchCapable: boolean;
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly userAgent: string;
}

export interface DeviceProvenance {
  /** Self-reported execution context. */
  readonly context: ExecutionContext;
  /** Origin hostname. */
  readonly hostname: string;
  /** Full origin URL. */
  readonly origin: string;
  /** Hardware profile snapshot. */
  readonly hardware: HardwareProfile;
  /** SHA-256 hex of the provenance object. */
  readonly provenanceHash: string;
}

// ── UOR Seal ────────────────────────────────────────────────────────────

export type SealStatus = "sealed" | "degraded" | "unsealed" | "broken";

export interface UorSeal {
  /** The single derivation ID — THE system proof. */
  readonly derivationId: string;
  /** Braille glyph visual fingerprint. */
  readonly glyph: string;
  /** Ring table hash (SHA-256 of 256 verification results). */
  readonly ringTableHash: string;
  /** Bus manifest hash (SHA-256 of canonical JSON-LD manifest). */
  readonly manifestHash: string;
  /** SHA-256 of the WASM binary bytes (or "ts-fallback" if no WASM). */
  readonly wasmBinaryHash: string;
  /** 16-byte session nonce (hex) for replay protection. */
  readonly sessionNonce: string;
  /** Device provenance hash baked into the seal. */
  readonly deviceContextHash: string;
  /** ISO timestamp of seal creation. */
  readonly bootedAt: string;
  /** Status of the seal. */
  readonly status: SealStatus;
  /** Frozen canonical bytes used for re-verification. */
  readonly canonicalBytes: Uint8Array;
}

// ── Boot receipt ────────────────────────────────────────────────────────

export interface BootReceipt {
  /** The UOR seal. */
  readonly seal: UorSeal;
  /** Device provenance record. */
  readonly provenance: DeviceProvenance;
  /** Engine type that was loaded. */
  readonly engineType: "wasm" | "typescript";
  /** Total boot time in ms. */
  readonly bootTimeMs: number;
  /** Number of bus modules loaded. */
  readonly moduleCount: number;
  /** Timestamp of last successful verification. */
  lastVerified: string;
}

// ── Boot progress callback ──────────────────────────────────────────────

export interface BootProgress {
  readonly phase: BootPhase;
  readonly progress: number; // 0..1
  readonly detail?: string;
}

export type BootProgressCallback = (progress: BootProgress) => void;
