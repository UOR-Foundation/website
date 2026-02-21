/**
 * UOR Epistemic Upgrader — promotes data to higher trust levels.
 *
 * Grades can only go UP, never down:
 *   D → C → B → A
 *
 * Delegates to:
 *   - derivation for derive() and certificate issuance
 *   - ring-core for ring verification
 *   - kg-store for persistence
 */

import type { EpistemicGrade } from "@/types/uor";
import type { UORRing } from "@/modules/ring-core/ring";
import type { Term } from "@/modules/ring-core/canonicalization";
import { derive } from "@/modules/derivation/derivation";
import { issueCertificate } from "@/modules/derivation/certificate";
import type { Derivation } from "@/modules/derivation/derivation";
import type { Certificate } from "@/modules/derivation/certificate";
import { ingestDerivation, ingestCertificate } from "@/modules/kg-store/store";

// ── Types ───────────────────────────────────────────────────────────────────

export interface UpgradeResult {
  previousGrade: EpistemicGrade;
  newGrade: EpistemicGrade;
  upgraded: boolean;
  derivation?: Derivation;
  certificate?: Certificate;
}

// ── Grade ordering ──────────────────────────────────────────────────────────

const GRADE_ORDER: Record<EpistemicGrade, number> = { D: 0, C: 1, B: 2, A: 3 };

function isHigherGrade(from: EpistemicGrade, to: EpistemicGrade): boolean {
  return GRADE_ORDER[to] > GRADE_ORDER[from];
}

// ── upgradeToA ──────────────────────────────────────────────────────────────

/**
 * Upgrade a datum to Grade A by deriving it and issuing a certificate.
 * Only upgrades if current grade is below A.
 */
export async function upgradeToA(
  ring: UORRing,
  value: number,
  currentGrade: EpistemicGrade
): Promise<UpgradeResult> {
  if (!isHigherGrade(currentGrade, "A")) {
    return { previousGrade: currentGrade, newGrade: currentGrade, upgraded: false };
  }

  // Ensure ring coherence (R4)
  if (!ring.coherenceVerified) ring.verify();

  // Build term for this value
  const term: Term = { kind: "const", value };

  // Derive
  const derivation = await derive(ring, term);

  // Issue certificate
  const certificate = await issueCertificate(derivation, ring, term);

  // Persist
  await ingestDerivation(derivation, ring.quantum);
  await ingestCertificate(certificate);

  return {
    previousGrade: currentGrade,
    newGrade: "A",
    upgraded: true,
    derivation,
    certificate,
  };
}

// ── upgradeToB ──────────────────────────────────────────────────────────────

/**
 * Upgrade a datum to Grade B by issuing a certificate (without full derivation).
 * Only upgrades if current grade is below B.
 */
export async function upgradeToB(
  ring: UORRing,
  value: number,
  currentGrade: EpistemicGrade
): Promise<UpgradeResult> {
  if (!isHigherGrade(currentGrade, "B")) {
    return { previousGrade: currentGrade, newGrade: currentGrade, upgraded: false };
  }

  // Derive minimally for the certificate
  const term: Term = { kind: "const", value };
  const derivation = await derive(ring, term);
  const certificate = await issueCertificate(derivation, ring, term);
  await ingestCertificate(certificate);

  return {
    previousGrade: currentGrade,
    newGrade: "B",
    upgraded: true,
    certificate,
  };
}
