/**
 * UOR WASM Bridge
 *
 * @deprecated This module is superseded by `@/modules/engine`.
 * All consumers should import from `@/modules/engine` instead:
 *
 *   import { getEngine, initEngine } from "@/modules/kernel/engine";
 *   const e = getEngine();
 *   e.neg(x);  // WASM or TS, transparently
 *
 * This file is retained only as a thin delegator for any remaining
 * transitive imports. It will be removed in a future version.
 */

import { getEngine, initEngine } from "@/modules/kernel/engine";

/** @deprecated Use `initEngine()` from `@/modules/engine` */
export async function loadWasm(): Promise<unknown> {
  await initEngine();
  return {};
}

/** @deprecated Use `getEngine().engine` */
export function isWasmReady(): boolean {
  return true; // engine is always ready after boot
}

/** @deprecated Use `getEngine().engine` */
export function engineType(): "wasm" | "typescript" {
  return getEngine().engine;
}

/** @deprecated Use `getEngine().version` */
export function crateVersion(): string | null {
  return getEngine().version;
}

// ── All ring operations delegate to engine contract ─────────────────

const e = () => getEngine();

/** @deprecated Use `getEngine().neg()` */
export const neg = (x: number) => e().neg(x);
/** @deprecated Use `getEngine().bnot()` */
export const bnot = (x: number) => e().bnot(x);
/** @deprecated Use `getEngine().succ()` */
export const succ = (x: number) => e().succ(x);
/** @deprecated Use `getEngine().pred()` */
export const pred = (x: number) => e().pred(x);
/** @deprecated Use `getEngine().add()` */
export const add = (a: number, b: number) => e().add(a, b);
/** @deprecated Use `getEngine().sub()` */
export const sub = (a: number, b: number) => e().sub(a, b);
/** @deprecated Use `getEngine().mul()` */
export const mul = (a: number, b: number) => e().mul(a, b);
/** @deprecated Use `getEngine().xor()` */
export const xor = (a: number, b: number) => e().xor(a, b);
/** @deprecated Use `getEngine().and()` */
export const and = (a: number, b: number) => e().and(a, b);
/** @deprecated Use `getEngine().or()` */
export const or = (a: number, b: number) => e().or(a, b);
/** @deprecated Use `getEngine().verifyCriticalIdentity()` */
export const verifyCriticalIdentity = (x: number) => e().verifyCriticalIdentity(x);
/** @deprecated Use `getEngine().verifyAllCriticalIdentity()` */
export const verifyAllCriticalIdentity = () => e().verifyAllCriticalIdentity();
/** @deprecated Use `getEngine().bytePopcount()` */
export const bytePopcount = (x: number) => e().bytePopcount(x);
/** @deprecated Use `getEngine().byteBasis()` */
export const byteBasis = (x: number) => e().byteBasis(x);
/** @deprecated Use `getEngine().classifyByte()` */
export const classifyByte = (x: number) => e().classifyByte(x);
/** @deprecated Use `getEngine().factorize()` */
export const factorize = (x: number) => e().factorize(x);
/** @deprecated Use `getEngine().evaluateExpr()` */
export const evaluateExpr = (expr: string) => e().evaluateExpr(expr);
/** @deprecated Use `getEngine().listNamespaces()` */
export const listNamespaces = () => JSON.stringify(e().listNamespaces());
/** @deprecated Use `getEngine().listEnums()` */
export const listEnums = () => JSON.stringify(e().listEnums());

/** @deprecated */
export function listEnforcementStructs(): string {
  return "[]";
}

/**
 * @deprecated Use getEngine() methods directly.
 */
export function constRingEvalQ0(op: number, a: number, b: number = 0): number {
  const eng = e();
  switch (op) {
    case 0: return eng.neg(a);
    case 1: return eng.bnot(a);
    case 2: return eng.succ(a);
    case 3: return eng.pred(a);
    case 4: return eng.add(a, b);
    case 5: return eng.sub(a, b);
    case 6: return eng.mul(a, b);
    case 7: return eng.xor(a, b);
    case 8: return eng.and(a, b);
    case 9: return eng.or(a, b);
    default: return 0;
  }
}
