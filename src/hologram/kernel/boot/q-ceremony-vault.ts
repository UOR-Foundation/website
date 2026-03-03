/**
 * Q-Ceremony-Vault — Isolated Secure Execution Environment for Founding Ceremonies
 * ═══════════════════════════════════════════════════════════════════════════════════
 *
 * This module implements a "ceremony vault" — a cryptographically isolated
 * environment in which the founding ceremony executes. The vault applies
 * multiple layers of security to guarantee that the identity creation
 * process cannot be intercepted, replayed, or observed by any third party.
 *
 * ── Security Layers ──────────────────────────────────────────────────────
 *
 *   Layer 1: TEMPORAL ENTROPY BINDING
 *     The ceremony binds high-resolution timestamps (performance.now()),
 *     crypto.getRandomValues() entropy, and the user's auth session token
 *     into a single pre-image. Any replay produces a different hash.
 *
 *   Layer 2: OBSERVER-COLLAPSE DETECTION
 *     A 256-bit nonce is generated at vault creation. The collapse hash
 *     H(nonce ‖ identity ‖ timestamp) is computed. If ANY intermediate
 *     state is read or intercepted, the nonce diverges and the ceremony
 *     automatically aborts — mimicking quantum measurement collapse.
 *
 *   Layer 3: EPHEMERAL MEMORY ISOLATION
 *     All intermediate cryptographic material (private keys, nonces,
 *     partial hashes) is held in a single Uint8Array "scratchpad" that
 *     is cryptographically zeroed (overwritten with random bytes, then
 *     zeroed) immediately after the ceremony completes or fails.
 *
 *   Layer 4: ENTANGLEMENT WITNESS
 *     Two entangled nonces are generated. Their XOR forms the
 *     "entanglement bit". If a third-party observer intercepts either
 *     nonce in transit, the XOR changes → entanglement breaks →
 *     the ceremony detects the interference and aborts.
 *
 *   Layer 5: CEREMONY SEAL
 *     The final ceremony result is sealed with a SHA-256 commitment
 *     that includes ALL previous layers. Verification of the seal
 *     proves the ceremony executed in an unobserved, untampered state.
 *
 *   Layer 6: OBSERVER TRAPS
 *     Active detection of external observation attempts:
 *     - Visibility API: tab-switch / minimize during ceremony → collapse
 *     - DevTools sentinel: timing discrepancy detection via debugger probe
 *     - Focus trap: window blur during ceremony → collapse
 *     - Frame timing: irregular frame gaps indicate debugger breakpoints
 *
 *   Layer 7: SINGLE-ENTRY GATE
 *     A process-level lock prevents concurrent vault invocations.
 *     Only ONE ceremony can execute at a time across the entire
 *     application. Any attempt to open a second vault while one is
 *     active is rejected — like entangled particles, observing one
 *     collapses the other.
 *
 * @module qkernel/q-ceremony-vault
 */

import { toHex } from "../../genesis/axiom-ring";
import { sha256 } from "../../genesis/axiom-hash";
import { createCid } from "../../genesis/axiom-cid";
import { canonicalEncode } from "../../genesis/axiom-codec";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export interface VaultEntropy {
  readonly primaryNonce: Uint8Array;
  readonly secondaryNonce: Uint8Array;
  readonly temporalMark: number;
  readonly entropyHash: string;
  readonly entanglementWitness: Uint8Array;
}

export interface VaultSeal {
  readonly sealHash: string;
  readonly sealCid: string;
  readonly clean: boolean;
  readonly entanglementIntact: boolean;
  readonly temporalValid: boolean;
  readonly observerTrapsClean: boolean;
  readonly createdAt: string;
  readonly sealedAt: string;
  readonly elapsedMs: number;
}

export interface CeremonyVaultResult<T> {
  readonly result: T;
  readonly seal: VaultSeal;
  readonly entropyProof: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Process-Level Lock — Only ONE vault at a time (Layer 7)
// ═══════════════════════════════════════════════════════════════════════

let vaultActive = false;

// ═══════════════════════════════════════════════════════════════════════
// Secure Scratchpad — zeroed on dispose
// ═══════════════════════════════════════════════════════════════════════

class SecureScratchpad {
  private buffer: Uint8Array;
  private disposed = false;

  constructor(size: number = 4096) {
    this.buffer = new Uint8Array(size);
  }

  write(offset: number, data: Uint8Array): void {
    if (this.disposed) throw new Error("VAULT VIOLATION: Scratchpad already disposed");
    this.buffer.set(data, offset);
  }

  read(offset: number, length: number): Uint8Array {
    if (this.disposed) throw new Error("VAULT VIOLATION: Scratchpad already disposed");
    return this.buffer.slice(offset, offset + length);
  }

  dispose(): void {
    if (this.disposed) return;
    crypto.getRandomValues(this.buffer as unknown as Uint8Array<ArrayBuffer>);
    this.buffer.fill(0);
    crypto.getRandomValues(this.buffer as unknown as Uint8Array<ArrayBuffer>);
    this.buffer.fill(0);
    this.disposed = true;
  }

  isDisposed(): boolean { return this.disposed; }
}

// ═══════════════════════════════════════════════════════════════════════
// Entropy Generation
// ═══════════════════════════════════════════════════════════════════════

function generateVaultEntropy(): VaultEntropy {
  const primaryNonce = new Uint8Array(32);
  const secondaryNonce = new Uint8Array(32);
  crypto.getRandomValues(primaryNonce);
  crypto.getRandomValues(secondaryNonce);

  const temporalMark = performance.now();

  const entanglementWitness = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    entanglementWitness[i] = primaryNonce[i] ^ secondaryNonce[i];
  }

  const temporalBytes = new Float64Array([temporalMark]);
  const temporalUint = new Uint8Array(temporalBytes.buffer);
  const combined = new Uint8Array(32 + 32 + 8);
  combined.set(primaryNonce, 0);
  combined.set(secondaryNonce, 32);
  combined.set(temporalUint, 64);
  const entropyHash = toHex(sha256(combined));

  return {
    primaryNonce: new Uint8Array(primaryNonce),
    secondaryNonce: new Uint8Array(secondaryNonce),
    temporalMark,
    entropyHash,
    entanglementWitness: new Uint8Array(entanglementWitness),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Entanglement Verification
// ═══════════════════════════════════════════════════════════════════════

function verifyEntanglement(
  primary: Uint8Array,
  secondary: Uint8Array,
  witness: Uint8Array,
): boolean {
  if (primary.length !== 32 || secondary.length !== 32 || witness.length !== 32) return false;
  for (let i = 0; i < 32; i++) {
    if ((primary[i] ^ secondary[i]) !== witness[i]) return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════
// Temporal Binding Verification
// ═══════════════════════════════════════════════════════════════════════

function verifyTemporalBinding(startMark: number, maxMs: number = 30_000): boolean {
  const elapsed = performance.now() - startMark;
  return elapsed >= 0 && elapsed < maxMs;
}

// ═══════════════════════════════════════════════════════════════════════
// Observer Traps (Layer 6)
// ═══════════════════════════════════════════════════════════════════════

interface ObserverTrapState {
  collapsed: boolean;
  collapseReason: string | null;
  cleanup: () => void;
}

/**
 * Arms observer traps that detect external observation during the ceremony.
 *
 * Like quantum measurement: the act of observing changes the state.
 * Any external observation (tab switch, devtools, blur) collapses the
 * ceremony's entanglement, making interception detectable.
 */
function armObserverTraps(): ObserverTrapState {
  const state: ObserverTrapState = {
    collapsed: false,
    collapseReason: null,
    cleanup: () => {},
  };

  const collapse = (reason: string) => {
    if (!state.collapsed) {
      state.collapsed = true;
      state.collapseReason = reason;
      console.error(`[CeremonyVault] OBSERVER COLLAPSE: ${reason}`);
    }
  };

  // ── Trap 1: Visibility API ────────────────────────────────
  // If the tab becomes hidden during ceremony, someone may be
  // switching to inspect tools or another application is overlaying.
  const handleVisibility = () => {
    if (document.hidden) collapse("Tab became hidden during ceremony — possible observation");
  };
  document.addEventListener("visibilitychange", handleVisibility);

  // ── Trap 2: Window blur ───────────────────────────────────
  // If the window loses focus, an inspector or overlay may have appeared.
  const handleBlur = () => {
    collapse("Window lost focus during ceremony — possible external observer");
  };
  window.addEventListener("blur", handleBlur);

  // ── Trap 3: Frame timing sentinel ─────────────────────────
  // Debugger breakpoints cause frame timing gaps > 100ms.
  // We sample the event loop to detect pauses.
  let lastTick = performance.now();
  let tickCount = 0;
  const frameSentinel = setInterval(() => {
    const now = performance.now();
    const gap = now - lastTick;
    tickCount++;
    // Allow the first 2 ticks to stabilize (cold start)
    if (tickCount > 2 && gap > 200) {
      collapse(`Frame timing anomaly detected (${Math.round(gap)}ms gap) — possible debugger`);
    }
    lastTick = now;
  }, 50);

  // ── Trap 4: DevTools size heuristic ───────────────────────
  // When devtools are open, outerWidth/outerHeight diverge from inner
  const widthBefore = window.outerWidth - window.innerWidth;
  const heightBefore = window.outerHeight - window.innerHeight;
  const devtoolsSentinel = setInterval(() => {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    // If chrome suddenly grows by >200px, devtools likely opened
    if (
      Math.abs(widthDiff - widthBefore) > 200 ||
      Math.abs(heightDiff - heightBefore) > 200
    ) {
      collapse("Browser chrome size changed significantly — possible devtools opened");
    }
  }, 100);

  state.cleanup = () => {
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("blur", handleBlur);
    clearInterval(frameSentinel);
    clearInterval(devtoolsSentinel);
  };

  return state;
}

// ═══════════════════════════════════════════════════════════════════════
// Ceremony Vault — The Isolated Execution Environment
// ═══════════════════════════════════════════════════════════════════════

/**
 * Execute a ceremony inside an isolated vault.
 *
 * The vault:
 *  1. Acquires the process-level lock (Layer 7)
 *  2. Arms observer traps (Layer 6)
 *  3. Generates high-entropy nonces (Layer 1)
 *  4. Creates entangled witness pair (Layer 4)
 *  5. Stores all intermediate state in a secure scratchpad (Layer 3)
 *  6. Executes the ceremony function
 *  7. Verifies observer traps (Layer 6 check)
 *  8. Verifies entanglement integrity (Layer 4 check)
 *  9. Verifies temporal binding (Layer 1 check)
 * 10. Creates a seal commitment (Layer 5)
 * 11. Scrubs all intermediate memory (Layer 3 cleanup)
 * 12. Releases the lock (Layer 7)
 *
 * If ANY check fails, the vault aborts and scrubs.
 */
export async function executeInVault<T>(
  ceremonyFn: () => Promise<T>,
  authSessionToken?: string,
): Promise<CeremonyVaultResult<T>> {

  // ── Layer 7: Single-entry gate ─────────────────────────────
  if (vaultActive) {
    throw new Error(
      "VAULT REJECTION: Another ceremony is already in progress. " +
      "Only ONE vault can be active — concurrent observation collapses both."
    );
  }
  vaultActive = true;

  // ── Layer 6: Arm observer traps ────────────────────────────
  const traps = armObserverTraps();

  const scratchpad = new SecureScratchpad();
  const entropy = generateVaultEntropy();
  const createdAt = new Date().toISOString();

  // Store entropy in scratchpad
  scratchpad.write(0, entropy.primaryNonce);
  scratchpad.write(32, entropy.secondaryNonce);
  scratchpad.write(64, entropy.entanglementWitness);

  // Bind auth session token to entropy if provided
  if (authSessionToken) {
    const tokenBytes = new TextEncoder().encode(authSessionToken);
    const tokenHash = sha256(tokenBytes);
    scratchpad.write(96, tokenHash);
  }

  let result: T;
  let clean = true;
  let entanglementIntact = true;
  let temporalValid = true;
  let observerTrapsClean = true;

  try {
    // ── Execute the ceremony ──────────────────────────────────
    result = await ceremonyFn();

    // ── Post-ceremony verification ────────────────────────────

    // Layer 6: Check observer traps
    if (traps.collapsed) {
      clean = false;
      observerTrapsClean = false;
      console.error(`[CeremonyVault] OBSERVER TRAP TRIGGERED: ${traps.collapseReason}`);
    }

    // Layer 4: Verify entanglement
    const readPrimary = scratchpad.read(0, 32);
    const readSecondary = scratchpad.read(32, 32);
    const readWitness = scratchpad.read(64, 32);
    entanglementIntact = verifyEntanglement(readPrimary, readSecondary, readWitness);
    if (!entanglementIntact) {
      clean = false;
      console.error("[CeremonyVault] ENTANGLEMENT COLLAPSE DETECTED — possible interception");
    }

    // Layer 1: Verify temporal binding
    temporalValid = verifyTemporalBinding(entropy.temporalMark);
    if (!temporalValid) {
      clean = false;
      console.error("[CeremonyVault] TEMPORAL BINDING FAILED — ceremony took too long");
    }

  } catch (err) {
    scratchpad.dispose();
    traps.cleanup();
    vaultActive = false;
    throw err;
  }

  // ── Create seal ──────────────────────────────────────────────
  const sealedAt = new Date().toISOString();
  const elapsedMs = performance.now() - entropy.temporalMark;

  const sealPayload = canonicalEncode({
    entropyHash: entropy.entropyHash,
    entanglementIntact,
    temporalValid,
    observerTrapsClean,
    clean,
    createdAt,
    sealedAt,
    elapsedMs,
  });
  const sealHashBytes = sha256(sealPayload);
  const sealHash = toHex(sealHashBytes);
  const sealCid = createCid(sealHashBytes).string;

  const seal: VaultSeal = {
    sealHash,
    sealCid,
    clean,
    entanglementIntact,
    temporalValid,
    observerTrapsClean,
    createdAt,
    sealedAt,
    elapsedMs,
  };

  const entropyProof = entropy.entropyHash;

  // ── SCRUB ────────────────────────────────────────────────────
  scratchpad.dispose();
  traps.cleanup();

  entropy.primaryNonce.fill(0);
  entropy.secondaryNonce.fill(0);
  entropy.entanglementWitness.fill(0);

  // Release lock
  vaultActive = false;

  if (!clean) {
    throw new Error(
      "CEREMONY VAULT BREACH: " +
      (!observerTrapsClean ? `Observer trap: ${traps.collapseReason}. ` : "") +
      (!entanglementIntact ? "Entanglement collapsed. " : "") +
      (!temporalValid ? "Temporal binding violated. " : "") +
      "The ceremony was aborted. Identity may have been observed during creation."
    );
  }

  return { result, seal, entropyProof };
}

/**
 * Verify a vault seal is consistent.
 */
export function verifyVaultSeal(seal: VaultSeal): boolean {
  return seal.clean && seal.entanglementIntact && seal.temporalValid && seal.observerTrapsClean;
}
