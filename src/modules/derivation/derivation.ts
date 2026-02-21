/**
 * UOR Derivation Engine — auditable term-level computation records.
 *
 * A Derivation binds { original term, canonical term, result, metrics }.
 * It is the foundational audit record of the UOR knowledge graph.
 *
 * Delegates to:
 *   - ring-core/canonicalization.ts for term canonicalization (requirement R2)
 *   - ring-core/ring.ts for evaluation
 *   - identity/addressing.ts for result IRI computation
 *   - lib/uor-address.ts for SHA-256 hashing via SubtleCrypto
 *
 * Zero duplication of arithmetic or canonicalization logic.
 */

import type { EpistemicGrade } from "@/types/uor";
import type { UORRing } from "@/modules/ring-core/ring";
import { canonicalize, serializeTerm } from "@/modules/ring-core/canonicalization";
import type { Term } from "@/modules/ring-core/canonicalization";
import { fromBytes } from "@/modules/ring-core/ring";
import { contentAddress } from "@/modules/identity";

// ── Derivation type ─────────────────────────────────────────────────────────

export interface Derivation {
  "@type": "derivation:Record";
  derivationId: string;
  originalTerm: string;
  canonicalTerm: string;
  resultValue: number;
  resultIri: string;
  epistemicGrade: EpistemicGrade;
  timestamp: string;
  metrics: {
    originalComplexity: number;
    canonicalComplexity: number;
    reductionRatio: number;
  };
}

// ── Term complexity ─────────────────────────────────────────────────────────

function termComplexity(t: Term): number {
  switch (t.kind) {
    case "const":
    case "var":
      return 1;
    case "unary":
      return 1 + termComplexity(t.arg);
    case "binary":
      return 1 + t.args.reduce((s, a) => s + termComplexity(a), 0);
  }
}

// ── Term evaluation ─────────────────────────────────────────────────────────

/**
 * Evaluate a fully-constant canonical term to a numeric result.
 * The term MUST be fully reduced (no variables) after canonicalization.
 */
function evaluateTerm(t: Term, ring: UORRing): number {
  switch (t.kind) {
    case "const":
      return t.value;
    case "var":
      throw new Error(`Cannot evaluate variable term: ${t.name}`);
    case "unary": {
      const argVal = evaluateTerm(t.arg, ring);
      const argBytes = ring.toBytes(argVal);
      switch (t.op) {
        case "neg": return fromBytes(ring.neg(argBytes));
        case "bnot": return fromBytes(ring.bnot(argBytes));
        case "succ": return fromBytes(ring.succ(argBytes));
        case "pred": return fromBytes(ring.pred(argBytes));
      }
      break;
    }
    case "binary": {
      const vals = t.args.map((a) => evaluateTerm(a, ring));
      let result = vals[0];
      for (let i = 1; i < vals.length; i++) {
        const aBytes = ring.toBytes(result);
        const bBytes = ring.toBytes(vals[i]);
        switch (t.op) {
          case "xor": result = fromBytes(ring.xor(aBytes, bBytes)); break;
          case "and": result = fromBytes(ring.band(aBytes, bBytes)); break;
          case "or": result = fromBytes(ring.bor(aBytes, bBytes)); break;
        }
      }
      return result;
    }
  }
  throw new Error(`Unexpected term kind`);
}

// ── SHA-256 hex helper (SubtleCrypto) ───────────────────────────────────────

async function sha256hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── derive ──────────────────────────────────────────────────────────────────

/**
 * Derive a computation record from a Term.
 *
 * 1. Canonicalize the term (requirement R2: MUST happen before ID computation)
 * 2. Evaluate the canonical term to get the result
 * 3. Compute derivation ID: SHA-256 of "{canonical_serialization}={result_iri}"
 * 4. Return full Derivation with epistemic grade 'A' (algebraically proven)
 */
export async function derive(
  ring: UORRing,
  term: Term
): Promise<Derivation> {
  // R2: canonicalize BEFORE ID computation
  const canonical = canonicalize(term, ring.config);
  const canonicalStr = serializeTerm(canonical);
  const originalStr = serializeTerm(term);

  // Evaluate
  const resultValue = evaluateTerm(canonical, ring);
  const resultIri = contentAddress(ring, resultValue);

  // Derivation ID: SHA-256 of "{canonical}={iri}", first 16 hex chars
  const idInput = `${canonicalStr}=${resultIri}`;
  const hash = await sha256hex(idInput);
  const derivationId = `urn:uor:derivation:sha256:${hash.slice(0, 16)}`;

  // Metrics
  const originalComplexity = termComplexity(term);
  const canonicalComplexity = termComplexity(canonical);

  return {
    "@type": "derivation:Record",
    derivationId,
    originalTerm: originalStr,
    canonicalTerm: canonicalStr,
    resultValue,
    resultIri,
    epistemicGrade: "A",
    timestamp: new Date().toISOString(),
    metrics: {
      originalComplexity,
      canonicalComplexity,
      reductionRatio:
        originalComplexity > 0
          ? 1 - canonicalComplexity / originalComplexity
          : 0,
    },
  };
}

// ── verifyDerivation ────────────────────────────────────────────────────────

/**
 * Re-derive from the original term and compare derivation IDs.
 * If they match, the derivation is valid.
 */
export async function verifyDerivation(
  ring: UORRing,
  d: Derivation,
  originalTerm: Term
): Promise<boolean> {
  const rederived = await derive(ring, originalTerm);
  return rederived.derivationId === d.derivationId;
}
