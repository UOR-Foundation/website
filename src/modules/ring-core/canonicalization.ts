/**
 * UOR Term Canonicalization Engine.
 *
 * Takes a Term (syntax tree) and a RingConfig, and applies
 * the 8 canonicalization rules from the UOR specification
 * to produce a canonical normal form.
 *
 * Rules are applied in order:
 *   (a) Involution cancellation: f(f(x)) → x for f ∈ {neg, bnot}
 *   (b) Derived expansion: succ(x) → neg(bnot(x)), pred(x) → bnot(neg(x))
 *   (c) Constant reduction mod 2^bits
 *   (d) Associative flattening for xor/and/or
 *   (e) Commutative sorting (constants first, then by canonical serialization)
 *   (f) Identity elimination: x xor 0 → x, x and mask → x, x or 0 → x
 *   (g) Self-cancellation: x xor x → 0; Idempotence: x and x → x, x or x → x
 *
 * Aligns with the 8 canonicalization rules in src/data/canonicalization-rules.ts.
 */

import type { RingConfig } from "@/types/uor";
import { modulus } from "@/lib/uor-ring";

// ── Term AST ────────────────────────────────────────────────────────────────

export type Term =
  | { kind: "const"; value: number }
  | { kind: "var"; name: string }
  | { kind: "unary"; op: "neg" | "bnot" | "succ" | "pred"; arg: Term }
  | { kind: "binary"; op: "xor" | "and" | "or"; args: Term[] };

// ── Serialization for comparison ────────────────────────────────────────────

export function serializeTerm(t: Term): string {
  switch (t.kind) {
    case "const": return `C(${t.value})`;
    case "var": return `V(${t.name})`;
    case "unary": return `${t.op}(${serializeTerm(t.arg)})`;
    case "binary": return `${t.op}(${t.args.map(serializeTerm).join(",")})`;
  }
}

/** Deep equality for terms. */
function termsEqual(a: Term, b: Term): boolean {
  return serializeTerm(a) === serializeTerm(b);
}

// ── Canonicalization ────────────────────────────────────────────────────────

/**
 * Canonicalize a term according to the UOR specification rules.
 * Applies rules iteratively until a fixed point is reached.
 */
export function canonicalize(term: Term, config: RingConfig): Term {
  let current = term;
  let prev = "";

  // Iterate until fixed point
  for (let i = 0; i < 100; i++) {
    current = applyRules(current, config);
    const serialized = serializeTerm(current);
    if (serialized === prev) break;
    prev = serialized;
  }

  return current;
}

function applyRules(t: Term, config: RingConfig): Term {
  // Bottom-up: canonicalize children first
  t = canonicalizeChildren(t, config);

  // (a) Involution cancellation: f(f(x)) → x for f ∈ {neg, bnot}
  t = ruleInvolutionCancellation(t);

  // (b) Derived expansion: succ(x) → neg(bnot(x)), pred(x) → bnot(neg(x))
  t = ruleDerivedExpansion(t);

  // (c) Constant reduction mod 2^bits
  t = ruleConstantReduction(t, config);

  // (d) Associative flattening for xor/and/or
  t = ruleAssociativeFlatten(t);

  // (e) Commutative sorting
  t = ruleCommutativeSort(t);

  // (f) Identity elimination
  t = ruleIdentityElimination(t, config);

  // (g) Self-cancellation and idempotence
  t = ruleSelfCancellation(t);

  return t;
}

function canonicalizeChildren(t: Term, config: RingConfig): Term {
  if (t.kind === "unary") {
    return { ...t, arg: applyRules(t.arg, config) };
  }
  if (t.kind === "binary") {
    return { ...t, args: t.args.map((a) => applyRules(a, config)) };
  }
  return t;
}

// ── Rule (a): Involution cancellation ───────────────────────────────────────

function ruleInvolutionCancellation(t: Term): Term {
  if (
    t.kind === "unary" &&
    (t.op === "neg" || t.op === "bnot") &&
    t.arg.kind === "unary" &&
    t.arg.op === t.op
  ) {
    return t.arg.arg; // f(f(x)) → x
  }
  return t;
}

// ── Rule (b): Derived expansion ─────────────────────────────────────────────

function ruleDerivedExpansion(t: Term): Term {
  if (t.kind === "unary" && t.op === "succ") {
    // succ(x) → neg(bnot(x))
    return { kind: "unary", op: "neg", arg: { kind: "unary", op: "bnot", arg: t.arg } };
  }
  if (t.kind === "unary" && t.op === "pred") {
    // pred(x) → bnot(neg(x))
    return { kind: "unary", op: "bnot", arg: { kind: "unary", op: "neg", arg: t.arg } };
  }
  return t;
}

// ── Rule (c): Constant reduction ────────────────────────────────────────────

function ruleConstantReduction(t: Term, config: RingConfig): Term {
  if (t.kind === "const") {
    const m = modulus(config.bits);
    return { kind: "const", value: ((t.value % m) + m) % m };
  }

  // Evaluate fully constant unary expressions
  if (t.kind === "unary" && t.arg.kind === "const") {
    const m = modulus(config.bits);
    const x = t.arg.value;
    switch (t.op) {
      case "neg": return { kind: "const", value: ((-x) % m + m) % m };
      case "bnot": return { kind: "const", value: x ^ (m - 1) };
      case "succ": return { kind: "const", value: (x + 1) % m };
      case "pred": return { kind: "const", value: (x - 1 + m) % m };
    }
  }

  // Evaluate fully constant binary expressions
  if (t.kind === "binary" && t.args.every((a) => a.kind === "const")) {
    const values = t.args.map((a) => (a as { kind: "const"; value: number }).value);
    let result: number;
    switch (t.op) {
      case "xor": result = values.reduce((a, b) => a ^ b, 0); break;
      case "and": result = values.reduce((a, b) => a & b, modulus(config.bits) - 1); break;
      case "or": result = values.reduce((a, b) => a | b, 0); break;
    }
    return { kind: "const", value: result };
  }

  return t;
}

// ── Rule (d): Associative flattening ────────────────────────────────────────

function ruleAssociativeFlatten(t: Term): Term {
  if (t.kind !== "binary") return t;

  const flattened: Term[] = [];
  for (const arg of t.args) {
    if (arg.kind === "binary" && arg.op === t.op) {
      flattened.push(...arg.args);
    } else {
      flattened.push(arg);
    }
  }

  return { ...t, args: flattened };
}

// ── Rule (e): Commutative sorting ───────────────────────────────────────────

function ruleCommutativeSort(t: Term): Term {
  if (t.kind !== "binary") return t;

  const sorted = [...t.args].sort((a, b) => {
    // Constants first
    if (a.kind === "const" && b.kind !== "const") return -1;
    if (a.kind !== "const" && b.kind === "const") return 1;
    // Then by serialization
    return serializeTerm(a).localeCompare(serializeTerm(b));
  });

  return { ...t, args: sorted };
}

// ── Rule (f): Identity elimination ──────────────────────────────────────────

function ruleIdentityElimination(t: Term, config: RingConfig): Term {
  if (t.kind !== "binary") return t;
  const m = modulus(config.bits);

  const identity = t.op === "xor" ? 0 : t.op === "or" ? 0 : m - 1; // AND identity is all-1s mask

  const filtered = t.args.filter((a) => {
    if (a.kind === "const" && a.value === identity) return false;
    return true;
  });

  if (filtered.length === 0) return { kind: "const", value: identity };
  if (filtered.length === 1) return filtered[0];
  return { ...t, args: filtered };
}

// ── Rule (g): Self-cancellation and idempotence ─────────────────────────────

function ruleSelfCancellation(t: Term): Term {
  if (t.kind !== "binary") return t;

  if (t.op === "xor") {
    // x xor x → 0 (remove pairs)
    const remaining: Term[] = [];
    const seen = new Map<string, number>();
    for (const arg of t.args) {
      const key = serializeTerm(arg);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    for (const [key, count] of seen) {
      const arg = t.args.find((a) => serializeTerm(a) === key)!;
      // Keep odd occurrences, cancel pairs
      if (count % 2 === 1) remaining.push(arg);
    }
    if (remaining.length === 0) return { kind: "const", value: 0 };
    if (remaining.length === 1) return remaining[0];
    return { ...t, args: remaining };
  }

  if (t.op === "and" || t.op === "or") {
    // Idempotence: x and x → x, x or x → x (deduplicate)
    const unique: Term[] = [];
    const seen = new Set<string>();
    for (const arg of t.args) {
      const key = serializeTerm(arg);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(arg);
      }
    }
    if (unique.length === 1) return unique[0];
    return { ...t, args: unique };
  }

  return t;
}
