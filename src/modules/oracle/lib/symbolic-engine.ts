/**
 * Symbolic Engine — executes UOR ring operations locally.
 * Uses the existing TypeScript ring engine (same math as the Rust crate).
 * WASM upgrade path: swap imports to WASM bridge when compiled.
 */

import {
  neg, bnot, succ, pred, add, sub, mul, xor, and, or,
  verifyCriticalIdentity, classifyByte, buildTriad, bytePopcount, byteBasis,
} from "@/lib/uor-ring";

export interface SymbolicResult {
  expression: string;
  value: number | boolean | string;
  details: Record<string, unknown>;
  traitRef: string;
  docsUrl: string;
  engine: "typescript" | "wasm";
}

const TRAIT_MAP: Record<string, { trait: string; url: string }> = {
  neg: { trait: "kernel::op::Involution", url: "https://docs.rs/uor-foundation/latest/uor_foundation/kernel/op/" },
  bnot: { trait: "kernel::op::Involution", url: "https://docs.rs/uor-foundation/latest/uor_foundation/kernel/op/" },
  succ: { trait: "kernel::op::UnaryOp", url: "https://docs.rs/uor-foundation/latest/uor_foundation/kernel/op/" },
  pred: { trait: "kernel::op::UnaryOp", url: "https://docs.rs/uor-foundation/latest/uor_foundation/kernel/op/" },
  add: { trait: "kernel::op::BinaryOp", url: "https://docs.rs/uor-foundation/latest/uor_foundation/kernel/op/" },
  sub: { trait: "kernel::op::BinaryOp", url: "https://docs.rs/uor-foundation/latest/uor_foundation/kernel/op/" },
  mul: { trait: "kernel::op::BinaryOp", url: "https://docs.rs/uor-foundation/latest/uor_foundation/kernel/op/" },
  xor: { trait: "kernel::op::BinaryOp", url: "https://docs.rs/uor-foundation/latest/uor_foundation/kernel/op/" },
  and: { trait: "kernel::op::BinaryOp", url: "https://docs.rs/uor-foundation/latest/uor_foundation/kernel/op/" },
  or: { trait: "kernel::op::BinaryOp", url: "https://docs.rs/uor-foundation/latest/uor_foundation/kernel/op/" },
  verify_critical_identity: { trait: "bridge::proof::CriticalIdentityProof", url: "https://docs.rs/uor-foundation/latest/uor_foundation/bridge/proof/" },
  classify_byte: { trait: "bridge::partition::Component", url: "https://docs.rs/uor-foundation/latest/uor_foundation/bridge/partition/" },
};

const OPS: Record<string, Function> = { neg, bnot, succ, pred, add, sub, mul, xor, and, or };

export function executeExpression(expr: string): SymbolicResult | null {
  const trimmed = expr.trim();

  // verify_critical_identity(x)
  const verifyMatch = trimmed.match(/^verify_critical_identity\((\d+)\)$/);
  if (verifyMatch) {
    const x = parseInt(verifyMatch[1]);
    const holds = verifyCriticalIdentity(x);
    const ref = TRAIT_MAP.verify_critical_identity;
    return {
      expression: trimmed, value: holds,
      details: { x, neg_bnot: neg(bnot(x)), succ_x: succ(x), holds },
      traitRef: ref.trait, docsUrl: ref.url, engine: "typescript",
    };
  }

  // classify_byte(x)
  const classifyMatch = trimmed.match(/^classify_byte\((\d+)\)$/);
  if (classifyMatch) {
    const x = parseInt(classifyMatch[1]);
    const result = classifyByte(x, 8);
    const ref = TRAIT_MAP.classify_byte;
    return {
      expression: trimmed, value: result.component,
      details: { x, ...result, popcount: bytePopcount(x), basis: byteBasis(x) },
      traitRef: ref.trait, docsUrl: ref.url, engine: "typescript",
    };
  }

  // Recursive expression evaluation
  const result = evalExpr(trimmed);
  if (result !== null) {
    const funcName = trimmed.match(/^(\w+)\(/)?.[1] || "unknown";
    const ref = TRAIT_MAP[funcName] || { trait: "kernel::op", url: "https://docs.rs/uor-foundation/latest/uor_foundation/kernel/op/" };
    const partition = classifyByte(result, 8);
    return {
      expression: trimmed, value: result,
      details: {
        decimal: result, binary: result.toString(2).padStart(8, "0"), hex: "0x" + result.toString(16).padStart(2, "0"),
        partition: partition.component, popcount: bytePopcount(result), basis: byteBasis(result),
        criticalIdentity: { neg_bnot: neg(bnot(result)), succ: succ(result), holds: verifyCriticalIdentity(result) },
      },
      traitRef: ref.trait, docsUrl: ref.url, engine: "typescript",
    };
  }

  return null;
}

function evalExpr(s: string): number | null {
  const t = s.trim();
  const numMatch = t.match(/^\d+$/);
  if (numMatch) { const v = parseInt(t); return v >= 0 && v <= 255 ? v : null; }

  const funcMatch = t.match(/^(\w+)\((.+)\)$/s);
  if (!funcMatch) return null;
  const [, func, argsStr] = funcMatch;

  // Unary
  if (["neg", "bnot", "succ", "pred"].includes(func)) {
    const inner = evalExpr(argsStr);
    if (inner === null) return null;
    return (OPS[func] as (x: number) => number)(inner);
  }

  // Binary
  if (["add", "sub", "mul", "xor", "and", "or"].includes(func)) {
    const split = splitArgs(argsStr);
    if (!split) return null;
    const a = evalExpr(split[0]);
    const b = evalExpr(split[1]);
    if (a === null || b === null) return null;
    return (OPS[func] as (a: number, b: number) => number)(a, b);
  }

  return null;
}

function splitArgs(s: string): [string, string] | null {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") depth--;
    else if (s[i] === "," && depth === 0) return [s.slice(0, i), s.slice(i + 1)];
  }
  return null;
}

/** Extract WASM_EXEC blocks from markdown text */
export function extractWasmBlocks(text: string): string[] {
  const regex = /WASM_EXEC:\s*(.+?)(?:\n|```|$)/g;
  const results: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}
