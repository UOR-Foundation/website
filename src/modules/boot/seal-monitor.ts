/**
 * Sovereign Seal Monitor — Continuous Integrity Verification
 * ═══════════════════════════════════════════════════════════════
 *
 * Re-verifies the UOR seal at jittered intervals (25s + random 0-10s).
 * Uses stored canonical bytes for re-hashing (Finding 1: no timestamp rebuild).
 * Emits events only through SystemEventBus (Finding 7: not window.dispatch).
 *
 * @module boot/seal-monitor
 */

import type { UorSeal, BootReceipt } from "./types";
import { getEngine } from "@/modules/engine";
import { SystemEventBus } from "@/modules/observable/system-event-bus";

// ── Helpers ──────────────────────────────────────────────────────────────

async function sha256Bytes(data: Uint8Array): Promise<string> {
  const ab = new ArrayBuffer(data.byteLength);
  new Uint8Array(ab).set(data);
  const digest = await crypto.subtle.digest("SHA-256", ab);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Jittered interval: 25s + random(0-10s) to prevent timing attacks (H2). */
function jitteredDelay(): number {
  return 25_000 + Math.floor(Math.random() * 10_000);
}

// ── Monitor ──────────────────────────────────────────────────────────────

/**
 * Start continuous seal monitoring.
 *
 * Verification strategy (Finding 1 & Finding 5):
 *   1. Re-hash the ORIGINAL canonical bytes → compare derivation ID
 *   2. Verify a random sample of 8 ring elements + canaries (x=0, x=255)
 *   3. Any mismatch → emit "violation" on SystemEventBus
 *
 * @returns Cleanup function to stop monitoring
 */
export function startSealMonitor(
  seal: UorSeal,
  receipt: BootReceipt,
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  async function verify() {
    if (stopped) return;

    try {
      const engine = getEngine();

      // 1. Re-hash stored canonical bytes (Finding 1: never rebuild input)
      const rehashedHex = await sha256Bytes(seal.canonicalBytes);
      const expectedHex = seal.derivationId.replace("urn:uor:derivation:sha256:", "");
      const sealIntact = rehashedHex === expectedHex;

      // 2. Ring spot-check: 8 random elements + canaries 0 and 255
      const canaries = [0, 255];
      const randoms = Array.from(
        crypto.getRandomValues(new Uint8Array(8)),
      );
      const sample = [...canaries, ...randoms];
      const ringIntact = sample.every(
        (x) => engine.neg(engine.bnot(x)) === engine.succ(x),
      );

      if (!sealIntact || !ringIntact) {
        // VIOLATION
        const reason = !sealIntact ? "seal-hash-mismatch" : "ring-identity-failure";
        console.error(`[Seal Monitor] VIOLATION: ${reason}`);

        SystemEventBus.emit(
          "sovereignty",
          `violation:${reason}`,
          new TextEncoder().encode(reason),
          seal.canonicalBytes,
        );
        return; // Don't schedule next — system is compromised
      }

      // Heartbeat — system is intact
      receipt.lastVerified = new Date().toISOString();

      SystemEventBus.emit(
        "sovereignty",
        "heartbeat",
        new TextEncoder().encode(seal.derivationId.slice(-8)),
        new Uint8Array([1]), // 1 = healthy
      );
    } catch (err) {
      console.warn("[Seal Monitor] Verification error:", err);
    }

    // Schedule next check with jittered delay (H2)
    if (!stopped) {
      timeoutId = setTimeout(verify, jitteredDelay());
    }
  }

  // Start first check after initial jittered delay
  timeoutId = setTimeout(verify, jitteredDelay());

  // Return cleanup function
  return () => {
    stopped = true;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
}
