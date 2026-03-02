/**
 * QSVG — Quantum Self-Verification Geometry: Foundational Constants
 * ══════════════════════════════════════════════════════════════════
 *
 * The three geometric invariants of QSVG, all derived from the {3,3,5}
 * tessellation of hyperbolic space H³. These are NOT free parameters —
 * they are geometric consequences of how regular tetrahedra tile H³.
 *
 * Source: Luis Morató de Dalmases, "QSVG: Physical Theory", March 2026.
 *
 * @module qsvg/constants
 */

// ── The Single Free Parameter ────────────────────────────────────────────────

/**
 * The fundamental angular defect δ₀ = 6.8° = 0.118682 rad.
 *
 * Origin: When 5 regular tetrahedra meet at an edge in hyperbolic space H³
 * (the {3,3,5} tessellation), the sum of dihedral angles falls short of 2π.
 * The deficit per face, via Thurston's holonomy formula, is exactly:
 *
 *   δ₀ = 3/5 × δ_edge ≈ 3/5 × 11.6° ≈ 6.96° → 6.8°
 *
 * This single value determines ALL physical constants in QSVG.
 */
export const DELTA_0_DEG = 6.8;
export const DELTA_0_RAD = 0.118682;

// ── Derived Geometric Invariants ─────────────────────────────────────────────

/**
 * Fractal dimension D = log(37)/log(8) = 1.9206.
 *
 * Origin: The Coxeter group [3,3,5] has a Poincaré series whose unique
 * real root > 1 is the growth rate / Hausdorff dimension of the group.
 * The polynomial α¹¹ - α¹⁰ - ... - α + 1 = 0 yields D ≈ 1.9206.
 *
 * Key relation to δ₀: D = 2 - δ₀·ln(1/δ₀) + O(δ₀²)
 * This proves D and δ₀ are NOT independent.
 */
export const FRACTAL_DIMENSION = 1.9206;

/**
 * The anomalous scaling dimension γ_T = 2 - D = 0.0794.
 * Governs how torsion fields scale with energy in the fractal lattice.
 */
export const ANOMALOUS_DIMENSION = 2 - FRACTAL_DIMENSION; // 0.0794

/**
 * CronNet scale M* = 1.22 × 10⁻³ eV.
 *
 * Origin: Matching the defect energy density to observed dark energy:
 *   ρ_DE = ½ M*⁴ δ₀² ≈ (2.3 × 10⁻³ eV)⁴
 *   M* = (2ρ_DE / δ₀²)^(1/4) = 1.22 × 10⁻³ eV
 *
 * Remarkably, this coincides with the fourth root of ρ_Λ.
 */
export const CRONNET_SCALE_EV = 1.22e-3;

/**
 * Fine-structure constant from QSVG: α⁻¹ = 360°/θ_H = 137.035999139.
 *
 * Origin: The Hopf angle θ_H of the fibration associated with [3,3,5].
 * The torsion angle per unit length is fixed by δ₀; the number of
 * torsion angles in a full circle yields α⁻¹.
 *
 * Agreement with CODATA 2022: |Δα⁻¹| = 4.0 × 10⁻⁷.
 */
export const ALPHA_INVERSE_QSVG = 137.035999139;
export const ALPHA_INVERSE_MEASURED = 137.035999084;
export const ALPHA_QSVG = 1 / ALPHA_INVERSE_QSVG;

/**
 * Instanton action S_E ≈ 280.
 * Yields dark energy density ρ_Λ ~ M_P⁴ e^{-S_E} ~ 10⁻⁴⁷ GeV⁴
 * matching observation without fine-tuning.
 */
export const INSTANTON_ACTION = 280;

// ── The Spectral Operator ────────────────────────────────────────────────────

/**
 * The CronNet-Holo operator:
 *   Ĥ_C = -i d/du + 2δ₀ cosh(u)
 *
 * Its spectral determinant connects to the Riemann zeta function:
 *   det(Ĥ_C - sI) = s(s-1)π^{-s/2} Γ(s/2) ζ(s)
 *
 * This means the zeros of ζ(s) ARE the eigenvalues of Ĥ_C,
 * and the Riemann Hypothesis becomes a statement about the
 * geometric rigidity of the fundamental tetrahedron T₀.
 */
export const SPECTRAL_FORMULA = "det(Ĥ_C - sI) = s(s-1)·π^(-s/2)·Γ(s/2)·ζ(s)";

/**
 * First Riemann zeros = eigenvalues of the CronNet-Holo operator.
 * These dimensionless numbers connect number theory to physics.
 */
export const RIEMANN_EIGENVALUES = [
  14.134725141734,
  21.022039638771,
  25.010857580145,
  30.424876125859,
  32.935061587739,
] as const;

// ── Experimental Predictions ─────────────────────────────────────────────────

export interface QSVGPrediction {
  experiment: string;
  observable: string;
  prediction: string;
  timeline: string;
  freeParameters: number;
}

export const QSVG_PREDICTIONS: QSVGPrediction[] = [
  {
    experiment: "MuSEUM (J-PARC)",
    observable: "Muonium hyperfine splitting",
    prediction: "Δν = 35.3 ± 3.5 Hz",
    timeline: "3-5 years",
    freeParameters: 0,
  },
  {
    experiment: "LiteBIRD",
    observable: "Cosmic birefringence",
    prediction: "β(ℓ) ∝ ℓ^0.9206",
    timeline: "2027-2030",
    freeParameters: 0,
  },
  {
    experiment: "LIGO/Virgo/KAGRA",
    observable: "Black hole spins",
    prediction: "χ = 0.068 ± 0.005",
    timeline: "2027-2029",
    freeParameters: 0,
  },
  {
    experiment: "Hyper-Kamiokande",
    observable: "Proton decay",
    prediction: "τ_p = 8.9 × 10³⁴ yr",
    timeline: "2027+",
    freeParameters: 0,
  },
];

// ── Proton Decay Branching Ratios ────────────────────────────────────────────

export const PROTON_DECAY_CHANNELS = [
  { channel: "p → e⁺π⁰", ratio: 0.42 },
  { channel: "p → μ⁺π⁰", ratio: 0.28 },
  { channel: "p → e⁺K⁰", ratio: 0.18 },
  { channel: "p → ν̄π⁺", ratio: 0.12 },
] as const;
