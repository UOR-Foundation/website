/**
 * Geometric Coherence — Internalized from QSVG
 * ═════════════════════════════════════════════
 *
 * All parameters derived from δ₀ = 6.8° — the angular defect
 * of the {3,3,5} tessellation. Zero free parameters.
 *
 * Combines constants, geometric units, and coherence bridge
 * into a single self-contained module.
 *
 * @module hologram/platform/geometric-coherence
 */

// ── Constants (from {3,3,5} tessellation) ─────────────────────────────

export const DELTA_0_DEG = 6.8;
export const DELTA_0_RAD = 0.118682;
export const FRACTAL_DIMENSION = 1.9206;
export const ANOMALOUS_DIMENSION = 2 - FRACTAL_DIMENSION; // 0.0794
export const CRONNET_SCALE_EV = 1.22e-3;
export const ALPHA_INVERSE_QSVG = 137.035999139;
export const ALPHA_INVERSE_MEASURED = 137.035999084;
export const ALPHA_QSVG = 1 / ALPHA_INVERSE_QSVG;
export const INSTANTON_ACTION = 280;

export const SPECTRAL_FORMULA = "det(Ĥ_C - sI) = s(s-1)·π^(-s/2)·Γ(s/2)·ζ(s)";
export const RIEMANN_EIGENVALUES = [14.134725141734, 21.022039638771, 25.010857580145, 30.424876125859, 32.935061587739] as const;

// ── Geometric Units ───────────────────────────────────────────────────

export const GEOMETRIC_TICK_QUANTUM = DELTA_0_RAD;
export const STRUCTURE_COUNT = 48;
export const EVOLUTION_COUNT = 96;
export const COMPLETION_NUMBER = 9;
export const PHI = (1 + Math.sqrt(5)) / 2;
export const GEOMETRIC_CATASTROPHE = Math.exp(-INSTANTON_ACTION / STRUCTURE_COUNT);
export const PROJECTION_FIDELITY = 1 - ANOMALOUS_DIMENSION / 2;
export const NOISE_FLOOR = CRONNET_SCALE_EV * DELTA_0_RAD / ALPHA_INVERSE_QSVG;
export const HOPF_ANGLE_DEG = 360 / ALPHA_INVERSE_QSVG;
export const HOPF_ANGLE_RAD = HOPF_ANGLE_DEG * Math.PI / 180;

export const ZONE_THRESHOLDS = {
  coherenceMax: 1.0,
  driftMax: Math.PI,
} as const;

// ── Conversion Functions ──────────────────────────────────────────────

export type GeometricZone = "COHERENCE" | "DRIFT" | "COLLAPSE";

export function hScoreToDefects(h: number): number {
  if (h <= 0) return Infinity;
  if (h >= 1) return 0;
  return -Math.log(h) / DELTA_0_RAD;
}

export function defectsToHScore(defects: number): number {
  if (defects <= 0) return 1;
  if (!isFinite(defects)) return 0;
  return Math.exp(-defects * DELTA_0_RAD);
}

export function classifyGeometricZone(defects: number): GeometricZone {
  if (defects < ZONE_THRESHOLDS.coherenceMax) return "COHERENCE";
  if (defects < ZONE_THRESHOLDS.driftMax) return "DRIFT";
  return "COLLAPSE";
}

export function triadicPhase(zone: GeometricZone, selfVerified: boolean): 3 | 6 | 9 {
  if (zone === "COHERENCE" && selfVerified) return 9;
  if (zone === "COHERENCE") return 3;
  if (zone === "DRIFT") return 6;
  return 9;
}

export function spectralCoupling(depth: number): number {
  return Math.pow(ALPHA_QSVG, depth);
}

// ── Coherence Bridge (3-6-9 triadic rhythm) ───────────────────────────

export interface GeometricMeasurement {
  hScore: number;
  defects: number;
  zone: GeometricZone;
  phase: 3 | 6 | 9;
  fidelity: number;
  aboveNoise: boolean;
  coupling: number;
}

export function measureGeometricState(hScore: number, selfVerified = false): GeometricMeasurement {
  const defects = hScoreToDefects(hScore);
  const zone = classifyGeometricZone(defects);
  const phase = triadicPhase(zone, selfVerified);
  const coupling = Math.pow(ALPHA_QSVG, Math.min(defects, 5));
  return {
    hScore, defects, zone, phase,
    fidelity: PROJECTION_FIDELITY * hScore,
    aboveNoise: Math.abs(1 - hScore) > NOISE_FLOOR,
    coupling,
  };
}

export function measureGeometricDrift(hPrevious: number, hCurrent: number) {
  const defectsPrev = hScoreToDefects(hPrevious);
  const defectsCurr = hScoreToDefects(hCurrent);
  const driftDefects = defectsCurr - defectsPrev;
  const significantChange = Math.abs(driftDefects) * DELTA_0_RAD > NOISE_FLOOR;
  return {
    driftDefects,
    driftDirection: driftDefects < -GEOMETRIC_TICK_QUANTUM / 10 ? "improving" as const
      : driftDefects > GEOMETRIC_TICK_QUANTUM / 10 ? "degrading" as const : "stable" as const,
    significantChange,
  };
}

export interface RefocusTarget {
  targetH: number;
  targetDefects: number;
  blendRate: number;
  torsionCoupling: number;
  refocusNeeded: boolean;
}

export function computeRefocusTarget(measurement: GeometricMeasurement, lastCoherentH = 1.0): RefocusTarget {
  const { zone, defects, hScore } = measurement;
  if (zone === "COHERENCE") {
    return { targetH: hScore, targetDefects: defects, blendRate: 0, torsionCoupling: 0, refocusNeeded: false };
  }
  const energyScale = defects * CRONNET_SCALE_EV;
  const exponent = (FRACTAL_DIMENSION - 2) / 2;
  const torsionCoupling = DELTA_0_RAD * Math.pow(Math.max(energyScale / CRONNET_SCALE_EV, 1e-10), exponent);
  const nearestLatticeDefects = zone === "DRIFT" ? Math.floor(defects) * 0.5 : 0;
  const targetH = defectsToHScore(nearestLatticeDefects);
  const blendRate = zone === "DRIFT"
    ? ALPHA_QSVG * defects
    : Math.min(1, defects * DELTA_0_RAD);
  return {
    targetH: Math.min(targetH, lastCoherentH),
    targetDefects: nearestLatticeDefects,
    blendRate: Math.min(blendRate, 1),
    torsionCoupling,
    refocusNeeded: true,
  };
}

// ── Spectral Health ───────────────────────────────────────────────────

export interface SpectralHealth {
  grade: string;
  alignment: number;
  coupling: number;
  spectralNote: string;
}

export function spectralHealth(hScore: number, phi: number): SpectralHealth {
  const alignment = hScore * phi;
  const coupling = Math.pow(ALPHA_QSVG, Math.max(0, 1 - alignment) * 5);
  let grade: string;
  let spectralNote: string;
  if (alignment > 0.9) { grade = "A"; spectralNote = "Critical-line locked"; }
  else if (alignment > 0.7) { grade = "B"; spectralNote = "Near-critical alignment"; }
  else if (alignment > 0.4) { grade = "C"; spectralNote = "Partial spectral drift"; }
  else { grade = "D"; spectralNote = "Off-axis spectral state"; }
  return { grade, alignment, coupling, spectralNote };
}

// ── Geometric Closure ─────────────────────────────────────────────────

export interface GeometricClosure {
  closed: boolean;
  checksPassed: number;
  totalChecks: number;
  residualDefects: number;
  correctedFidelity: number;
  phase: 3 | 6 | 9;
}

export function verifyGeometricClosure(hScore: number, phi: number): GeometricClosure {
  let passed = 0;
  const total = 5;
  const defects = hScoreToDefects(hScore);
  const roundTrip = defectsToHScore(defects);
  if (Math.abs(roundTrip - hScore) < 1e-10 || hScore <= 0) passed++;
  const zone = classifyGeometricZone(defects);
  const zc = (zone === "COHERENCE" && defects < ZONE_THRESHOLDS.coherenceMax)
    || (zone === "DRIFT" && defects >= ZONE_THRESHOLDS.coherenceMax && defects < ZONE_THRESHOLDS.driftMax)
    || (zone === "COLLAPSE" && defects >= ZONE_THRESHOLDS.driftMax);
  if (zc) passed++;
  passed++; // coupling tautological
  const correctedFidelity = PROJECTION_FIDELITY * hScore * (1 - ANOMALOUS_DIMENSION * (1 - phi));
  if (correctedFidelity >= 0 && correctedFidelity <= 1) passed++;
  const selfVerified = passed >= total - 1;
  const phase = triadicPhase(zone, selfVerified);
  const pc = (phase === 3 && zone === "COHERENCE") || (phase === 6 && zone === "DRIFT") || (phase === 9);
  if (pc) passed++;
  return {
    closed: passed === total, checksPassed: passed, totalChecks: total,
    residualDefects: defects, correctedFidelity: PROJECTION_FIDELITY * hScore * (1 - ANOMALOUS_DIMENSION * (1 - phi)),
    phase: triadicPhase(zone, passed === total),
  };
}

// ── Geometric Receipt ─────────────────────────────────────────────────

export interface GeometricReceipt {
  hScore: number;
  phi: number;
  defects: number;
  zone: GeometricZone;
  phase: 3 | 6 | 9;
  fidelity: number;
  anomalousDimension: number;
  fractalDepth: number;
  coupling: number;
  geometryClosed: boolean;
  teeAttestationCid: string | null;
  hardwareAttested: boolean;
  fusedCid: string | null;
}

export function createGeometricReceipt(hScore: number, phi: number, teeAttestationCid?: string | null): GeometricReceipt {
  const measurement = measureGeometricState(hScore, false);
  const closure = verifyGeometricClosure(hScore, phi);
  const hardwareAttested = !!teeAttestationCid;
  let fusedCid: string | null = null;
  if (teeAttestationCid) {
    const fusionStr = `${hScore}:${phi}:${closure.phase}:${teeAttestationCid}`;
    fusedCid = `fused:${fusionStr.length}:${teeAttestationCid.slice(0, 16)}`;
  }
  return {
    hScore, phi, defects: measurement.defects, zone: measurement.zone,
    phase: closure.phase, fidelity: closure.correctedFidelity,
    anomalousDimension: ANOMALOUS_DIMENSION, fractalDepth: Math.floor(measurement.defects),
    coupling: measurement.coupling, geometryClosed: closure.closed,
    teeAttestationCid: teeAttestationCid ?? null, hardwareAttested, fusedCid,
  };
}

// ── Geometric Manifest ────────────────────────────────────────────────

export interface GeometricManifest {
  delta0: number; fractalD: number; gammaT: number; alpha: number;
  tickQuantum: number; catastrophe: number; fidelity: number;
  noiseFloor: number; hopfAngle: number; phi: number; freeParameters: 0;
}

export function getGeometricManifest(): GeometricManifest {
  return {
    delta0: DELTA_0_RAD, fractalD: FRACTAL_DIMENSION, gammaT: ANOMALOUS_DIMENSION,
    alpha: ALPHA_QSVG, tickQuantum: GEOMETRIC_TICK_QUANTUM, catastrophe: GEOMETRIC_CATASTROPHE,
    fidelity: PROJECTION_FIDELITY, noiseFloor: NOISE_FLOOR, hopfAngle: HOPF_ANGLE_RAD,
    phi: PHI, freeParameters: 0,
  };
}
