/**
 * Ring Core — UorModule<ByteTuple> Implementation
 * ════════════════════════════════════════════════
 *
 * The Q0 ring module using the generic lifecycle base.
 * All ring operations (neg, bnot, succ, add, mul, xor) are
 * automatically observed and tracked for coherence.
 *
 * @module ring-core/ring-module
 */

import { UorModule } from "@/modules/core/uor-module";
import { UORRing } from "./ring";
import type { ByteTuple } from "@/types/uor";

export class RingCoreModule extends UorModule<ByteTuple> {
  readonly ring: UORRing;

  constructor(quantum: number = 0) {
    super("ring-core", `Q${quantum} Ring`);
    this.ring = new UORRing(quantum as 0);
    this.register();
  }

  /**
   * Execute a ring operation with automatic observation.
   */
  exec(opName: string, input: ByteTuple, fn: (b: ByteTuple) => ByteTuple): ByteTuple {
    const output = fn(input);
    const inByte = input[0] ?? 0;
    const outByte = output[0] ?? 0;
    this.observe(opName, inByte, outByte, output);
    return output;
  }

  /** Execute a binary operation with observation. */
  execBinary(opName: string, a: ByteTuple, b: ByteTuple, fn: (a: ByteTuple, b: ByteTuple) => ByteTuple): ByteTuple {
    const output = fn(a, b);
    const inByte = a[0] ?? 0;
    const outByte = output[0] ?? 0;
    this.observe(opName, inByte, outByte, output);
    return output;
  }

  // Convenience wrappers
  neg(b: ByteTuple): ByteTuple { return this.exec("neg", b, (x) => this.ring.neg(x)); }
  bnot(b: ByteTuple): ByteTuple { return this.exec("bnot", b, (x) => this.ring.bnot(x)); }
  succ(b: ByteTuple): ByteTuple { return this.exec("succ", b, (x) => this.ring.succ(x)); }
  pred(b: ByteTuple): ByteTuple { return this.exec("pred", b, (x) => this.ring.pred(x)); }
  add(a: ByteTuple, b: ByteTuple): ByteTuple { return this.execBinary("add", a, b, (x, y) => this.ring.add(x, y)); }
  mul(a: ByteTuple, b: ByteTuple): ByteTuple { return this.execBinary("mul", a, b, (x, y) => this.ring.mul(x, y)); }
  xor(a: ByteTuple, b: ByteTuple): ByteTuple { return this.execBinary("xor", a, b, (x, y) => this.ring.xor(x, y)); }

  protected verifySelf(): { verified: boolean; failures: string[] } {
    return this.ring.verify();
  }
}
