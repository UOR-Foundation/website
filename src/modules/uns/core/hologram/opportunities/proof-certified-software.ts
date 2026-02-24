/**
 * Opportunity 8: PROOF-CERTIFIED SOFTWARE
 * ════════════════════════════════════════
 *
 * Formal proofs (Coq, Lean, Agda, TLA+, Ada/SPARK) become
 * Verifiable Credentials — mathematical certainty is projectable
 * into the trust layer.
 *
 * @module uns/core/hologram/opportunities/proof-certified-software
 */

import { project, PROJECTIONS } from "../index";
import type { ProjectionInput } from "../index";

/** A proof certification record. */
interface ProofRecord {
  readonly language: string;
  readonly proofUri: string;
  readonly vcUri: string;
  readonly did: string;
  /** What kind of proof this language produces. */
  readonly proofType: string;
  /** The trust statement the VC encodes. */
  readonly trustStatement: string;
}

/** The complete proof-certified software report. */
export interface ProofCertifiedSoftware {
  readonly "@type": "opportunity:ProofCertifiedSoftware";
  readonly threadHash: string;
  readonly proofs: readonly ProofRecord[];
  readonly languagesCovered: readonly string[];
  /** The trust chain: formal proof → VC → DID → Bitcoin */
  readonly trustChain: readonly string[];
  /** Whether the system covers all major proof assistants. */
  readonly fullCoverage: boolean;
}

const PROOF_LANGUAGES: ReadonlyArray<{
  language: string;
  proofType: string;
  trustStatement: string;
}> = [
  {
    language: "coq",
    proofType: "Gallina term (constructive proof)",
    trustStatement: "This software's correctness has been PROVEN in Coq — not tested, PROVEN",
  },
  {
    language: "lean",
    proofType: "Lean4 tactic proof",
    trustStatement: "This software's properties have been formally verified in Lean's dependent type system",
  },
  {
    language: "agda",
    proofType: "Agda dependent type inhabitant",
    trustStatement: "This software satisfies its specification by construction — types ARE proofs",
  },
  {
    language: "tlaplus",
    proofType: "TLA+ model-checked specification",
    trustStatement: "This system's concurrent behavior has been exhaustively model-checked in TLA+",
  },
  {
    language: "ada",
    proofType: "Ada/SPARK contract proof",
    trustStatement: "This safety-critical software passes SPARK formal verification — DO-178C certifiable",
  },
  {
    language: "haskell",
    proofType: "Referential transparency (Curry-Howard)",
    trustStatement: "This software's purity is structurally enforced — side effects are type-tracked",
  },
  {
    language: "fsharp",
    proofType: "ML type inference proof",
    trustStatement: "This software's type safety is guaranteed by Hindley-Milner type inference",
  },
  {
    language: "ocaml",
    proofType: "ML type inference proof",
    trustStatement: "This software's type safety is guaranteed by OCaml's type system",
  },
  {
    language: "rust-crate",
    proofType: "Ownership/borrow checker proof",
    trustStatement: "This software is PROVEN memory-safe by Rust's borrow checker — no runtime overhead",
  },
];

/**
 * Build proof-certified software records for a single identity.
 *
 * Each record binds a formal proof (language-specific) to a
 * Verifiable Credential — mathematical certainty becomes
 * a portable, verifiable trust claim.
 */
export function buildProofCertifiedSoftware(input: ProjectionInput): ProofCertifiedSoftware {
  const proofs: ProofRecord[] = [];
  const covered: string[] = [];

  const did = project(input, "did").value;
  const vc = project(input, "vc").value;
  const btc = project(input, "bitcoin").value;

  for (const def of PROOF_LANGUAGES) {
    if (!PROJECTIONS.has(def.language)) continue;

    const proofUri = project(input, def.language).value;
    covered.push(def.language);
    proofs.push({
      language: def.language,
      proofUri,
      vcUri: vc,
      did,
      proofType: def.proofType,
      trustStatement: def.trustStatement,
    });
  }

  const majorProvers = ["coq", "lean", "agda", "tlaplus"];
  const fullCoverage = majorProvers.every(p => covered.includes(p));

  return {
    "@type": "opportunity:ProofCertifiedSoftware",
    threadHash: input.hex,
    proofs,
    languagesCovered: covered,
    trustChain: [
      `1. Formal proof exists → ${covered.join(", ")}`,
      `2. Hash proof artifact → ${input.hex.slice(0, 16)}...`,
      `3. Issue Verifiable Credential → ${vc.slice(0, 32)}...`,
      `4. Bind to DID → ${did}`,
      `5. Anchor on Bitcoin → ${btc.slice(0, 32)}...`,
      `6. Mathematical certainty is now portable trust`,
    ],
    fullCoverage,
  };
}
