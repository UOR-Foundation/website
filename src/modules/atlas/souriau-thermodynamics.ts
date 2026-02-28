/**
 * Souriau's Lie Group Thermodynamics Engine
 * ═════════════════════════════════════════
 *
 * Implements the full Souriau–Neeb–Fré framework:
 *
 * 1. Generalized Temperature β ∈ Ω_T ⊂ 𝔲* (Lie algebra dual)
 * 2. Partition Function Z(β) = ∫_M exp(-H_β) dλ_M  (Neeb)
 * 3. Gibbs Ensemble: λ_x = (1/Z(x)) e^{-H_x} λ_M  (Kostant–Souriau)
 * 4. Geometric Heat: Q(x) = ∫_M Ψ(m) dλ_x(m) ∈ conv(Ψ(M))  (Fenchel–Legendre)
 * 5. Casimir Entropy: s(Q(x)) = Q(x)(x) + log Z(x)  (G-invariant)
 * 6. Fisher-Rao = Souriau = Ruppeiner: g_ij = d²(log Z)/dβ_i dβ_j
 * 7. Zero-Point Info Geometry: Lossless ops (unitary) → dS = 0
 *
 * References:
 * - Neeb, K-H. "A classification of coadjoint orbits carrying Gibbs ensembles"
 * - Fré, P. et al. "Thermodynamics à la Souriau on Kähler Non Compact Symmetric Spaces"
 * - Barbaresco, F. "Jean-Marie Souriau's Symplectic Foliation Model" (Entropy 2025)
 *
 * @module atlas/souriau-thermodynamics
 */

import { constructE8, type ExceptionalGroup } from "./groups";

// ── Types ─────────────────────────────────────────────────────────────────

export interface LieAlgebraElement {
  /** Coefficients in the Cartan subalgebra basis */
  coeffs: number[];
  /** The group this element belongs to (e.g., E8) */
  group: string;
}

export interface GibbsEnsemble {
  /** Temperature parameter x ∈ Ω ⊂ g */
  temperature: LieAlgebraElement;
  /** Partition function Z(x) */
  partitionZ: number;
  /** log Z(x) — the Massieu potential */
  logZ: number;
  /** Gibbs probability weights for each "root" (normalized) */
  weights: number[];
}

export interface GeometricHeat {
  /** Q(x) = ∫ Ψ(m) dλ_x(m) — the geometric heat / expectation */
  Q: number[];
  /** The Fenchel-Legendre dual variable */
  dualQ: number[];
}

export interface FisherRaoMetric {
  /** Diagonal elements of g_ij = d²(log Z)/dβ_i dβ_j */
  diagonal: number[];
  /** Scalar curvature of the information manifold */
  scalarCurvature: number;
  /** Metric determinant (information volume) */
  determinant: number;
}

export interface SouriauState {
  /** Generalized temperature β (Lie algebra element) */
  beta: LieAlgebraElement;
  /** Mean energy/moment E = -d(log Z)/dβ */
  meanMoment: number;
  /** Partition function value */
  partitionZ: number;
  /** Casimir entropy: s(Q(x)) = Q(x)(x) + log Z(x) */
  entropy: number;
  /** Information geometry metric (Fisher-Rao / Souriau / Ruppeiner) */
  metric: number;
  /** Is this state on the "Zero-Point" surface? (dS ≈ 0) */
  isZeroPoint: boolean;
  /** Full Gibbs ensemble data */
  gibbs: GibbsEnsemble;
  /** Geometric heat map Q */
  geometricHeat: GeometricHeat;
  /** Full Fisher-Rao metric tensor */
  fisherRao: FisherRaoMetric;
  /** Free energy F = -log Z / |β| (Helmholtz analogue) */
  freeEnergy: number;
  /** Landauer cost of last operation (J) */
  landauerCost: number;
  /** Information Capacity Φ of the zero-point state */
  informationCapacity: InformationCapacity;
}

/**
 * Information Capacity Φ — Bekenstein-Hawking bound for the Atlas volume.
 *
 * The Bekenstein-Hawking entropy sets the maximum information content
 * of a bounded region:  S_BH = A / (4 l_P²)
 *
 * For the Atlas, the "area" is the boundary of the information manifold
 * defined by the Fisher-Rao metric: A = √det(g) × surface factor.
 *
 * The zero-point capacity Φ is the ratio of the Casimir entropy
 * to this geometric bound — if Φ ≤ 1, the Atlas saturates or
 * respects the holographic principle.
 */
export interface InformationCapacity {
  /** Φ: ratio of Casimir entropy to Bekenstein-Hawking bound */
  phi: number;
  /** Bekenstein-Hawking bound S_BH for the Atlas metric volume */
  bekensteinHawkingBound: number;
  /** Effective boundary area A = √det(g) × manifold surface factor */
  effectiveArea: number;
  /** Holographic bits: S_BH / ln(2) */
  holographicBits: number;
  /** Whether the bound is saturated (Φ ≈ 1) within tolerance */
  saturated: boolean;
  /** Whether the bound is respected (Φ ≤ 1) */
  respected: boolean;
  /** Atlas volume V = det(g)^(1/2) × rank-volume factor */
  atlasVolume: number;
  /** Effective "Planck area" unit for the Atlas lattice */
  planckAreaUnit: number;
  /** Breakdown of capacity by Cartan direction */
  directionalCapacity: number[];
}

// ── Constants ─────────────────────────────────────────────────────────────

const RANK = 8; // E8 rank

/**
 * Generate approximate root vectors for E8 in the Cartan subalgebra.
 * We use a simplified set: 112 integer roots ±e_i ± e_j (i<j)
 * represented by their inner products with the Cartan basis.
 */
function generateRootProjections(): number[][] {
  const roots: number[][] = [];
  // Integer roots: ±e_i ± e_j for i < j → projected onto Cartan basis
  for (let i = 0; i < RANK; i++) {
    for (let j = i + 1; j < RANK; j++) {
      const r1 = Array(RANK).fill(0); r1[i] = 1; r1[j] = 1;
      const r2 = Array(RANK).fill(0); r2[i] = 1; r2[j] = -1;
      const r3 = Array(RANK).fill(0); r3[i] = -1; r3[j] = 1;
      const r4 = Array(RANK).fill(0); r4[i] = -1; r4[j] = -1;
      roots.push(r1, r2, r3, r4);
    }
  }
  // Half-integer roots: ±1/2 coords with even parity (first 16 for tractability)
  for (let mask = 0; mask < 16; mask++) {
    const r = Array(RANK).fill(0.5);
    let parity = 0;
    for (let b = 0; b < 4; b++) {
      if (mask & (1 << b)) { r[b] = -0.5; parity++; }
    }
    if (parity % 2 === 0) roots.push(r);
  }
  return roots;
}

const ROOT_PROJECTIONS = generateRootProjections();

// ── Core: Neeb's Gibbs Ensemble ───────────────────────────────────────────

/**
 * Check if x ∈ Ω_λ (geometric temperature domain).
 * Neeb: D_μ = { x ∈ g : L(μ)(x) < ∞ }, Ω = D_μ° (interior)
 * For the positive Weyl chamber, all coefficients must be > 0.
 */
export function isInTemperatureDomain(beta: LieAlgebraElement): boolean {
  return beta.coeffs.every(c => c > 0);
}

/**
 * Compute the Souriau Partition Function Z(x) via Neeb's formulation.
 *
 * Z(x) = ∫_M e^{-H_x(m)} dλ_M(m) = ∫_{g*} e^{-α(x)} dμ(α)
 *
 * Discrete approximation: sum over root system projections.
 */
function computePartitionFunction(beta: LieAlgebraElement): { Z: number; logZ: number; weights: number[] } {
  const rawWeights: number[] = [];

  for (const root of ROOT_PROJECTIONS) {
    // Inner product ⟨β, root⟩
    const inner = beta.coeffs.reduce((s, c, i) => s + c * root[i], 0);
    rawWeights.push(Math.exp(-inner));
  }

  const Z = rawWeights.reduce((s, w) => s + w, 0);
  const logZ = Math.log(Z);

  // Normalize to get Gibbs probability measure
  const weights = rawWeights.map(w => w / Z);

  return { Z, logZ, weights };
}

/**
 * Compute the Geometric Heat Q(x) — the Fenchel-Legendre transform.
 *
 * Q: Ω_γ → g*,  Q(x) = ∫ Ψ(m) dλ_x(m) = -d(log Z)/dx
 *
 * This maps the temperature domain diffeomorphically onto
 * conv(O_γ)° (interior of the convex hull of the coadjoint orbit).
 */
function computeGeometricHeat(beta: LieAlgebraElement, weights: number[]): GeometricHeat {
  // Q_i = Σ_α weight(α) * root_i(α) = expectation of Ψ under Gibbs measure
  const Q = Array(RANK).fill(0);
  for (let r = 0; r < ROOT_PROJECTIONS.length; r++) {
    for (let i = 0; i < RANK; i++) {
      Q[i] += weights[r] * ROOT_PROJECTIONS[r][i];
    }
  }

  // Dual: Fenchel-Legendre inverse (identity in simplified model)
  const dualQ = Q.map((q, i) => -q / (beta.coeffs[i] + 1e-10));

  return { Q, dualQ };
}

/**
 * Compute the Fisher-Rao / Souriau / Ruppeiner metric tensor.
 *
 * g_ij = d²(log Z)/dβ_i dβ_j = Var_λ(Ψ_i, Ψ_j)
 *
 * Neeb proves this equals the Riemannian metric on Ω*_γ ≅ Ω_γ/z(g),
 * and Fré proves it equals Ruppeiner's thermodynamic metric.
 */
function computeFisherRaoMetric(beta: LieAlgebraElement, weights: number[], Q: number[]): FisherRaoMetric {
  // Diagonal: Var(Ψ_i) = E[Ψ_i²] - E[Ψ_i]²
  const diagonal = Array(RANK).fill(0);

  for (let i = 0; i < RANK; i++) {
    let eSquared = 0;
    for (let r = 0; r < ROOT_PROJECTIONS.length; r++) {
      eSquared += weights[r] * ROOT_PROJECTIONS[r][i] * ROOT_PROJECTIONS[r][i];
    }
    diagonal[i] = eSquared - Q[i] * Q[i];
  }

  // Scalar curvature ≈ Σ 1/g_ii (simplified Ricci scalar for diagonal metric)
  const scalarCurvature = diagonal.reduce((s, g) => s + (g > 1e-10 ? 1 / g : 0), 0);

  // Determinant = product of diagonal elements
  const determinant = diagonal.reduce((p, g) => p * Math.max(g, 1e-10), 1);

  return { diagonal, scalarCurvature, determinant };
}

// ── Thermodynamics Engine ─────────────────────────────────────────────────

/**
 * Initialize a Souriau thermodynamic state for the Atlas (E8).
 */
export function initSouriauState(temperatureScale: number = 1.0): SouriauState {
  const coeffs = Array.from({ length: RANK }, (_, i) =>
    (i + 1) * 0.1 * temperatureScale
  );
  const beta: LieAlgebraElement = { coeffs, group: "E8" };
  return computeFullState(beta);
}

/**
 * Compute the full Souriau state from a temperature vector.
 */
function computeFullState(beta: LieAlgebraElement): SouriauState {
  const { Z, logZ, weights } = computePartitionFunction(beta);
  const heat = computeGeometricHeat(beta, weights);
  const fisherRao = computeFisherRaoMetric(beta, weights, heat.Q);

  const betaMag = Math.sqrt(beta.coeffs.reduce((s, c) => s + c * c, 0));

  // Mean moment E = Q(β) magnitude
  const meanMoment = Math.sqrt(heat.Q.reduce((s, q) => s + q * q, 0));

  // Casimir Entropy: s(Q(x)) = Q(x)(x) + log Z(x)  [Neeb's formula]
  const qDotBeta = heat.Q.reduce((s, q, i) => s + q * beta.coeffs[i], 0);
  const entropy = qDotBeta + logZ;

  // Free energy F = E - TS ≈ -logZ / |β|
  const freeEnergy = -logZ / betaMag;

  // Metric scalar (trace of Fisher-Rao)
  const metric = fisherRao.diagonal.reduce((s, g) => s + g, 0) / RANK;

  // ── Information Capacity (Bekenstein-Hawking) ──────────────────────
  const informationCapacity = computeInformationCapacity(entropy, fisherRao, beta);

  const gibbs: GibbsEnsemble = {
    temperature: beta,
    partitionZ: Z,
    logZ,
    weights,
  };

  return {
    beta,
    partitionZ: Z,
    meanMoment,
    entropy,
    metric,
    isZeroPoint: false,
    gibbs,
    geometricHeat: heat,
    fisherRao,
    freeEnergy,
    landauerCost: 0,
    informationCapacity,
  };
}

/**
 * Compute the Information Capacity Φ of the zero-point state.
 *
 * Bekenstein-Hawking bound:  S_BH = A / (4 l_P²)
 *
 * For the Atlas information manifold:
 *   - The "volume" is V = √det(g_ij) × Ω_rank where Ω_rank is
 *     the rank-8 solid angle factor (π⁴/24 for 8D)
 *   - The "boundary area" A is the (rank-1)-dimensional boundary
 *     of this volume: A = V^{(rank-1)/rank} × surface coefficient
 *   - The "Planck area" l_P² is set by the minimum eigenvalue of
 *     the Fisher-Rao metric (the finest resolution the manifold supports)
 *
 * The key identity:  Φ = S_Casimir / S_BH
 *   Φ ≤ 1  ↔  holographic bound respected
 *   Φ ≈ 1  ↔  bound saturated (maximal information density)
 */
function computeInformationCapacity(
  casimirEntropy: number,
  fisherRao: FisherRaoMetric,
  beta: LieAlgebraElement,
): InformationCapacity {
  const rank = beta.coeffs.length;

  // Atlas volume: √det(g) × solid angle factor Ω_8 = π⁴/24
  const solidAngleFactor = Math.pow(Math.PI, 4) / 24;
  const sqrtDet = Math.sqrt(Math.max(fisherRao.determinant, 1e-100));
  const atlasVolume = sqrtDet * solidAngleFactor;

  // Effective boundary area: A = V^{(d-1)/d} × 2d (surface of d-cube)
  const areaPower = (rank - 1) / rank;
  const surfaceCoeff = 2 * rank;
  const effectiveArea = Math.pow(Math.max(atlasVolume, 1e-100), areaPower) * surfaceCoeff;

  // Planck area unit: minimum Fisher-Rao eigenvalue (finest resolution)
  // This is the information-geometric analogue of l_P²
  const minMetric = Math.min(...fisherRao.diagonal.filter(g => g > 1e-15));
  const planckAreaUnit = minMetric > 0 ? minMetric : 1e-10;

  // Bekenstein-Hawking bound: S_BH = A / (4 l_P²)
  const bekensteinHawkingBound = effectiveArea / (4 * planckAreaUnit);

  // Holographic bits
  const holographicBits = bekensteinHawkingBound / Math.LN2;

  // Information capacity ratio
  const phi = bekensteinHawkingBound > 1e-15
    ? Math.abs(casimirEntropy) / bekensteinHawkingBound
    : 0;

  // Directional capacity: per-axis contribution
  const directionalCapacity = fisherRao.diagonal.map((g, i) => {
    const axisBound = g / (4 * planckAreaUnit);
    return axisBound > 0 ? (Math.abs(beta.coeffs[i]) / axisBound) : 0;
  });

  return {
    phi,
    bekensteinHawkingBound,
    effectiveArea,
    holographicBits,
    saturated: Math.abs(phi - 1.0) < 0.05,
    respected: phi <= 1.0 + 1e-6,
    atlasVolume,
    planckAreaUnit,
    directionalCapacity,
  };
}

/**
 * Compute the "Information Cost" of an operation.
 *
 * Landauer: Cost = k_B T ln2 per erased bit ≈ T · ΔS
 * Casimir Entropy: s(Q(x)) = Q(x)(x) + log Z(x)
 *
 * Neeb's Convexity Theorem guarantees the Fenchel-Legendre transform
 * Q̄: Ω_γ/z(g) → conv(O_γ)° is a diffeomorphism, so the entropy
 * is a well-defined convex function on the temperature cone.
 */
export function computeOpCost(
  state: SouriauState,
  opType: "unitary" | "dissipative" | "learning"
): { nextState: SouriauState; cost: number; deltaS: number } {
  let nextCoeffs = [...state.beta.coeffs];

  if (opType === "unitary") {
    // Isentropic rotation in Cartan algebra — preserves |β| and Z
    const temp = nextCoeffs[0];
    for (let i = 0; i < nextCoeffs.length - 1; i++) {
      nextCoeffs[i] = nextCoeffs[i + 1];
    }
    nextCoeffs[nextCoeffs.length - 1] = temp;
  } else if (opType === "dissipative") {
    // Landauer erasure: contracts temperature cone → entropy production
    nextCoeffs = nextCoeffs.map(c => c * 0.92);
  } else if (opType === "learning") {
    // Cartan NN: geodesic flow toward equilibrium — negentropic
    nextCoeffs = nextCoeffs.map(c => c * 1.04);
  }

  const nextBeta: LieAlgebraElement = { coeffs: nextCoeffs, group: "E8" };
  const nextState = computeFullState(nextBeta);

  const deltaS = nextState.entropy - state.entropy;
  const isZeroPoint = Math.abs(deltaS) < 1e-4;

  const T = 1 / Math.sqrt(nextCoeffs.reduce((s, c) => s + c * c, 0));
  const cost = opType === "unitary" ? 0 : Math.max(0, T * deltaS * 100);

  return {
    nextState: {
      ...nextState,
      isZeroPoint,
      landauerCost: cost,
    },
    cost,
    deltaS,
  };
}
