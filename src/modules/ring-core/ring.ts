/**
 * UOR Ring Arithmetic Core — UORRing class operating on ByteTuples.
 *
 * This module wraps the pure functions from src/lib/uor-ring.ts into
 * a stateful class that operates on ByteTuple (big-endian byte arrays)
 * at a given quantum level. No arithmetic logic is duplicated — all
 * computation delegates to the existing ring engine.
 *
 * Mathematical basis: Z/(2^n)Z where n = 8 × (quantum + 1)
 * Signature Σ = {neg, bnot, xor, and, or}
 * Critical identity: neg(bnot(x)) = succ(x) for all x
 */

import type { ByteTuple, Quantum, RingConfig } from "@/types/uor";
import {
  ringConfig,
  neg as negNum,
  bnot as bnotNum,
  succ as succNum,
  pred as predNum,
  add as addNum,
  sub as subNum,
  mul as mulNum,
  xor as xorNum,
  and as andNum,
  or as orNum,
  toBytesTuple,
  bytePopcount,
  byteBasis,
  verifyCriticalIdentity,
} from "@/lib/uor-ring";

// ── ByteTuple ↔ Number conversion ───────────────────────────────────────────

/** Convert a ByteTuple to its numeric value (big-endian). */
export function fromBytes(b: ByteTuple): number {
  let value = 0;
  for (let i = 0; i < b.length; i++) {
    value = (value << 8) | (b[i] & 0xff);
  }
  return value;
}

/** Convert a number to a ByteTuple of the given bit width (delegates to uor-ring). */
export function toBytes(value: number, bits: number): ByteTuple {
  return toBytesTuple(value, bits);
}

// ── UORRing class ───────────────────────────────────────────────────────────

export class UORRing {
  readonly config: RingConfig;
  private _coherenceVerified = false;

  constructor(quantum: Quantum = 0) {
    this.config = ringConfig(quantum);
  }

  get quantum(): Quantum { return this.config.quantum; }
  get width(): number { return this.config.width; }
  get bits(): number { return this.config.bits; }
  get cycle(): bigint { return this.config.cycle; }
  get mask(): bigint { return this.config.mask; }
  get coherenceVerified(): boolean { return this._coherenceVerified; }

  // ── Conversion ──────────────────────────────────────────────────────────

  /** Number → ByteTuple at this ring's bit width. */
  toBytes(n: number): ByteTuple {
    return toBytes(n, this.bits);
  }

  /** ByteTuple → number. */
  fromBytes(b: ByteTuple): number {
    return fromBytes(b);
  }

  // ── Unary operations (ByteTuple → ByteTuple) ──────────────────────────

  /** Additive inverse: (-x) mod 2^bits. */
  neg(b: ByteTuple): ByteTuple {
    return this.toBytes(negNum(this.fromBytes(b), this.bits));
  }

  /** Bitwise complement: per-byte XOR with 0xFF. */
  bnot(b: ByteTuple): ByteTuple {
    // Direct per-byte implementation for correctness at all quantum levels
    return b.map((byte) => byte ^ 0xff);
  }

  /** Successor: neg(bnot(x)) — NOT independently computed (per spec). */
  succ(b: ByteTuple): ByteTuple {
    return this.neg(this.bnot(b));
  }

  /** Predecessor: bnot(neg(x)) — derived from involutions. */
  pred(b: ByteTuple): ByteTuple {
    return this.bnot(this.neg(b));
  }

  // ── Binary operations (ByteTuple × ByteTuple → ByteTuple) ─────────────

  /** Per-byte XOR. */
  xor(a: ByteTuple, b: ByteTuple): ByteTuple {
    return a.map((byte, i) => byte ^ (b[i] ?? 0));
  }

  /** Per-byte AND. */
  band(a: ByteTuple, b: ByteTuple): ByteTuple {
    return a.map((byte, i) => byte & (b[i] ?? 0));
  }

  /** Per-byte OR. */
  bor(a: ByteTuple, b: ByteTuple): ByteTuple {
    return a.map((byte, i) => byte | (b[i] ?? 0));
  }

  /** Modular addition. */
  add(a: ByteTuple, b: ByteTuple): ByteTuple {
    return this.toBytes(addNum(this.fromBytes(a), this.fromBytes(b), this.bits));
  }

  /** Modular subtraction. */
  sub(a: ByteTuple, b: ByteTuple): ByteTuple {
    return this.toBytes(subNum(this.fromBytes(a), this.fromBytes(b), this.bits));
  }

  /** Modular multiplication. */
  mul(a: ByteTuple, b: ByteTuple): ByteTuple {
    return this.toBytes(mulNum(this.fromBytes(a), this.fromBytes(b), this.bits));
  }

  // ── Analysis ──────────────────────────────────────────────────────────

  /** Stratum (popcount) of a ByteTuple. */
  stratum(b: ByteTuple): number {
    return b.reduce((sum, byte) => sum + bytePopcount(byte), 0);
  }

  /** Spectrum (active bit positions) per byte. */
  spectrum(b: ByteTuple): number[][] {
    return b.map(byteBasis);
  }

  // ── Verification ──────────────────────────────────────────────────────

  /**
   * Exhaustive coherence check at Q0 (all 256 values), sampled at higher quantum.
   * Sets _coherenceVerified flag on success.
   * Returns { verified: boolean; failures: string[] }.
   */
  verify(): { verified: boolean; failures: string[] } {
    const failures: string[] = [];

    if (this.quantum === 0) {
      // Exhaustive Q0: check critical identity for all 256 values
      for (let x = 0; x < 256; x++) {
        if (!verifyCriticalIdentity(x, this.bits)) {
          failures.push(`Critical identity failed for x=${x}`);
        }
      }
    } else {
      // Sampled verification for higher quantum: boundaries + random samples
      const m = Number(this.cycle);
      const testValues = [0, 1, m - 1, m - 2, m / 2];
      // Add 50 random samples
      for (let i = 0; i < 50; i++) {
        testValues.push(Math.floor(Math.random() * m));
      }
      for (const x of testValues) {
        const b = this.toBytes(x);
        const succB = this.succ(b);
        const succExpected = this.toBytes(succNum(x, this.bits));
        if (this.fromBytes(succB) !== this.fromBytes(succExpected)) {
          failures.push(`Critical identity failed for x=${x} at Q${this.quantum}`);
        }
      }
    }

    this._coherenceVerified = failures.length === 0;
    return { verified: this._coherenceVerified, failures };
  }
}

// ── Factory functions ───────────────────────────────────────────────────────

/** Ring at quantum level 0: Z/256Z (8-bit, 1 byte). */
export function Q0(): UORRing { return new UORRing(0); }

/** Ring at quantum level 1: Z/65536Z (16-bit, 2 bytes). */
export function Q1(): UORRing { return new UORRing(1); }

/** Ring at quantum level 2: Z/(2^24)Z (24-bit, 3 bytes). */
export function Q2(): UORRing { return new UORRing(2); }

/** Ring at quantum level 3: Z/(2^32)Z (32-bit, 4 bytes). */
export function Q3(): UORRing { return new UORRing(3); }

/** Ring at arbitrary quantum level n. */
export function Q(n: Quantum): UORRing { return new UORRing(n); }
