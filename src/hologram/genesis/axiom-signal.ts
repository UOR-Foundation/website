/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  AXIOM-SIGNAL  —  Zero-Dependency Event Kernel          ║
 * ║                                                          ║
 * ║  The kernel's nervous system. Every subsystem emits      ║
 * ║  signals through this single channel. Observers can      ║
 * ║  subscribe to watch the kernel think.                    ║
 * ║                                                          ║
 * ║  Nature's pattern: one signaling molecule, many          ║
 * ║  receptors. Abundance from scarcity.                     ║
 * ║                                                          ║
 * ║  This file has ZERO external dependencies.               ║
 * ╚══════════════════════════════════════════════════════════╝
 */

// ── Types ─────────────────────────────────────────────────

export type SignalSource =
  | "ring" | "hash" | "cid" | "codec" | "mirror" | "post"
  | "identity" | "hologram" | "certificate" | "sovereignty"
  | "agent" | "mesh" | "ipc" | "net" | "fs" | "ecc";

export interface Signal {
  readonly source: SignalSource;
  readonly operation: string;
  readonly inputBytes: Uint8Array;
  readonly outputBytes: Uint8Array;
  readonly timestamp: number;
}

export type SignalListener = (signal: Signal) => void;

// ── Signal Bus (singleton, zero deps) ─────────────────────

class SignalBus {
  private listeners = new Set<SignalListener>();
  private enabled = true;
  private count = 0;

  subscribe(listener: SignalListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(
    source: SignalSource,
    operation: string,
    inputBytes: Uint8Array,
    outputBytes: Uint8Array,
  ): void {
    if (!this.enabled || this.listeners.size === 0) return;
    this.count++;
    const signal: Signal = { source, operation, inputBytes, outputBytes, timestamp: Date.now() };
    for (const listener of this.listeners) {
      try { listener(signal); } catch { /* never crash the emitter */ }
    }
  }

  pause(): void { this.enabled = false; }
  resume(): void { this.enabled = true; }
  get totalSignals(): number { return this.count; }
  get listenerCount(): number { return this.listeners.size; }
}

/** The genesis signal bus — the kernel's single nervous system. */
export const signalBus = new SignalBus();
