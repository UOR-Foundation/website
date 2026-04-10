/**
 * Aesthetics Conformance Gate
 * ═══════════════════════════
 *
 * Codifies aesthetic sensibilities as declarative, machine-verifiable
 * constraints derived from Algebrica + Aman design languages.
 *
 * 12 checks across 4 categories:
 *   1. Typography Coherence
 *   2. Spatial Harmony
 *   3. Chromatic Restraint
 *   4. Proportional Integrity
 *
 * @module canonical-compliance/gates/aesthetics-gate
 */

import {
  registerGate,
  buildGateResult,
  type GateFinding,
} from "./gate-runner";

import {
  PHI,
  PHI_INV,
  SPACE,
  TYPE,
  LINE_HEIGHT,
  CONTENT,
  RHYTHM,
  OPACITY,
  SHADOW,
  MEDIA,
} from "../../desktop/lib/golden-ratio";

// ── Constants ────────────────────────────────────────────────────────────

const GATE_ID = "aesthetics-conformance";
const GATE_NAME = "Aesthetic Coherence (A14)";

const PHI_TOLERANCE = 0.15; // 15% tolerance for φ-progression checks
const MIN_BODY_FONT = 16;
const MIN_CAPTION_FONT = 11;
const LINE_HEIGHT_MIN = 1.5;
const LINE_HEIGHT_MAX = 1.9;
const CONTENT_MEASURE_MIN = 600;
const CONTENT_MEASURE_MAX = 720;
const MAX_SHADOW_LEVELS = 4;

// Expected φ-inverse opacity decay
const EXPECTED_OPACITY_CHAIN = [0.90, 0.556, 0.344, 0.213];

// ── Helpers ──────────────────────────────────────────────────────────────

function withinTolerance(actual: number, expected: number, tol: number): boolean {
  return Math.abs(actual - expected) / expected <= tol;
}

// ── Gate Implementation ──────────────────────────────────────────────────

function runAestheticsGate() {
  const findings: GateFinding[] = [];

  // ═══════════════════════════════════════════════════════════════════════
  // Category 1: Typography Coherence
  // ═══════════════════════════════════════════════════════════════════════

  // 1a. Body font ≥ 16px
  if (TYPE.body < MIN_BODY_FONT) {
    findings.push({
      severity: "error",
      title: "Body font too small",
      detail: `TYPE.body is ${TYPE.body}px, minimum is ${MIN_BODY_FONT}px. Small body text degrades readability and contradicts the clarity principle.`,
      file: "src/modules/desktop/lib/golden-ratio.ts",
      recommendation: `Set TYPE.body ≥ ${MIN_BODY_FONT}px.`,
    });
  }

  // 1b. Caption font ≥ 11px
  if (TYPE.caption < MIN_CAPTION_FONT) {
    findings.push({
      severity: "error",
      title: "Caption font too small",
      detail: `TYPE.caption is ${TYPE.caption}px, minimum is ${MIN_CAPTION_FONT}px. Text below 11px is illegible on most displays.`,
      file: "src/modules/desktop/lib/golden-ratio.ts",
      recommendation: `Set TYPE.caption ≥ ${MIN_CAPTION_FONT}px.`,
    });
  }

  // 1c. Body line height between 1.5–1.9
  if (LINE_HEIGHT.body < LINE_HEIGHT_MIN || LINE_HEIGHT.body > LINE_HEIGHT_MAX) {
    findings.push({
      severity: "warning",
      title: "Body line height out of optimal range",
      detail: `LINE_HEIGHT.body is ${LINE_HEIGHT.body}, optimal range is ${LINE_HEIGHT_MIN}–${LINE_HEIGHT_MAX}. Research shows this range maximizes reading comprehension for extended text.`,
      file: "src/modules/desktop/lib/golden-ratio.ts",
      recommendation: `Set LINE_HEIGHT.body between ${LINE_HEIGHT_MIN} and ${LINE_HEIGHT_MAX}.`,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Category 2: Spatial Harmony
  // ═══════════════════════════════════════════════════════════════════════

  // 2a. Spacing scale follows φ-progression
  const spaceValues = [SPACE.xs, SPACE.sm, SPACE.md, SPACE.lg, SPACE.xl, SPACE.xxl, SPACE.xxxl];
  let phiViolations = 0;

  for (let i = 1; i < spaceValues.length; i++) {
    const expectedNext = spaceValues[i - 1] * PHI;
    if (!withinTolerance(spaceValues[i], expectedNext, PHI_TOLERANCE)) {
      phiViolations++;
    }
  }

  if (phiViolations > 0) {
    findings.push({
      severity: phiViolations > 2 ? "error" : "warning",
      title: "Spacing scale deviates from φ-progression",
      detail: `${phiViolations} of ${spaceValues.length - 1} spacing steps deviate from φ (1.618) by more than ${PHI_TOLERANCE * 100}%. The scale should follow: each step ≈ previous × ${PHI}.`,
      file: "src/modules/desktop/lib/golden-ratio.ts",
      recommendation: "Realign spacing steps to φ-progression: 4 → 6 → 10 → 16 → 26 → 42 → 68.",
    });
  }

  // 2b. Content measure between 600–720px
  if (CONTENT.bodyMaxWidth < CONTENT_MEASURE_MIN || CONTENT.bodyMaxWidth > CONTENT_MEASURE_MAX) {
    findings.push({
      severity: "warning",
      title: "Content measure outside optimal range",
      detail: `CONTENT.bodyMaxWidth is ${CONTENT.bodyMaxWidth}px, optimal range is ${CONTENT_MEASURE_MIN}–${CONTENT_MEASURE_MAX}px. This range yields 65-75 characters per line at body font size.`,
      file: "src/modules/desktop/lib/golden-ratio.ts",
      recommendation: `Set CONTENT.bodyMaxWidth between ${CONTENT_MEASURE_MIN} and ${CONTENT_MEASURE_MAX}px.`,
    });
  }

  // 2c. Section spacing uses φ² (2.618em)
  const sectionTop = parseFloat(RHYTHM.sectionSpacingTop);
  const expectedPhiSq = PHI * PHI; // 2.618

  if (!withinTolerance(sectionTop, expectedPhiSq, PHI_TOLERANCE)) {
    findings.push({
      severity: "warning",
      title: "Section spacing not φ²-proportioned",
      detail: `RHYTHM.sectionSpacingTop is ${RHYTHM.sectionSpacingTop}, expected ≈ ${expectedPhiSq.toFixed(3)}em (φ²). Generous section spacing creates visual breathing room.`,
      file: "src/modules/desktop/lib/golden-ratio.ts",
      recommendation: `Set RHYTHM.sectionSpacingTop to "${expectedPhiSq.toFixed(3)}em".`,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Category 3: Chromatic Restraint
  // ═══════════════════════════════════════════════════════════════════════

  // 3a. Opacity hierarchy follows φ-inverse decay
  const opacityValues = [OPACITY.primary, OPACITY.secondary, OPACITY.tertiary, OPACITY.ghost];
  let opacityDrift = 0;

  for (let i = 0; i < opacityValues.length; i++) {
    if (!withinTolerance(opacityValues[i], EXPECTED_OPACITY_CHAIN[i], PHI_TOLERANCE)) {
      opacityDrift++;
    }
  }

  if (opacityDrift > 0) {
    findings.push({
      severity: "warning",
      title: "Opacity hierarchy deviates from φ⁻¹ decay",
      detail: `${opacityDrift} opacity values deviate from the expected φ⁻¹ decay chain: ${EXPECTED_OPACITY_CHAIN.join(" → ")}. This decay creates a natural visual hierarchy.`,
      file: "src/modules/desktop/lib/golden-ratio.ts",
      recommendation: "Realign opacity values: primary × φ⁻¹ → secondary × φ⁻¹ → tertiary × φ⁻¹ → ghost.",
    });
  }

  // 3b. Shadow scale ≤ 4 levels (no noise)
  const shadowCount = Object.keys(SHADOW).length;
  if (shadowCount > MAX_SHADOW_LEVELS) {
    findings.push({
      severity: "warning",
      title: "Excessive shadow depth levels",
      detail: `SHADOW has ${shadowCount} levels, maximum is ${MAX_SHADOW_LEVELS}. Too many shadow depths create visual noise and undermine the simplicity principle.`,
      file: "src/modules/desktop/lib/golden-ratio.ts",
      recommendation: `Reduce SHADOW to ≤ ${MAX_SHADOW_LEVELS} levels (e.g. subtle, panel, window, active).`,
    });
  }

  // 3c. Paragraph spacing uses φ (1.618em)
  const paraSpacing = parseFloat(RHYTHM.paragraphSpacing);
  if (!withinTolerance(paraSpacing, PHI, PHI_TOLERANCE)) {
    findings.push({
      severity: "info",
      title: "Paragraph spacing not φ-proportioned",
      detail: `RHYTHM.paragraphSpacing is ${RHYTHM.paragraphSpacing}, expected ≈ ${PHI}em. φ-proportioned paragraph spacing creates natural reading rhythm.`,
      file: "src/modules/desktop/lib/golden-ratio.ts",
      recommendation: `Set RHYTHM.paragraphSpacing to "${PHI}em".`,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Category 4: Proportional Integrity
  // ═══════════════════════════════════════════════════════════════════════

  // 4a. Hero aspect ratio = φ:1 (1.618)
  const heroRatio = MEDIA.heroAspectRatio;
  if (!heroRatio.includes("1.618")) {
    findings.push({
      severity: "warning",
      title: "Hero aspect ratio not φ:1",
      detail: `MEDIA.heroAspectRatio is "${heroRatio}", expected to contain "1.618". The golden ratio aspect ratio creates cinematic visual proportions.`,
      file: "src/modules/desktop/lib/golden-ratio.ts",
      recommendation: 'Set MEDIA.heroAspectRatio to "1.618 / 1".',
    });
  }

  // 4b. Float width = φ⁻¹ (38.2%)
  const floatPct = parseFloat(MEDIA.floatWidth);
  if (!withinTolerance(floatPct, PHI_INV * 100, PHI_TOLERANCE)) {
    findings.push({
      severity: "warning",
      title: "Float width not φ⁻¹ proportioned",
      detail: `MEDIA.floatWidth is ${MEDIA.floatWidth}, expected ≈ ${(PHI_INV * 100).toFixed(1)}%. Float elements should occupy the golden ratio inverse of their container.`,
      file: "src/modules/desktop/lib/golden-ratio.ts",
      recommendation: `Set MEDIA.floatWidth to "${(PHI_INV * 100).toFixed(1)}%".`,
    });
  }

  // 4c. Optical center at φ⁻¹ (38.2%)
  if (CONTENT.opticalCenter !== 38.2) {
    findings.push({
      severity: "warning",
      title: "Optical center not at φ⁻¹",
      detail: `CONTENT.opticalCenter is ${CONTENT.opticalCenter}%, expected 38.2% (φ⁻¹). The optical center should sit at the golden ratio inverse point for natural visual balance.`,
      file: "src/modules/desktop/lib/golden-ratio.ts",
      recommendation: "Set CONTENT.opticalCenter to 38.2.",
    });
  }

  return buildGateResult(GATE_ID, GATE_NAME, findings);
}

// ── Register ─────────────────────────────────────────────────────────────

registerGate(runAestheticsGate);
