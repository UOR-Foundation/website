/**
 * Symbolic Engine — executes UOR ring operations via the engine contract.
 * The engine contract delegates to WASM (Rust crate) or TS fallback transparently.
 */

import { getEngine } from "@/modules/engine";

export interface SymbolicResult {
  expression: string;
  value: number | boolean | string;
  details: Record<string, unknown>;
  traitRef: string;
  docsUrl: string;
  engine: "wasm" | "typescript";
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

export function executeExpression(expr: string): SymbolicResult | null {
  const trimmed = expr.trim();
  const e = getEngine();
  const engine = e.engine;

  // verify_critical_identity(x)
  const verifyMatch = trimmed.match(/^verify_critical_identity\((\d+)\)$/);
  if (verifyMatch) {
    const x = parseInt(verifyMatch[1]);
    const holds = e.verifyCriticalIdentity(x);
    const ref = TRAIT_MAP.verify_critical_identity;
    return {
      expression: trimmed, value: holds,
      details: { x, neg_bnot: e.neg(e.bnot(x)), succ_x: e.succ(x), holds },
      traitRef: ref.trait, docsUrl: ref.url, engine,
    };
  }

  // classify_byte(x)
  const classifyMatch = trimmed.match(/^classify_byte\((\d+)\)$/);
  if (classifyMatch) {
    const x = parseInt(classifyMatch[1]);
    const component = e.classifyByte(x);
    const factors = e.factorize(x);
    const ref = TRAIT_MAP.classify_byte;
    return {
      expression: trimmed, value: component,
      details: { x, component, factors: factors.join(" × "), popcount: e.bytePopcount(x), basis: e.byteBasis(x) },
      traitRef: ref.trait, docsUrl: ref.url, engine,
    };
  }

  // Try expression evaluation via engine
  const result = e.evaluateExpr(trimmed);
  if (result >= 0) {
    const funcName = trimmed.match(/^(\w+)\(/)?.[1] || "unknown";
    const ref = TRAIT_MAP[funcName] || { trait: "kernel::op", url: "https://docs.rs/uor-foundation/latest/uor_foundation/kernel/op/" };
    const partition = e.classifyByte(result);
    return {
      expression: trimmed, value: result,
      details: {
        decimal: result,
        binary: result.toString(2).padStart(8, "0"),
        hex: "0x" + result.toString(16).padStart(2, "0"),
        partition,
        factors: e.factorize(result).join(" × ") || "—",
        popcount: e.bytePopcount(result),
        basis: e.byteBasis(result),
        criticalIdentity: {
          neg_bnot: e.neg(e.bnot(result)),
          succ: e.succ(result),
          holds: e.verifyCriticalIdentity(result),
        },
      },
      traitRef: ref.trait, docsUrl: ref.url, engine,
    };
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
