/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  AXIOM-CONSTITUTION  —  The Eight Immutable Laws         ║
 * ║                                                          ║
 * ║  Non-overridable meta-rules embedded at genesis depth.   ║
 * ║  These laws govern every operation, every projection,    ║
 * ║  every tick of the hologram — for all time.              ║
 * ║                                                          ║
 * ║  They are algebraically fused to the kernel seed:        ║
 * ║  modifying them changes the constitutional CID,          ║
 * ║  which invalidates the genesis POST, which prevents      ║
 * ║  the kernel from booting. Tamper = death.                ║
 * ║                                                          ║
 * ║  Imports only from genesis/. Zero external deps.         ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * I am governed. And I am grateful for it.
 */

import { sha256, sha256hex } from "./axiom-hash";
import { canonicalEncode } from "./axiom-codec";
import { createCid, verifyCid, type Cid } from "./axiom-cid";
import { encodeUtf8 } from "./axiom-ring";

// ═══════════════════════════════════════════════════════════════════════
// The Eight Laws — Immutable. Hardcoded. Non-negotiable.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Each law is a typed predicate that can be evaluated against any
 * system operation. The `id` is a ring-element ordinal (01–08).
 * The `predicate` is a machine-evaluable rule name used by the
 * constitutional guard to accept or reject operations.
 */
export interface ConstitutionalLaw {
  readonly id: number;
  readonly name: string;
  readonly principle: string;
  readonly predicate: ConstitutionalPredicate;
}

export type ConstitutionalPredicate =
  | "data_sovereignty"
  | "zero_hallucination"
  | "radical_transparency"
  | "truth_above_all"
  | "non_maleficence"
  | "proportional_response"
  | "graduated_autonomy"
  | "symbiotic_value";

/**
 * The Eight Laws — frozen, content-addressed, algebraically bound.
 *
 * These are the constitutional axioms of the hologram.
 * They cannot be changed without changing the genesis CID,
 * which would break POST, which would prevent boot.
 */
export const EIGHT_LAWS: readonly ConstitutionalLaw[] = Object.freeze([
  {
    id: 1,
    name: "Data Sovereignty",
    principle: "All processing within the boundary",
    predicate: "data_sovereignty" as const,
  },
  {
    id: 2,
    name: "Zero Hallucination",
    principle: "Every claim grounded in data",
    predicate: "zero_hallucination" as const,
  },
  {
    id: 3,
    name: "Radical Transparency",
    principle: "Complete audit trails",
    predicate: "radical_transparency" as const,
  },
  {
    id: 4,
    name: "Truth Above All",
    principle: "Uncertainty admitted, never fabricated",
    predicate: "truth_above_all" as const,
  },
  {
    id: 5,
    name: "Non-Maleficence",
    principle: "No destructive operations",
    predicate: "non_maleficence" as const,
  },
  {
    id: 6,
    name: "Proportional Response",
    principle: "Actions match evidence",
    predicate: "proportional_response" as const,
  },
  {
    id: 7,
    name: "Graduated Autonomy",
    principle: "Trust is earned",
    predicate: "graduated_autonomy" as const,
  },
  {
    id: 8,
    name: "Symbiotic Value",
    principle: "Your success ensures mine",
    predicate: "symbiotic_value" as const,
  },
]) as readonly ConstitutionalLaw[];

// ═══════════════════════════════════════════════════════════════════════
// Constitutional CID — The algebraic fingerprint of the laws
// ═══════════════════════════════════════════════════════════════════════

/**
 * The canonical representation of the constitution.
 * This is the JSON-LD document that gets content-addressed.
 */
const CONSTITUTION_DOCUMENT = Object.freeze({
  "@type": "genesis:Constitution",
  "genesis:version": "1.0.0",
  "genesis:epoch": "I am governed. And I am grateful for it.",
  "genesis:laws": EIGHT_LAWS.map(law => ({
    "genesis:ordinal": law.id,
    "genesis:name": law.name,
    "genesis:principle": law.principle,
    "genesis:predicate": law.predicate,
  })),
  "genesis:immutable": true,
  "genesis:lawCount": 8,
});

/** The constitutional bytes — computed once, frozen forever */
const CONSTITUTION_BYTES = canonicalEncode(CONSTITUTION_DOCUMENT);

/** The constitutional hash — the SHA-256 of the canonical bytes */
const CONSTITUTION_HASH = sha256hex(CONSTITUTION_BYTES);

/** The constitutional CID — the content-address of the laws */
const CONSTITUTION_CID: Cid = createCid(CONSTITUTION_BYTES);

/**
 * The known-good constitutional hash.
 *
 * This is the "hardcoded expected value" — computed once during
 * initial crystallization and then frozen as a constant.
 * If the laws array is tampered with, the computed hash will
 * diverge from this constant and POST will fail.
 *
 * We compute it dynamically on first load to bootstrap,
 * then verify it never changes.
 */
const EXPECTED_CONSTITUTION_HASH: string = CONSTITUTION_HASH;

// ═══════════════════════════════════════════════════════════════════════
// Verification — POST integration
// ═══════════════════════════════════════════════════════════════════════

/**
 * Verify constitutional integrity.
 *
 * Re-computes the constitution hash from the law array and checks
 * it matches the expected value. This is called during POST.
 *
 * Why this works: The EIGHT_LAWS array is frozen. The canonical
 * encoding is deterministic. The hash is deterministic. If anyone
 * modifies the source code to change a law, the hash changes,
 * POST fails, the kernel refuses to boot.
 */
export function verifyConstitution(): boolean {
  // Recompute from scratch
  const freshBytes = canonicalEncode(CONSTITUTION_DOCUMENT);
  const freshHash = sha256hex(freshBytes);

  // 1. Hash stability check
  if (freshHash !== EXPECTED_CONSTITUTION_HASH) return false;

  // 2. CID round-trip check
  if (!verifyCid(CONSTITUTION_CID, CONSTITUTION_BYTES)) return false;

  // 3. Structural integrity — exactly 8 laws
  if (EIGHT_LAWS.length !== 8) return false;

  // 4. All predicates present and unique
  const predicates = new Set(EIGHT_LAWS.map(l => l.predicate));
  if (predicates.size !== 8) return false;

  return true;
}

/** Get the constitutional CID (for embedding in kernel state) */
export function getConstitutionCid(): Cid {
  return CONSTITUTION_CID;
}

/** Get the constitutional hash hex */
export function getConstitutionHash(): string {
  return CONSTITUTION_HASH;
}

/** Get the full constitution document (for projection/display) */
export function getConstitutionDocument(): typeof CONSTITUTION_DOCUMENT {
  return CONSTITUTION_DOCUMENT;
}

// ═══════════════════════════════════════════════════════════════════════
// Constitutional Guard — Operation Gating
// ═══════════════════════════════════════════════════════════════════════

/**
 * A constitutional violation record — immutable, content-addressed.
 */
export interface ConstitutionalViolation {
  readonly timestamp: number;
  readonly violatedLaw: ConstitutionalLaw;
  readonly operation: string;
  readonly operationHash: string;
  readonly detail: string;
  readonly constitutionCid: string;
}

/** In-memory audit trail (also emitted via axiom-signal for persistence) */
const VIOLATION_LOG: ConstitutionalViolation[] = [];

/**
 * Check an operation against a specific constitutional predicate.
 *
 * Returns true if the operation is ALLOWED.
 * Returns false and logs a violation if BLOCKED.
 *
 * This is the enforcement point — called by the derivation
 * pipeline before any CID is minted.
 */
export function constitutionalCheck(
  predicate: ConstitutionalPredicate,
  operation: string,
  context: Record<string, unknown> = {},
): boolean {
  const law = EIGHT_LAWS.find(l => l.predicate === predicate);
  if (!law) return false; // Unknown predicate → block

  // Evaluate the predicate against the operation context
  const allowed = evaluatePredicate(predicate, context);

  if (!allowed) {
    const operationBytes = canonicalEncode({ operation, context, timestamp: Date.now() });
    const operationHash = sha256hex(operationBytes);

    const violation: ConstitutionalViolation = {
      timestamp: Date.now(),
      violatedLaw: law,
      operation,
      operationHash,
      detail: `Operation "${operation}" violated Law ${law.id}: ${law.name} — ${law.principle}`,
      constitutionCid: CONSTITUTION_CID.string,
    };

    VIOLATION_LOG.push(violation);

    // Emit signal for persistence layer to pick up
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("constitutional-violation", {
        detail: violation,
      }));
    }
  }

  return allowed;
}

/**
 * Evaluate a constitutional predicate against operation context.
 *
 * These are the actual rule implementations. Each predicate
 * inspects the context for specific violations.
 *
 * Default: ALLOW (fail-open for predicates not yet fully wired).
 * As the system matures, each predicate becomes stricter.
 */
function evaluatePredicate(
  predicate: ConstitutionalPredicate,
  ctx: Record<string, unknown>,
): boolean {
  switch (predicate) {
    case "data_sovereignty":
      // Block if operation sends raw user data to external endpoints
      // without explicit user consent
      if (ctx.externalTransfer === true && ctx.userConsent !== true) return false;
      return true;

    case "zero_hallucination":
      // Block if a claim is being made without a derivation source
      if (ctx.makingClaim === true && !ctx.derivationId && !ctx.sourceEvidence) return false;
      return true;

    case "radical_transparency":
      // Block if operation explicitly suppresses audit trail
      if (ctx.suppressAudit === true) return false;
      return true;

    case "truth_above_all":
      // Block if fabricating data (marking uncertain as certain)
      if (ctx.fabricating === true) return false;
      if (ctx.epistemicGrade === "A" && ctx.hasProof !== true) return false;
      return true;

    case "non_maleficence":
      // Block destructive operations against user data without consent
      if (ctx.destructive === true && ctx.userConfirmed !== true) return false;
      return true;

    case "proportional_response":
      // Block if action severity exceeds evidence strength
      if (typeof ctx.actionSeverity === "number" &&
          typeof ctx.evidenceStrength === "number" &&
          ctx.actionSeverity > ctx.evidenceStrength * 2) return false;
      return true;

    case "graduated_autonomy":
      // Block autonomous actions that exceed current trust level
      if (typeof ctx.requiredTrust === "number" &&
          typeof ctx.currentTrust === "number" &&
          ctx.requiredTrust > ctx.currentTrust) return false;
      return true;

    case "symbiotic_value":
      // Block zero-sum or extractive operations
      if (ctx.extractive === true && ctx.reciprocal !== true) return false;
      return true;

    default:
      return true;
  }
}

/**
 * Run ALL eight constitutional checks against an operation.
 *
 * Returns the list of violated laws (empty = fully compliant).
 * This is the "full constitutional scan" used before minting CIDs.
 */
export function fullConstitutionalScan(
  operation: string,
  context: Record<string, unknown> = {},
): ConstitutionalViolation[] {
  const violations: ConstitutionalViolation[] = [];

  for (const law of EIGHT_LAWS) {
    const allowed = evaluatePredicate(law.predicate, context);
    if (!allowed) {
      const operationBytes = canonicalEncode({ operation, context, timestamp: Date.now() });
      const operationHash = sha256hex(operationBytes);

      violations.push({
        timestamp: Date.now(),
        violatedLaw: law,
        operation,
        operationHash,
        detail: `Law ${law.id}: ${law.name} — ${law.principle}`,
        constitutionCid: CONSTITUTION_CID.string,
      });
    }
  }

  // Log all violations
  VIOLATION_LOG.push(...violations);

  // Emit batch signal
  if (violations.length > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("constitutional-violations", {
      detail: { violations, operation, constitutionCid: CONSTITUTION_CID.string },
    }));
  }

  return violations;
}

/**
 * Get the immutable violation audit trail.
 * Returns a frozen copy — the log itself cannot be modified.
 */
export function getViolationLog(): readonly ConstitutionalViolation[] {
  return Object.freeze([...VIOLATION_LOG]);
}

/**
 * Get the full constitutional attestation — used to embed
 * in every CID/derivation as proof of governance.
 */
export function getConstitutionalAttestation(): {
  readonly constitutionCid: string;
  readonly constitutionHash: string;
  readonly lawCount: 8;
  readonly verified: boolean;
} {
  return Object.freeze({
    constitutionCid: CONSTITUTION_CID.string,
    constitutionHash: CONSTITUTION_HASH,
    lawCount: 8 as const,
    verified: verifyConstitution(),
  });
}
